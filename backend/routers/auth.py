from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from schemas import LoginRequest, LoginResponse
from database import get_db
from models import Student, Faculty, HOD
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = None
    profile = {}
    
    # In a real app we'd verify password. For demo we seed 'demo123' as hash and accept it.
    if req.role == 'student':
        result = await db.execute(select(Student).where(Student.student_email == req.email))
        user = result.scalars().first()
        if user:
            profile = {"name": user.name, "roll_no": user.roll_no, "semester": user.semester, "section": user.section}
    elif req.role == 'parent':
        result = await db.execute(select(Student).where(Student.parent_email == req.email))
        user = result.scalars().first()
        if user:
            profile = {"name": user.parent_name or f"Parent of {user.name}", "student_name": user.name, "student_roll_no": user.roll_no}
    elif req.role == 'teacher':
        result = await db.execute(select(Faculty).where(Faculty.email == req.email))
        user = result.scalars().first()
        if user:
            from models import Subject
            sub_ids = [int(i.strip()) for i in user.subjects.split(",") if i.strip()]
            subjects_list = []
            if sub_ids:
                s_res = await db.execute(select(Subject).where(Subject.id.in_(sub_ids)))
                subs = s_res.scalars().all()
                subjects_list = [{"id": s.id, "name": s.name, "semester": s.semester} for s in subs]
            profile = {"name": user.name, "email": user.email, "subjects": subjects_list}
    elif req.role == 'hod':
        result = await db.execute(select(HOD).where(HOD.email == req.email))
        user = result.scalars().first()
        if user:
            profile = {"name": user.name, "email": user.email, "department": user.department}
            
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": req.email, "role": req.role}, expires_delta=access_token_expires
    )
    
    return LoginResponse(access_token=access_token, role=req.role, profile=profile)

class ForgotPasswordReq(BaseModel):
    email: str
    role: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordReq, db: AsyncSession = Depends(get_db)):
    user = None
    if req.role == 'student':
        res = await db.execute(select(Student).where(Student.student_email == req.email))
        user = res.scalars().first()
    elif req.role == 'parent':
        res = await db.execute(select(Student).where(Student.parent_email == req.email))
        user = res.scalars().first()
    elif req.role == 'teacher':
        res = await db.execute(select(Faculty).where(Faculty.email == req.email))
        user = res.scalars().first()
    elif req.role == 'hod':
        res = await db.execute(select(HOD).where(HOD.email == req.email))
        user = res.scalars().first()
        
    if not user:
        # Prevent email enumeration by returning success anyway
        return {"message": "If an account with that email exists, a password reset link has been sent."}
        
    # Mock sending reset email
    print(f"MOCK EMAIL: Sent password reset link to {req.email} for role {req.role}")
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}
