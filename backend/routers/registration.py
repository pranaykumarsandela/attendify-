from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
import numpy as np
import cv2
import faiss
from database import get_db
from models import Student, FaceEmbedding
from services.face_engine import face_engine
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_hod_user(token: str = Depends(oauth2_scheme)):
    # Mock dependency
    return {"role": "hod"}

router = APIRouter(prefix="/api/register/face", tags=["registration"])

@router.post("")
async def register_face(
    roll_no: str = Form(...),
    files: list[UploadFile] = File(...),
    current_user = Depends(get_hod_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify student exists
    result = await db.execute(select(Student).where(Student.roll_no == roll_no))
    student = result.scalars().first()
    if not student:
        raise HTTPException(404, "Student not found")

    # Decode all uploaded images
    decoded_frames = []
    for f in files:
        content = await f.read()
        arr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            decoded_frames.append(img)

    if len(decoded_frames) < 2:
        raise HTTPException(400, "Could not decode uploaded images")

    # Register with face engine
    try:
        avg_embedding, quality = face_engine.register_student(roll_no, decoded_frames)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Save to PostgreSQL
    res = await db.execute(select(FaceEmbedding).where(FaceEmbedding.roll_no == roll_no))
    existing_emb = res.scalars().first()
    
    if existing_emb:
        existing_emb.embedding = avg_embedding.tolist()
        existing_emb.quality_score = float(quality)
    else:
        new_emb = FaceEmbedding(roll_no=roll_no, embedding=avg_embedding.tolist(), quality_score=float(quality))
        db.add(new_emb)
        
    faiss_idx = face_engine.index.ntotal - 1
    student.face_registered = True
    student.faiss_index = faiss_idx
    
    await db.commit()
    
    if existing_emb:
        # Rebuild index
        rows = await db.execute(select(FaceEmbedding.roll_no, FaceEmbedding.embedding))
        new_index = faiss.IndexFlatIP(512)
        new_roll_map = []
        for r_no, emb in rows.all():
            emb_arr = np.array(emb, dtype='float32')
            new_index.add(emb_arr.reshape(1,-1))
            new_roll_map.append(r_no)
        face_engine.index = new_index
        face_engine.roll_map = new_roll_map
        face_engine._save()
        
        for idx, r_no in enumerate(new_roll_map):
            await db.execute(text("UPDATE students SET faiss_index=:idx WHERE roll_no=:r_no"), {"idx": idx, "r_no": r_no})
        await db.commit()
        faiss_idx = face_engine.roll_map.index(roll_no)

    return {
        "success": True,
        "name": student.name,
        "roll_no": roll_no,
        "quality_score": round(quality, 4),
        "photos_processed": len(decoded_frames),
        "faiss_index": faiss_idx,
        "total_registered": face_engine.index.ntotal
    }

@router.post("/check-quality")
async def check_quality(file: UploadFile = File(...)):
    content = await file.read()
    arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = float(np.mean(gray))

    boxes = face_engine.detect_faces(img)
    face_size = 0
    if boxes:
        b = boxes[0]['bbox']
        face_size = (b[2]-b[0]) * (b[3]-b[1])

    quality = min(1.0, (
        min(blur_score / 500, 1.0) * 0.4 +
        min(brightness / 128, 1.0) * 0.3 +
        min(face_size / (100*100), 1.0) * 0.3
    ))

    return {
        "quality": float(round(quality, 3)),
        "blur_score": float(round(blur_score, 1)),
        "brightness": float(round(brightness, 1)),
        "face_detected": len(boxes) > 0,
        "face_size": int(face_size)
    }
