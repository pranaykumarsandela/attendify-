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
        if result.scalars().first():
            logger.info("Database already seeded with HOD.")
            return

        logger.info("Seeding database with default HOD...")
        hod = HOD(name="Dr. Venkat Rao", email="venkat@college.edu", password_hash=get_password_hash("demo123"), department="CSE")
        db.add(hod)
        await db.commit()
        logger.info("Default HOD seeded successfully.")

