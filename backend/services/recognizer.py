import numpy as np
import logging
from sqlalchemy import select, text
from database import AsyncSessionLocal
from models import FaceEmbedding

logger = logging.getLogger(__name__)

class EmbeddingStore:
    def __init__(self):
        self.threshold = 0.50

    async def register(self, roll_no, embedding):
        """
        Save new embedding vector for a student into the database.
        Creates a dummy student record if it doesn't exist to satisfy FK.
        """
        async with AsyncSessionLocal() as session:
            # Check if student exists
            from models import Student
            from sqlalchemy import select
            
            result = await session.execute(select(Student).where(Student.roll_no == roll_no))
            student = result.scalars().first()
            if not student:
                # Create dummy student with default credentials
                from routers.auth import get_password_hash
                new_student = Student(
                    roll_no=roll_no, 
                    name=f"Student {roll_no}",
                    parent_email=f"parent_{roll_no}@gmail.com",
                    password_hash=get_password_hash("demo123")
                )
                session.add(new_student)
            
            # We assume embedding is a numpy array, convert to list for pgvector
            embedding_list = embedding.tolist()
            new_emb = FaceEmbedding(roll_no=roll_no, embedding=embedding_list)
            session.add(new_emb)
            await session.commit()
            logger.info(f"Registered new embedding for {roll_no}")

    async def identify(self, query_embedding):
        """
        Match query embedding against stored embeddings using pgvector.
        Returns (roll_no, confidence) or ("unknown", confidence)
        """
        embedding_list = query_embedding.tolist()
        
        async with AsyncSessionLocal() as session:
            # Using pgvector's <=> for cosine distance. 
            # Cosine similarity = 1 - cosine distance
            query = select(
                FaceEmbedding.roll_no,
                (1 - FaceEmbedding.embedding.cosine_distance(embedding_list)).label("similarity")
            ).order_by(
                FaceEmbedding.embedding.cosine_distance(embedding_list)
            ).limit(1)
            
            result = await session.execute(query)
            row = result.first()
            
            if row:
                roll_no, similarity = row
                if similarity >= self.threshold:
                    return roll_no, float(similarity)
                return "unknown", float(similarity)
            
            return "unknown", 0.0

# Singleton instance
embedding_store = EmbeddingStore()

