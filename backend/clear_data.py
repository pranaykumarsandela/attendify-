import asyncio
from database import engine, AsyncSessionLocal
from sqlalchemy import text
from models import Base, Subject, Attendance, Alert

async def clear_data():
    async with AsyncSessionLocal() as session:
        # Clear attendance
        await session.execute(text("DELETE FROM attendance"))
        # Clear alerts
        await session.execute(text("DELETE FROM alerts"))
        # Reset classes and remove faculty from subjects
        await session.execute(text("UPDATE subjects SET total_classes = 0, faculty_name = NULL"))
        await session.commit()
        print("Successfully cleared attendance, alerts, and reset subjects.")

if __name__ == "__main__":
    asyncio.run(clear_data())
