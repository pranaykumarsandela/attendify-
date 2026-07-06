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
            hod = HOD(name="Shyamala", email="shyamala@gmail.com", password_hash=get_password_hash("1"), department="CSE")
            db.add(hod)
            await db.commit()
            logger.info("Default HOD seeded successfully.")

        await db.commit()
