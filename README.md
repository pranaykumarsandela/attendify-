# FRAS Demo — Face Recognition Attendance System

## Complete Command Reference

══════════════════════════════════════════════════════════════
FIRST-TIME SETUP (run once)
══════════════════════════════════════════════════════════════

# 1. Clone / unzip project
git clone https://github.com/yourname/fras.git
cd fras

# 2. Create environment file
cp .env.example .env
# Edit .env: fill in DB_PASSWORD, REDIS_PASSWORD, SECRET_KEY
nano .env

# 3. Generate a strong SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"
# Copy output into .env SECRET_KEY=

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Wait for postgres to be healthy
docker compose ps  # check status column

# 5. Install backend dependencies
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# 6. Run database migrations
alembic upgrade head
# Expected: "Running upgrade -> 001_initial_schema, OK"

# 7. Seed demo data
python seed.py
# Expected: "Seeded: 20 students, 6 subjects, ~3600 attendance records"

# 8. Install frontend dependencies
cd ../frontend
npm install

══════════════════════════════════════════════════════════════
DAILY DEVELOPMENT (run these every session)
══════════════════════════════════════════════════════════════

# Terminal 1 — Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 --log-level info

# Terminal 2 — Start frontend
cd frontend
npm run dev

# Open in browser
open http://localhost:5173

# Demo login credentials
# Teacher: priya@college.edu / Demo@1234
# HOD:     venkat@college.edu / Demo@1234
# Student: 21CS001@college.edu / Demo@1234

══════════════════════════════════════════════════════════════
FACE REGISTRATION (do this before testing camera)
══════════════════════════════════════════════════════════════

# Option A: Via UI (recommended)
# 1. Login as HOD (venkat@college.edu / Demo@1234)
# 2. Navigate to /hod → Register Student
# 3. Enter roll number: 21CS001
# 4. Click "Start Camera" — allow camera permission
# 5. Click "Capture" 5 times (move face slightly each time)
# 6. Click "Register" — wait for success message

# Option B: Via API (testing)
curl -X POST http://localhost:8000/api/register/face \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -F "roll_no=21CS001" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "files=@photo3.jpg" \
  -F "files=@photo4.jpg" \
  -F "files=@photo5.jpg"

# Verify registration
curl http://localhost:8000/api/auth/me -b "token=..."
# Then check:
psql -h localhost -U fras_user fras \
  -c "SELECT roll_no, face_registered, faiss_index FROM students WHERE roll_no='21CS001';"

══════════════════════════════════════════════════════════════
TESTING LIVE ATTENDANCE
══════════════════════════════════════════════════════════════

# 1. Login as Teacher
open http://localhost:5173/teacher

# 2. Select subject from dropdown (e.g. "Computer Networks")
# 3. Select period (e.g. 1)
# 4. Click "Start Recording"
# 5. Stand in front of webcam
# 6. Watch for:
#    - Yellow box: face detected, confirming identity (1-8 frames)
#    - Green box + name: confirmed, attendance marking
#    - Live ticker below camera: "✓ Arjun Kumar — 94%"

# Verify in database (real-time):
psql -h localhost -U fras_user fras \
  -c "SELECT s.roll_no, s.name, a.marked_at, a.confidence FROM attendance a JOIN students s ON s.id=a.student_id WHERE a.date=CURRENT_DATE ORDER BY a.marked_at DESC LIMIT 5;"

# Check student dashboard updated:
open http://localhost:5173  # login as the student you just marked

══════════════════════════════════════════════════════════════
DATABASE MANAGEMENT
══════════════════════════════════════════════════════════════

# Connect to PostgreSQL
psql -h localhost -U fras_user fras

# Useful queries:
# Today's attendance count
SELECT COUNT(*) FROM attendance WHERE date=CURRENT_DATE;

# Students below 75% in any subject
SELECT * FROM student_attendance_summary WHERE percentage < 75;

# Check all registered students
SELECT roll_no, name, face_registered, faiss_index FROM students;

# Department overview
SELECT semester, ROUND(AVG(percentage),1) as avg_pct,
  COUNT(*) FILTER (WHERE percentage < 75) as at_risk
FROM student_attendance_summary GROUP BY semester;

# Reset today's attendance (for re-testing)
DELETE FROM attendance WHERE date=CURRENT_DATE;

# Reset all attendance (full reset)
TRUNCATE attendance;

# Check Redis sessions
docker exec fras-redis-1 redis-cli -a YOUR_REDIS_PASS KEYS "session:*"
docker exec fras-redis-1 redis-cli -a YOUR_REDIS_PASS KEYS "marked:*"

══════════════════════════════════════════════════════════════
RTSP CAMERA TESTING
══════════════════════════════════════════════════════════════

# Test RTSP URL works before adding to .env
ffplay -rtsp_transport tcp "rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101"

# Switch from webcam to RTSP
nano .env
# Change: USE_RTSP=true
# Change: RTSP_URL=rtsp://admin:pass@192.168.1.64:554/stream1
# Restart backend: Ctrl+C then uvicorn app.main:app --reload --port 8000

# Find camera IP on local network
nmap -sn 192.168.1.0/24 | grep -E "report for|MAC"

# Test with OpenCV directly
python3 -c "
import cv2
cap = cv2.VideoCapture('rtsp://admin:pass@IP:554/stream1', cv2.CAP_FFMPEG)
ret, frame = cap.read()
print('Connected:', ret, 'Shape:', frame.shape if ret else 'N/A')
cap.release()
"

══════════════════════════════════════════════════════════════
TROUBLESHOOTING COMMANDS
══════════════════════════════════════════════════════════════

# Check all services running
docker compose ps

# View backend logs (live)
# uvicorn shows logs in terminal — look for:
#   "FRAS starting — FAISS index: N students"
#   "Pipeline started for subject: X period: Y"
#   "Marked attendance: ROLL_NO score: 0.87"

# Check WebSocket connection
# Open browser DevTools → Network → WS tab
# Should see /ws/stream with "101 Switching Protocols"
# Messages should stream continuously

# Verify no localStorage
# Browser DevTools → Application → Local Storage → localhost:5173
# Must be completely EMPTY

# Check cookie is set correctly
# Browser DevTools → Application → Cookies → localhost:5173
# Should see: Name=token, HttpOnly=checked, SameSite=Lax

# Backend health check
curl http://localhost:8000/health
# Expected: {"status":"ok","pipeline":false,"faiss_total":0,"connected_ws":0}

# Reset FAISS index completely (if corrupted)
rm backend/app/data/embeddings/index.faiss
rm backend/app/data/embeddings/index.json
# Then run via psql:
# UPDATE students SET face_registered=FALSE, faiss_index=NULL;
# DELETE FROM face_embeddings;
# Restart backend — FAISS will rebuild from face_embeddings table (empty now)
# Re-register all students

══════════════════════════════════════════════════════════════
PRODUCTION DEPLOY COMMANDS
══════════════════════════════════════════════════════════════

# Build for production
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations on prod
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed prod database
docker compose -f docker-compose.prod.yml exec backend python seed.py

# View prod logs
docker compose -f docker-compose.prod.yml logs -f backend

# Backup database
docker exec fras-postgres-1 pg_dump -U fras_user fras > backup_$(date +%Y%m%d).sql

# Update production (zero-downtime)
git pull origin main
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# SSL certificate renewal
docker run --rm -v certbot_webroot:/var/www/certbot certbot/certbot renew
docker compose -f docker-compose.prod.yml restart nginx
