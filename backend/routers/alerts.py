from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import date
from database import get_db
import schemas
import models
import logging
from services.email_sender import send_email_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/{roll_no}", response_model=list[schemas.AlertSchema])
async def get_alerts(roll_no: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Alert).where(models.Alert.roll_no == roll_no).order_by(models.Alert.created_at.desc()).limit(20))
    alerts = res.scalars().all()
    return alerts

@router.post("/bulk-low-attendance")
async def bulk_low_attendance_alert(db: AsyncSession = Depends(get_db)):
    # Fetch all students
    res = await db.execute(select(models.Student))
    students = res.scalars().all()
    
    # Fetch all subjects to calculate total classes per semester
    sub_res = await db.execute(select(models.Subject))
    subjects = sub_res.scalars().all()
    
    # Fetch all attendances
    att_res = await db.execute(select(models.Attendance))
    all_attendances = att_res.scalars().all()
    
    target_emails = []
    emails_sent = 0
    
    for student in students:
        # Calculate overall attendance
        student_subjects = [s for s in subjects if s.semester == student.semester]
        student_atts = [a for a in all_attendances if a.roll_no == student.roll_no and a.status == 'present']
        
        total_possible = sum([max(s.total_classes, len([a for a in student_atts if a.subject_id == s.id])) for s in student_subjects])
        if total_possible == 0:
            continue
            
        present_count = len(student_atts)
        
        overall_percent = (present_count / total_possible) * 100
        
        if overall_percent < 75.0:
            message = f"Your child {student.name} ({student.roll_no}) has an overall attendance of {overall_percent:.1f}%, which is below the required 75%. Please ensure regular attendance."
            student_msg = f"Dear {student.name}, your overall attendance is {overall_percent:.1f}%, which is below the required 75%. Please ensure regular attendance."
            
            # Save alert
            alert = models.Alert(
                roll_no=student.roll_no,
                type="low_attendance",
                title="Low Attendance Warning (<75%)",
                message=message
            )
            db.add(alert)
            
            if student.parent_email:
                target_emails.append({
                    "to": student.parent_email,
                    "subject": "Low Attendance Warning",
                    "message": message
                })
                emails_sent += 1
            if student.student_email:
                target_emails.append({
                    "to": student.student_email,
                    "subject": "Low Attendance Warning",
                    "message": student_msg
                })
                emails_sent += 1
                
    await db.commit()
    return {"status": "success", "message": f"Generated {emails_sent} alerts for students with <75% attendance.", "emails_to_send": target_emails}

@router.post("/notify-parent/{roll_no}")
async def notify_parent_low_attendance(roll_no: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Student).where(models.Student.roll_no == roll_no))
    student = res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    message = f"Your student {student.name} with roll no {roll_no} has attendance less than 75%."
    student_message = f"Dear student {student.name}, your attendance with roll no {roll_no} is less than 75%."
    
    alert = models.Alert(
        roll_no=roll_no,
        type="low_attendance",
        title="Low Attendance Warning",
        message=message
    )
    db.add(alert)
    await db.commit()
    
    target_emails = []
    if student.parent_email:
        target_emails.append({
            "to": student.parent_email,
            "subject": "Low Attendance Warning",
            "message": message
        })
    if student.student_email:
        target_emails.append({
            "to": student.student_email,
            "subject": "Low Attendance Warning",
            "message": student_message
        })
    
    return {"status": "success", "message": "Notification payload generated.", "emails_to_send": target_emails}

@router.post("/finalize-daily-attendance/{subject_id}")
async def finalize_daily_attendance(subject_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Subject).where(models.Subject.id == subject_id))
    subject = res.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.total_classes += 1

    today = date.today()
    current_period = subject.total_classes
    
    # Get all students for the subject's semester
    res_st = await db.execute(select(models.Student).where(models.Student.semester == subject.semester))
    all_students = res_st.scalars().all()
    
    # Get students marked present today for this subject and period
    res_att = await db.execute(
        select(models.Attendance).where(
            models.Attendance.subject_id == subject_id,
            models.Attendance.date == today,
            models.Attendance.period == current_period,
            models.Attendance.status == 'present'
        )
    )
    present_records = res_att.scalars().all()
    
    present_roll_nos = {r.roll_no for r in present_records}
    
    absent_students = []
    target_emails = []
    
    for st in all_students:
        if st.roll_no not in present_roll_nos:
            # Mark absent
            # Check if record already exists to avoid unique constraint failure
            res_ex = await db.execute(
                select(models.Attendance).where(
                    models.Attendance.subject_id == subject_id,
                    models.Attendance.date == today,
                    models.Attendance.period == current_period,
                    models.Attendance.roll_no == st.roll_no
                )
            )
            existing = res_ex.scalars().first()
            
            if not existing:
                absent_record = models.Attendance(
                    roll_no=st.roll_no,
                    subject_id=subject_id,
                    date=today,
                    period=current_period,
                    status='absent',
                    confidence=0.0,
                    camera_source='system_batch'
                )
                db.add(absent_record)
                
                # Create Alert
                message = f"your student {st.name} bearing {st.roll_no} is absent for {subject.name}"
                alert = models.Alert(
                    roll_no=st.roll_no,
                    type="absence",
                    title="Absence Notice",
                    message=message
                )
                db.add(alert)
                absent_students.append(st)
                
                if st.parent_email:
                    target_emails.append({
                        "to": st.parent_email,
                        "subject": "Absence Notice",
                        "message": message
                    })
                
                if st.student_email:
                    student_message = f"dear student your attendance for the {subject.name} is marked as absent"
                    target_emails.append({
                        "to": st.student_email,
                        "subject": "Absence Notice",
                        "message": student_message
                    })

    await db.commit()
    
    return {"status": "success", "absent_count": len(absent_students), "message": f"Finalized attendance. Processing {len(target_emails)} alerts.", "emails_to_send": target_emails}

from pydantic import BaseModel

class CustomAlertReq(BaseModel):
    title: str
    message: str
    recipient: str # 'all', or specific 'roll_no'
    recipient_type: str # 'student', 'parent', 'both'

@router.post("/custom")
async def send_custom_alert(req: CustomAlertReq, db: AsyncSession = Depends(get_db)):
    if req.recipient == 'all':
        res_st = await db.execute(select(models.Student))
        targets = res_st.scalars().all()
    else:
        res_st = await db.execute(select(models.Student).where(models.Student.roll_no == req.recipient))
        student = res_st.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        targets = [student]

    target_emails = []
    emails_sent = 0
    for st in targets:
        # Save alert in DB (always associated with student's roll_no)
        alert = models.Alert(
            roll_no=st.roll_no,
            type="custom",
            title=req.title,
            message=req.message
        )
        db.add(alert)
        
        # Collect Emails to send via frontend
        if req.recipient_type in ['parent', 'both'] and st.parent_email:
            target_emails.append(st.parent_email)
            emails_sent += 1
            
        if req.recipient_type in ['student', 'both'] and st.student_email:
            target_emails.append(st.student_email)
            emails_sent += 1

    await db.commit()
    return {"status": "success", "message": f"Custom alert saved. Processing {emails_sent} emails.", "emails_to_send": target_emails}
