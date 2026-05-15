import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import auth, students, subjects, attendance, registration, alerts, admin
from services.camera import camera_streamer
from services.notifier import manager
from seed import seed_db
import logging

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
    from services.face_engine import face_engine
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

@app.websocket("/api/camera/stream")
async def camera_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for any client messages if needed
            data = await websocket.receive_text()
            if data == "start":
                camera_streamer.start(subject_id=1) # Mock subject_id if not provided
            elif data == "stop":
                camera_streamer.stop()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/camera/start")
async def start_camera(subject_id: int):
    success = camera_streamer.start(subject_id)
    return {"success": success}

@app.post("/api/camera/stop")
async def stop_camera():
    camera_streamer.stop()
    return {"success": True}
