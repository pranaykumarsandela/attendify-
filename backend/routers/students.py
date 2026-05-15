from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from datetime import date
from database import get_db
from models import Student, Attendance, Subject

router = APIRouter()

@router.get("/api/students/{roll_no}")
async def get_student(roll_no: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.roll_no == roll_no))
    student = result.scalars().first()
    if not student:
        raise HTTPException(404, "Student not found")
    return {
        "roll_no": student.roll_no,
        "name": student.name,
        "semester": student.semester,
        "section": student.section,
        "face_registered": student.face_registered
    }

@router.get("/api/students/{roll_no}/attendance")
async def get_student_attendance(roll_no: str, db: AsyncSession = Depends(get_db)):
    # Returns all subject attendance with %
    # Query all subjects
    subjects_result = await db.execute(select(Subject))
    subjects = subjects_result.scalars().all()
    
    # Query attendance for this student
    att_result = await db.execute(select(Attendance).where(Attendance.roll_no == roll_no))
    attendances = att_result.scalars().all()
    
    summary = []
    for sub in subjects:
        sub_atts = [a for a in attendances if a.subject_id == sub.id]
        present = len([a for a in sub_atts if a.status == 'present'])
        total = sub.total_classes
        percent = (present / total * 100) if total > 0 else 0
        summary.append({
            "subject_id": sub.id,
            "subject_name": sub.name,
            "code": sub.code,
            "present": present,
            "total": total,
            "percentage": round(percent, 2),
            "status": "Green" if percent >= 75 else ("Amber" if percent >= 60 else "Red")
        })
    
    return summary

@router.get("/api/students/{roll_no}/attendance/calendar")
async def get_student_calendar(roll_no: str, month: str = Query(None), db: AsyncSession = Depends(get_db)):
    # Expected month format: YYYY-MM
    att_result = await db.execute(select(Attendance).where(Attendance.roll_no == roll_no))
    attendances = att_result.scalars().all()
    
    calendar = {}
    for a in attendances:
        d_str = a.date.isoformat()
        if month and not d_str.startswith(month):
            continue
        if d_str not in calendar:
            calendar[d_str] = []
        calendar[d_str].append({"period": a.period, "status": a.status, "subject_id": a.subject_id})
        
    # Aggregate daily status: if any absent, day is absent/partial
    daily_status = {}
    for d, records in calendar.items():
        if any(r['status'] == 'absent' for r in records):
            daily_status[d] = 'absent'
        else:
            daily_status[d] = 'present'
            
    return daily_status

# HOD Endpoints
@router.get("/api/hod/department/overview")
async def get_dept_overview(db: AsyncSession = Depends(get_db)):
    from models import Faculty
    res_st = await db.execute(select(Student))
    students = res_st.scalars().all()
    
    res_fac = await db.execute(select(Faculty))
    faculties = res_fac.scalars().all()

    return {
        "total_students": len(students),
        "total_faculty": len(faculties),
        "at_risk_count": 0,
        "recent_students": [{"name": s.name, "roll_no": s.roll_no} for s in students[-5:]] if students else [],
        "recent_faculty": [{"name": f.name, "email": f.email} for f in faculties[-5:]] if faculties else [],
    }

@router.get("/api/hod/students/search")
async def search_students(q: str = "", semester: int = None, section: str = None, db: AsyncSession = Depends(get_db)):
    query = select(Student)
    if q:
        query = query.where(Student.name.ilike(f"%{q}%") | Student.roll_no.ilike(f"%{q}%"))
    if semester:
        query = query.where(Student.semester == semester)
    if section:
        query = query.where(Student.section == section)
        
    result = await db.execute(query)
    students = result.scalars().all()
    
    # Calculate overall attendance mock for demo speed
    res = []
    for s in students:
        res.append({
            "roll_no": s.roll_no,
            "name": s.name,
            "semester": s.semester,
            "section": s.section,
            "overall_attendance": 80.0 # Mocked for speed
        })
    return res

@router.get("/api/hod/student/{roll_no}/full-report")
async def get_full_report(roll_no: str, db: AsyncSession = Depends(get_db)):
    student_res = await db.execute(select(Student).where(Student.roll_no == roll_no))
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    attendance_summary = await get_student_attendance(roll_no, db)
    return {
        "student": {
            "roll_no": student.roll_no,
            "name": student.name,
            "semester": student.semester,
            "section": student.section,
            "parent_email": student.parent_email
        },
        "attendance": attendance_summary
    }
