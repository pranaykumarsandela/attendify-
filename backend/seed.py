import asyncio
from sqlalchemy.future import select
from database import AsyncSessionLocal
from models import HOD, Subject, Attendance
from routers.auth import get_password_hash
import logging

logger = logging.getLogger(__name__)

async def seed_db():
    async with AsyncSessionLocal() as db:
        # Seed default HOD if not exists
        result = await db.execute(select(HOD).limit(1))
        if not result.scalars().first():
            logger.info("Seeding database with default HOD...")
            hod = HOD(name="Dr. Venkat Rao", email="venkat@college.edu", password_hash=get_password_hash("demo123"), department="CSE")
            db.add(hod)
            await db.commit()
            logger.info("Default HOD seeded successfully.")

        # Clean old hardcoded subjects from the database to enforce dynamic subjects
        from sqlalchemy import delete
        for sub_name in ["Deep Learning", "Distributed Systems", "Human Computer Interaction", "Computer Networks", "Compiler Design", "Data Structures"]:
            sub_res = await db.execute(select(Subject).where(Subject.name.ilike(sub_name)))
            sub_obj = sub_res.scalars().first()
            if sub_obj:
                logger.info(f"Removing hardcoded subject: {sub_name}")
                await db.execute(delete(Attendance).where(Attendance.subject_id == sub_obj.id))
                await db.execute(delete(Subject).where(Subject.id == sub_obj.id))
        await db.commit()
