import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base, AsyncSessionLocal
from routers import auth, students, subjects, attendance, registration, alerts, admin
from services.camera import camera_streamer
from services.face_engine import face_engine
from services.notifier import manager
from seed import seed_db
import logging
from sqlalchemy.future import select
from models import Attendance, Student
from datetime import date, datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def broadcast_camera_events():
    """Background task to pull from camera queue and broadcast to websockets."""
    while True:
        event = await camera_streamer.event_queue.get()
        await manager.broadcast(event)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up FRAS backend...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Seed database
    await seed_db()
        
    # Startup Sync FAISS
    import faiss
    import numpy as np
    from sqlalchemy import select
    from models import FaceEmbedding
    from database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(FaceEmbedding.roll_no, FaceEmbedding.embedding).order_by(FaceEmbedding.id.asc()))
        rows = result.all()
        if rows:
            face_engine.index.reset()
            face_engine.roll_map = []
            for r_no, emb in rows:
                emb_arr = np.array(emb, dtype='float32')
                face_engine.index.add(emb_arr.reshape(1,-1))
                face_engine.roll_map.append(r_no)
            face_engine._save()
            logger.info(f"FAISS loaded: {face_engine.index.ntotal} students")
            
    # Start the broadcast task
    task = asyncio.create_task(broadcast_camera_events())
    yield
    # Shutdown
    logger.info("Shutting down FRAS backend...")
    camera_streamer.stop()
    task.cancel()

app = FastAPI(title="FRAS API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(subjects.router)
app.include_router(registration.router)
app.include_router(attendance.router)
app.include_router(alerts.router)
app.include_router(admin.router)

import base64
import numpy as np
import cv2
import json

@app.websocket("/api/camera/stream")
async def camera_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if not isinstance(msg, dict):
                    continue
            except Exception:
                continue
                
            if msg.get("type") == "frame":
                base64_data = msg.get("data")
                subject_id = msg.get("subject_id")
                try:
                    subject_id = int(subject_id) if subject_id is not None else None
                except ValueError:
                    subject_id = None

                if not base64_data:
                    continue
                    
                # Decode base64 frame
                try:
                    img_bytes = base64.b64decode(base64_data)
                    arr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                except Exception as e:
                    logger.error(f"Failed to decode frame: {e}")
                    continue
                    
                if frame is not None:
                    # Run face detection and recognition
                    try:
                        detected_faces = face_engine.detect_faces(frame)
                    except Exception as e:
                        logger.error(f"Detection error: {e}")
                        detected_faces = []
                        
                    faces_info = []
                    for face in detected_faces:
                        x1, y1, x2, y2 = face['bbox']
                        crop = face['crop']
                        
                        # Basic liveness check
                        try:
                            is_live = face_engine.check_liveness(crop)
                        except Exception:
                            is_live = True
                            
                        if is_live:
                            try:
                                embedding = face_engine.get_embedding(crop)
                                roll_no, confidence = face_engine.identify(embedding)
                            except Exception as e:
                                logger.error(f"Identification error: {e}")
                                roll_no, confidence = "unknown", 0.0
                        else:
                            roll_no, confidence = "spoof", 0.0
                            
                        faces_info.append({
                            "bbox": [int(x1), int(y1), int(x2), int(y2)],
                            "roll_no": str(roll_no),
                            "confidence": float(confidence),
                            "is_live": bool(is_live)
                        })
                        
                    # Send faces coordinates and labels to client for 30fps overlay rendering
                    await websocket.send_json({
                        "type": "faces",
                        "faces": faces_info
                    })
                    
                    # Direct database write for recognized faces
                    if subject_id is not None:
                        for f in faces_info:
                            if f['roll_no'] != "unknown" and f['roll_no'] != "spoof" and f['confidence'] >= 0.50:
                                try:
                                    async with AsyncSessionLocal() as db_session:
                                        # Check if already marked today for this period (default period 1)
                                        query = select(Attendance).where(
                                            Attendance.roll_no == f['roll_no'],
                                            Attendance.subject_id == subject_id,
                                            Attendance.date == date.today(),
                                            Attendance.period == 1
                                        )
                                        db_res = await db_session.execute(query)
                                        existing = db_res.scalars().first()
                                        
                                        if existing:
                                            # Rate limit Neon DB updates to avoid transactional locks (only update every 15s)
                                            time_diff = datetime.utcnow() - existing.marked_at if existing.marked_at else None
                                            if time_diff is None or time_diff.total_seconds() > 15:
                                                existing.marked_at = datetime.utcnow()
                                                await db_session.commit()
                                                
                                                student_res = await db_session.execute(select(Student).where(Student.roll_no == f['roll_no']))
                                                student = student_res.scalars().first()
                                                student_name = student.name if student else "Unknown Student"
                                                
                                                await manager.broadcast({
                                                    "type": "marked",
                                                    "roll_no": f['roll_no'],
                                                    "name": student_name,
                                                    "subject_id": subject_id,
                                                    "timestamp": existing.marked_at.replace(tzinfo=timezone.utc).isoformat() if existing.marked_at else datetime.now(timezone.utc).isoformat(),
                                                    "status": existing.status
                                                })
                                        else:
                                            new_att = Attendance(
                                                roll_no=f['roll_no'],
                                                subject_id=subject_id,
                                                date=date.today(),
                                                period=1,
                                                status='present',
                                                confidence=f['confidence'],
                                                marked_at=datetime.utcnow()
                                            )
                                            db_session.add(new_att)
                                            await db_session.commit()
                                            
                                            student_res = await db_session.execute(select(Student).where(Student.roll_no == f['roll_no']))
                                            student = student_res.scalars().first()
                                            student_name = student.name if student else "Unknown Student"
                                            
                                            await manager.broadcast({
                                                "type": "marked",
                                                "roll_no": f['roll_no'],
                                                "name": student_name,
                                                "subject_id": subject_id,
                                                "timestamp": new_att.marked_at.replace(tzinfo=timezone.utc).isoformat() if new_att.marked_at else datetime.now(timezone.utc).isoformat(),
                                                "status": "present"
                                            })
                                except Exception as db_err:
                                    logger.error(f"Error marking attendance inside websocket loop: {db_err}")
                                    
                    # Send identified/unknown status message triggers to client
                    for f in faces_info:
                        if f['roll_no'] != "unknown" and f['roll_no'] != "spoof":
                            await websocket.send_json({
                                "type": "detected",
                                "roll_no": f['roll_no'],
                                "confidence": f['confidence'],
                                "subject_id": subject_id
                            })
                        elif f['roll_no'] == "unknown":
                            await websocket.send_json({
                                "type": "unknown",
                                "confidence": f['confidence']
                            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Unhandled exception in websocket stream: {e}", exc_info=True)
    finally:
        manager.disconnect(websocket)

@app.post("/api/camera/start")
async def start_camera(subject_id: int):
    success = camera_streamer.start(subject_id)
    return {"success": success}

@app.post("/api/camera/stop")
async def stop_camera():
    camera_streamer.stop()
    return {"success": True}
