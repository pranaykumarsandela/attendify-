from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date
from database import get_db
from models import Attendance, Subject, Student

router = APIRouter()

@router.get("/api/subjects/{subject_id}/attendance")
async def get_subject_attendance(subject_id: int, d: str = Query(None, alias="date"), semester: int = Query(None), db: AsyncSession = Depends(get_db)):
    query = select(Attendance, Student).join(Student, Attendance.roll_no == Student.roll_no).where(Attendance.subject_id == subject_id)
    
    if d == 'today':
        query = query.where(Attendance.date == date.today())
        
    result = await db.execute(query)
    records = result.all()
    
    res = []
    for att, student in records:
        res.append({
            "id": att.id,
            "roll_no": student.roll_no,
            "name": student.name,
            "status": att.status,
            "confidence": att.confidence,
            "marked_at": att.marked_at,
            "camera_source": att.camera_source,
            "period": att.period
        })
    return res

@router.get("/api/teacher/at-risk")
async def get_at_risk_students(subject_id: int, db: AsyncSession = Depends(get_db)):
    # Students below 75%
    sub_res = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = sub_res.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    att_res = await db.execute(select(Attendance).where(Attendance.subject_id == subject_id))
    attendances = att_res.scalars().all()
    
    students_res = await db.execute(select(Student))
    students = {s.roll_no: s for s in students_res.scalars().all()}
    
    # Calculate per student
    student_stats = {}
    for a in attendances:
        if a.roll_no not in student_stats:
            student_stats[a.roll_no] = 0
        if a.status == 'present':
            student_stats[a.roll_no] += 1
            
    at_risk = []
    for roll_no, present_count in student_stats.items():
        total = subject.total_classes
        if total == 0: continue
        percent = present_count / total
        if percent < 0.75:
            # Formula: classes_needed = ceil((0.75*(total+x) - present) / 0.25)
            import math
            classes_needed = math.ceil((0.75 * total - present_count) / 0.25)
            # if total + x classes are held, they must attend all x.
            # 0.75 * (total + x) = present + x
            # 0.75 * total + 0.75x = present + x
            # 0.25x = 0.75 * total - present
            # x = (0.75 * total - present) / 0.25
            
            classes_needed = max(0, classes_needed)
            
            s = students.get(roll_no)
            if s:
                at_risk.append({
                    "roll_no": s.roll_no,
                    "name": s.name,
                    "percentage": round(percent * 100, 2),
                    "classes_needed": classes_needed
                })
                
    return at_risk
