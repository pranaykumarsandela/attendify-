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
    # Query student to get their semester
    student_res = await db.execute(select(Student).where(Student.roll_no == roll_no))
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Returns all subject attendance with % for this student's semester
    subjects_result = await db.execute(select(Subject).where(Subject.semester == student.semester))
    subjects = subjects_result.scalars().all()
    
    # Query attendance for this student
    att_result = await db.execute(select(Attendance).where(Attendance.roll_no == roll_no))
    attendances = att_result.scalars().all()
    
    # Include subjects that the student attended but are not in their default semester
    attended_subject_ids = {a.subject_id for a in attendances}
    base_subject_ids = {s.id for s in subjects}
    missing_subject_ids = attended_subject_ids - base_subject_ids
    
    extra_subjects = []
    if missing_subject_ids:
        extra_res = await db.execute(select(Subject).where(Subject.id.in_(missing_subject_ids)))
        extra_subjects = extra_res.scalars().all()
        
    all_subjects = list(subjects) + extra_subjects
    
    summary = []
    for sub in all_subjects:
        sub_atts = [a for a in attendances if a.subject_id == sub.id]
        present = len([a for a in sub_atts if a.status == 'present'])
        total = max(sub.total_classes, present)
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
    res_st = await db.execute(select(Student).order_by(Student.created_at.desc()).limit(3))
    students = res_st.scalars().all()
    
    res_fac = await db.execute(select(Faculty).order_by(Faculty.id.desc()).limit(3))
    faculties = res_fac.scalars().all()

    # Get total counts
    total_st = await db.execute(select(func.count(Student.roll_no)))
    total_fac = await db.execute(select(func.count(Faculty.id)))

    return {
        "total_students": total_st.scalar() or 0,
        "total_faculty": total_fac.scalar() or 0,
        "at_risk_count": 0,
        "recent_students": [{"name": s.name, "roll_no": s.roll_no} for s in students],
        "recent_faculty": [{"name": f.name, "email": f.email} for f in faculties],
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
    
    res = []
    
    # Calculate real overall attendance
    for s in students:
        # Get total classes for this student's semester/branch
        sub_query = select(func.sum(Subject.total_classes)).where(
            Subject.semester == s.semester
        )
        total_classes_res = await db.execute(sub_query)
        total_classes = total_classes_res.scalar() or 0
        
        # Get total present for this student
        att_query = select(func.count(Attendance.id)).where(
            Attendance.roll_no == s.roll_no,
            Attendance.status == 'present'
        )
        total_present_res = await db.execute(att_query)
        total_present = total_present_res.scalar() or 0
        
        overall = 0.0
        if total_classes > 0:
            overall = round((total_present / total_classes) * 100, 1)
            
        res.append({
            "roll_no": s.roll_no,
            "name": s.name,
            "semester": s.semester,
            "section": s.section,
            "overall_attendance": overall
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
