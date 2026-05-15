from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import date
from database import get_db
import schemas
import logging
from services.email_sender import send_email_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/{roll_no}", response_model=list[schemas.AlertSchema])
async def get_alerts(roll_no: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Alert).where(models.Alert.roll_no == roll_no).order_by(models.Alert.created_at.desc()).limit(20))
    alerts = res.scalars().all()
    return alerts

@router.post("/notify-parent/{roll_no}")
async def notify_parent_low_attendance(roll_no: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Student).where(models.Student.roll_no == roll_no))
    student = res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Realistically, this would check logic. But for demo, we trigger directly.
    message = f"Dear Parent, your ward {student.name} ({roll_no}) is falling below the mandatory 75% attendance. Please ensure they attend classes regularly."
    
    alert = models.Alert(
        roll_no=roll_no,
        type="low_attendance",
        title="Low Attendance Warning",
        message=message
    )
    db.add(alert)
    await db.commit()
    # Send actual email to parent
    await send_email_alert(
        to_email=student.parent_email,
        subject="Low Attendance Warning",
        message=message
    )
    
    # Send email to student
    student_message = f"Dear {student.name}, your attendance is falling below the mandatory 75% for {roll_no}. Please attend classes regularly to avoid penalties."
    await send_email_alert(
        to_email=student.student_email,
        subject="Low Attendance Warning",
        message=student_message
    )
    
    return {"status": "success", "message": "Notification sent to parent and student."}

@router.post("/finalize-daily-attendance/{subject_id}")
async def finalize_daily_attendance(subject_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Subject).where(models.Subject.id == subject_id))
    subject = res.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    today = date.today()
    
    # Get all students
    res_st = await db.execute(select(models.Student))
    all_students = res_st.scalars().all()
    
    # Get students marked present today for this subject
    res_att = await db.execute(
        select(models.Attendance).where(
            models.Attendance.subject_id == subject_id,
            models.Attendance.date == today,
            models.Attendance.status == 'present'
        )
    )
    present_records = res_att.scalars().all()
    
    present_roll_nos = {r.roll_no for r in present_records}
    
    absent_students = []
    
    for st in all_students:
        if st.roll_no not in present_roll_nos:
            # Mark absent
            # Check if record already exists to avoid unique constraint failure
            res_ex = await db.execute(
                select(models.Attendance).where(
                    models.Attendance.subject_id == subject_id,
                    models.Attendance.date == today,
                    models.Attendance.roll_no == st.roll_no
                )
            )
            existing = res_ex.scalars().first()
            
            if not existing:
                absent_record = models.Attendance(
                    roll_no=st.roll_no,
                    subject_id=subject_id,
                    date=today,
                    period=1,
                    status='absent',
                    confidence=0.0,
                    camera_source='system_batch'
                )
                db.add(absent_record)
                
                # Create Alert
                message = f"Dear Parent, your ward {st.name} ({st.roll_no}) was marked ABSENT for {subject.name} on {today.strftime('%d %b %Y')}."
                alert = models.Alert(
                    roll_no=st.roll_no,
                    type="absence",
                    title="Absence Notice",
                    message=message
                )
                db.add(alert)
                absent_students.append(st)
                # Send actual email to parent
                await send_email_alert(
                    to_email=st.parent_email,
                    subject="Absence Notice",
                    message=message
                )
                
                # Send email to student
                student_message = f"Dear {st.name}, you have been marked ABSENT for {subject.name} on {today.strftime('%d %b %Y')}."
                await send_email_alert(
                    to_email=st.student_email,
                    subject="Absence Notice",
                    message=student_message
                )

    await db.commit()
    
    return {"status": "success", "absent_count": len(absent_students), "message": f"Finalized attendance. Sent {len(absent_students)} absence alerts to parents."}
