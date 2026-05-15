from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str # 'student', 'parent', 'teacher', 'hod'

class LoginResponse(BaseModel):
    access_token: str
    role: str
    profile: dict

class MarkAttendanceRequest(BaseModel):
    roll_no: str
    subject_id: int
    period: int
    confidence: float

class AttendanceRecord(BaseModel):
    id: int
    roll_no: str
    subject_id: int
    date: date
    period: int
    status: str
    confidence: float
    marked_at: datetime
    camera_source: str
    
    class Config:
        orm_mode = True
        from_attributes = True

class SubjectSchema(BaseModel):
    id: int
    name: str
    code: str
    faculty_name: str
    semester: int
    total_classes: int
    
    class Config:
        orm_mode = True
        from_attributes = True

class StudentSchema(BaseModel):
    roll_no: str
    name: str
    semester: int
    section: str
    branch: str
    parent_email: Optional[str] = None
    
    class Config:
        orm_mode = True
        from_attributes = True

class AlertSchema(BaseModel):
    id: int
    roll_no: str
    type: str
    title: str
    message: str
    created_at: datetime
    is_read: bool

    class Config:
        orm_mode = True
        from_attributes = True
