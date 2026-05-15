from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
import models
from routers.auth import get_password_hash
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

class StudentCreate(BaseModel):
    roll_no: str
    name: str
    semester: int
    section: str
    branch: str = "CSE"
    student_email: str
    parent_email: str
    parent_name: str
    password: str

@router.post("/student")
async def create_student(data: StudentCreate, db: AsyncSession = Depends(get_db)):
    student = models.Student(
        roll_no=data.roll_no.upper(),
        name=data.name,
        semester=data.semester,
        section=data.section.upper(),
        branch=data.branch,
        student_email=data.student_email,
        parent_email=data.parent_email,
        parent_name=data.parent_name,
        password_hash=get_password_hash(data.password)
    )
    db.add(student)
    await db.commit()
    return {"message": "Student created successfully", "roll_no": student.roll_no}

@router.get("/student/{roll_no}")
async def get_student_admin(roll_no: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Student).where(models.Student.roll_no == roll_no.upper()))
    student = res.scalars().first()
    if not student:
        raise HTTPException(404, "Student not found")
    return {
        "roll_no": student.roll_no,
        "name": student.name,
        "semester": student.semester,
        "section": student.section,
        "branch": student.branch,
        "student_email": student.student_email,
        "parent_email": student.parent_email,
        "parent_name": student.parent_name
    }

@router.put("/student/{roll_no}")
async def update_student(roll_no: str, data: StudentCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Student).where(models.Student.roll_no == roll_no.upper()))
    student = res.scalars().first()
    if not student:
        raise HTTPException(404, "Student not found")
        
    student.name = data.name
    student.semester = data.semester
    student.section = data.section.upper()
    student.branch = data.branch
    student.student_email = data.student_email
    student.parent_email = data.parent_email
    student.parent_name = data.parent_name
    
    if data.password:
        from routers.auth import get_password_hash
        student.password_hash = get_password_hash(data.password)
        
    await db.commit()
    return {"message": "Student updated successfully"}

@router.delete("/student/{roll_no}")
async def delete_student(roll_no: str, db: AsyncSession = Depends(get_db)):
    roll_no = roll_no.upper()
    res = await db.execute(select(models.Student).where(models.Student.roll_no == roll_no))
    student = res.scalars().first()
    if not student:
        raise HTTPException(404, "Student not found")
        
    # Delete related records manually to avoid IntegrityError if cascades are missing
    await db.execute(models.Alert.__table__.delete().where(models.Alert.roll_no == roll_no))
    await db.execute(models.Attendance.__table__.delete().where(models.Attendance.roll_no == roll_no))
    await db.execute(models.FaceEmbedding.__table__.delete().where(models.FaceEmbedding.roll_no == roll_no))
    await db.execute(models.Student.__table__.delete().where(models.Student.roll_no == roll_no))
    await db.commit()
    
    # Rebuild FAISS index
    from services.face_engine import face_engine
    import faiss, numpy as np
    from sqlalchemy import text
    
    rows = await db.execute(select(models.FaceEmbedding.roll_no, models.FaceEmbedding.embedding))
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
    
    return {"message": "Student deleted successfully"}

class FacultyCreate(BaseModel):
    name: str
    email: str
    password: str
    subjects: str # Comma-separated subject names
    semester: int

@router.post("/faculty")
async def create_faculty(data: FacultyCreate, db: AsyncSession = Depends(get_db)):
    sub_names = [s.strip() for s in data.subjects.split(",") if s.strip()]
    sub_ids = []
    
    for s_name in sub_names:
        res = await db.execute(select(models.Subject).where(models.Subject.name.ilike(s_name)))
        sub = res.scalars().first()
        if not sub:
            # Create new subject if it doesn't exist
            sub = models.Subject(
                name=s_name,
                code=s_name[:3].upper() + "101", # auto-gen code
                semester=data.semester,
                total_classes=30,
                faculty_name=data.name
            )
            db.add(sub)
            await db.commit()
            await db.refresh(sub)
        sub_ids.append(str(sub.id))
        
    fac = models.Faculty(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        subjects=",".join(sub_ids)
    )
    db.add(fac)
    await db.commit()
    return {"message": "Faculty created successfully"}

@router.get("/faculty/{email}")
async def get_faculty_admin(email: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Faculty).where(models.Faculty.email == email))
    fac = res.scalars().first()
    if not fac:
        raise HTTPException(404, "Faculty not found")
        
    # Get subject names
    sub_ids = [int(i.strip()) for i in fac.subjects.split(",") if i.strip()]
    sub_names = []
    if sub_ids:
        s_res = await db.execute(select(models.Subject).where(models.Subject.id.in_(sub_ids)))
        subs = s_res.scalars().all()
        sub_names = [s.name for s in subs]
        
    return {
        "name": fac.name,
        "email": fac.email,
        "subjects": ", ".join(sub_names)
    }

@router.put("/faculty/{email}")
async def update_faculty(email: str, data: FacultyCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Faculty).where(models.Faculty.email == email))
    fac = res.scalars().first()
    if not fac:
        raise HTTPException(404, "Faculty not found")
        
    fac.name = data.name
    if data.password:
        from routers.auth import get_password_hash
        fac.password_hash = get_password_hash(data.password)
        
    # Re-map subjects
    sub_names = [s.strip() for s in data.subjects.split(",") if s.strip()]
    sub_ids = []
    for s_name in sub_names:
        s_res = await db.execute(select(models.Subject).where(models.Subject.name.ilike(s_name)))
        sub = s_res.scalars().first()
        if not sub:
            sub = models.Subject(
                name=s_name,
                code=s_name[:3].upper() + "101",
                semester=data.semester,
                total_classes=30,
                faculty_name=data.name
            )
            db.add(sub)
            await db.flush()
        sub_ids.append(str(sub.id))
        
    fac.subjects = ",".join(sub_ids)
    await db.commit()
    return {"message": "Faculty updated successfully"}

@router.delete("/faculty/{email}")
async def delete_faculty(email: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Faculty).where(models.Faculty.email == email))
    fac = res.scalars().first()
    if not fac:
        raise HTTPException(404, "Faculty not found")
        
    await db.execute(models.Faculty.__table__.delete().where(models.Faculty.email == email))
    await db.commit()
    
    return {"message": "Faculty deleted successfully"}
