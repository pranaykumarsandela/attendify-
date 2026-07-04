import asyncio
import random
from datetime import date, timedelta, datetime
from sqlalchemy.future import select
from database import AsyncSessionLocal
from models import Student, Subject, Faculty, HOD, Attendance
from routers.auth import get_password_hash
import logging

logger = logging.getLogger(__name__)

async def seed_db():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(HOD).limit(1))
        if not result.scalars().first():
            logger.info("Seeding database with default HOD...")
            hod = HOD(name="Dr. Venkat Rao", email="venkat@college.edu", password_hash=get_password_hash("demo123"), department="CSE")
            db.add(hod)
            await db.commit()
            logger.info("Default HOD seeded successfully.")

        # Clean Data Structures
        from sqlalchemy import delete
        ds_res = await db.execute(select(Subject).where(Subject.name.ilike("Data Structures")))
        ds_subject = ds_res.scalars().first()
        if ds_subject:
            logger.info("Removing Data Structures subject and its attendance records...")
            await db.execute(delete(Attendance).where(Attendance.subject_id == ds_subject.id))
            await db.execute(delete(Subject).where(Subject.id == ds_subject.id))
            await db.commit()
            logger.info("Data Structures subject removed successfully.")

        # Seed New Subjects
        new_subjects = [
            {"name": "Deep Learning", "code": "CS501", "faculty_name": "Dr. Anand", "semester": 5, "total_classes": 30},
            {"name": "Distributed Systems", "code": "CS502", "faculty_name": "Dr. Anand", "semester": 5, "total_classes": 30},
            {"name": "Human Computer Interaction", "code": "CS503", "faculty_name": "Dr. Anand", "semester": 5, "total_classes": 30},
            {"name": "Computer Networks", "code": "CS504", "faculty_name": "Dr. Anand", "semester": 5, "total_classes": 30},
            {"name": "Compiler Design", "code": "CS505", "faculty_name": "Dr. Anand", "semester": 5, "total_classes": 30},
        ]

        for sub_data in new_subjects:
            sub_res = await db.execute(select(Subject).where(Subject.name.ilike(sub_data["name"])))
            existing_sub = sub_res.scalars().first()
            if not existing_sub:
                logger.info(f"Seeding subject: {sub_data['name']}")
                new_sub = Subject(
                    name=sub_data["name"],
                    code=sub_data["code"],
                    faculty_name=sub_data["faculty_name"],
                    semester=sub_data["semester"],
                    total_classes=sub_data["total_classes"]
                )
                db.add(new_sub)
        await db.commit()


