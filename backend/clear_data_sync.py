import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("DELETE FROM attendance;")
    cur.execute("DELETE FROM alerts;")
    cur.execute("UPDATE subjects SET total_classes = 0, faculty_name = NULL;")
    conn.commit()
    print("Database wiped successfully!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
