from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from datetime import date, datetime
import cv2
import numpy as np
import os
from database import get_db
from models import Attendance, Subject, Student
from schemas import MarkAttendanceRequest
from services.face_engine import face_engine
from services.recognizer import embedding_store
from services.notifier import manager

router = APIRouter()

@router.post("/api/attendance/mark")
async def mark_attendance(req: MarkAttendanceRequest, db: AsyncSession = Depends(get_db)):
    # Check if already marked today for this period
    query = select(Attendance).where(
        Attendance.roll_no == req.roll_no,
        Attendance.subject_id == req.subject_id,
        Attendance.date == date.today(),
        Attendance.period == req.period
    )
    res = await db.execute(query)
    existing = res.scalars().first()
    
    if existing:
        # Update the timestamp so the user sees the latest recognition time
        existing.marked_at = datetime.now()
        await db.commit()
        
        # Always broadcast anyway to ensure UI stays in sync if it missed it
        student_res = await db.execute(select(Student).where(Student.roll_no == req.roll_no))
        student = student_res.scalars().first()
        student_name = student.name if student else "Unknown Student"
        
        await manager.broadcast({
            "type": "marked",
            "roll_no": req.roll_no,
            "name": student_name,
            "subject_id": req.subject_id,
            "timestamp": existing.marked_at.isoformat(),
            "status": existing.status
        })
        return {"message": "Already marked (updated time)", "status": existing.status}
        
    new_att = Attendance(
        roll_no=req.roll_no,
        subject_id=req.subject_id,
        date=date.today(),
        period=req.period,
        status='present',
        confidence=req.confidence,
        marked_at=datetime.now()
    )
    db.add(new_att)
    try:
        await db.commit()
        # Fetch student name for broadcast
        student_res = await db.execute(select(Student).where(Student.roll_no == req.roll_no))
        student = student_res.scalars().first()
        student_name = student.name if student else "Unknown Student"
        
        # Broadcast the new mark to all clients
        await manager.broadcast({
            "type": "marked",
            "roll_no": req.roll_no,
            "name": student_name,
            "subject_id": req.subject_id,
            "timestamp": new_att.marked_at.isoformat(),
            "status": "present"
        })
    except IntegrityError:
        await db.rollback()
        return {"message": "Already marked (concurrent)"}
        
    return {"message": "Success", "id": new_att.id}

