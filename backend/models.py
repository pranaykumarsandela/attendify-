from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from pgvector.sqlalchemy import Vector

class Student(Base):
    __tablename__ = 'students'
    
    roll_no = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    semester = Column(Integer)
    section = Column(String)  # 'A', 'B', 'C'
    branch = Column(String, default='CSE')
    student_email = Column(String, unique=True, index=True)
    student_phone = Column(String)
    parent_email = Column(String)
    parent_phone = Column(String)
    parent_name = Column(String)
    password_hash = Column(String)
    face_registered = Column(Boolean, default=False)
    faiss_index = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")

class FaceEmbedding(Base):
    __tablename__ = 'face_embeddings'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_no = Column(String, ForeignKey('students.roll_no'), index=True)
    embedding = Column(Vector(512), nullable=False) # 512 dimensions for FaceNet
    quality_score = Column(Float, nullable=True)
    
    student = relationship("Student", back_populates="embeddings")

class Subject(Base):
    __tablename__ = 'subjects'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True)
    faculty_name = Column(String)
    semester = Column(Integer)
    total_classes = Column(Integer, default=0)

class Attendance(Base):
    __tablename__ = 'attendance'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_no = Column(String, ForeignKey('students.roll_no'))
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    date = Column(Date, nullable=False)
    period = Column(Integer) # 1 through 8
    status = Column(String, default='present') # 'present','absent','late'
    confidence = Column(Float) # face match score
    marked_at = Column(DateTime, default=datetime.now)
    camera_source = Column(String, default='laptop_webcam')
    
    __table_args__ = (UniqueConstraint('roll_no', 'subject_id', 'date', 'period', name='_student_subject_date_period_uc'),)

class Faculty(Base):
    __tablename__ = 'faculty'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    subjects = Column(String) # comma-separated subject IDs

class HOD(Base):
    __tablename__ = 'hod'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    department = Column(String, default='CSE')

class Alert(Base):
    __tablename__ = 'alerts'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_no = Column(String, ForeignKey('students.roll_no'), index=True)
    type = Column(String) # 'absence', 'low_attendance'
    title = Column(String)
    message = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    is_read = Column(Boolean, default=False)
