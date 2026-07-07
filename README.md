# 📷 Attendify — Face Recognition Attendance System

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
</div>

<p align="center">
  <strong>An intelligent, seamless, and automated attendance tracking system powered by real-time Facial Recognition.</strong>
</p>

---

## 🌟 Features

- **Real-Time Facial Recognition**: Utilizes deep learning and FAISS indexing for lightning-fast and highly accurate face identification.
- **Two-Step Verification**: Automates the classroom lifecycle by tracking the time a student enters and checking the elapsed time before marking them `Present`.
- **Intelligent Alerts**: Automatically triggers customized warning emails to students and their parents if they fall below attendance thresholds or are marked absent.
- **Smart Faculty Dashboard**: A beautifully designed React & Tailwind CSS interface offering live video feeds, real-time live rolls, and analytics.
- **Zero-Downtime Deployment**: Backend powered by a high-performance ASGI architecture on HuggingFace and frontend edge-deployed on Vercel.

---

## 🚀 Quick Start Guide

> [!NOTE]
> If you're looking to run this project locally, ensure you have Python 3.11+, Node.js, and Docker installed.

### 1. Environment Setup
Clone the repository and set up your environment variables:
```bash
git clone https://github.com/pranaykumarsandela/attendify-.git
cd attendify-
cp .env.example .env
```
Generate a secure key for your `.env` file:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Infrastructure Setup (Docker)
Start the required PostgreSQL and Redis services:
```bash
docker compose up -d postgres redis
```

### 3. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux (Use venv\Scripts\activate on Windows)
pip install -r requirements.txt

# Run migrations and seed the database
alembic upgrade head
python seed.py
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 💻 Daily Development Workflow

Run these commands simultaneously in separate terminal windows:

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 --log-level info
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser. 
**Demo Credentials:**
- **Teacher:** `priya@college.edu` / `Demo@1234`
- **HOD:** `venkat@college.edu` / `Demo@1234`
- **Student:** `21CS001@college.edu` / `Demo@1234`

---

## ⚙️ Face Registration Process

> [!IMPORTANT]
> You must register a student's face before the AI can recognize them.

1. Login to the application as the **HOD**.
2. Navigate to the **Register Student** panel.
3. Enter the student's Roll Number (e.g., `21CS001`).
4. Click **Start Camera** and grant browser permissions.
5. Click **Capture** 5 times while having the student slightly move their head to ensure the neural network captures 3D depth geometry.
6. Click **Register** to generate their embeddings in the database.

---

## 🛠 Testing Live Attendance

1. Login as a **Teacher** and select a subject (e.g., *Computer Networks*).
2. Click **Start Camera**.
3. Stand in front of the webcam.
4. The system will process your face frame-by-frame:
   - ⏳ **Waiting Outgoing... (Yellow)**: First scan completed.
   - ✅ **Present (Completed) (Green)**: Second scan completed (simulating end of class).
5. When the faculty clicks **End & Alert**, any student who didn't complete the full cycle will automatically receive a customized email regarding their absence or partial completion!

---

## 🧑‍💻 Useful Commands & Troubleshooting

### Database Queries
Connect to PostgreSQL: `psql -h localhost -U fras_user fras`
```sql
-- Today's attendance count
SELECT COUNT(*) FROM attendance WHERE date=CURRENT_DATE;

-- Check all registered students
SELECT roll_no, name, face_registered, faiss_index FROM students;
```

### Camera Issues (RTSP Integration)
To use a physical RTSP IP Camera instead of a web camera, modify your `.env`:
```env
USE_RTSP=true
RTSP_URL=rtsp://admin:pass@192.168.1.64:554/stream1
```

### Resetting AI Embeddings
If your FAISS index becomes corrupted during testing, reset it via the backend:
```bash
rm backend/app/data/embeddings/index.faiss
rm backend/app/data/embeddings/index.json
```
*(You will need to manually delete the entries in the `face_embeddings` table and re-register students).*

---
<div align="center">
Built with ❤️ for modern education.
</div>
