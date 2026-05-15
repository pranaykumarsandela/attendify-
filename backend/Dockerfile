FROM python:3.11-slim

# Set up user to run as non-root (Hugging Face requirement)
RUN useradd -m -u 1000 user
USER root

WORKDIR /app

# Install system dependencies for OpenCV and FAISS
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories for data storage and set permissions
RUN mkdir -p /app/data/embeddings /app/data/registered_faces /app/data/temp_models
RUN chown -R user:user /app

# Pre-download models to cache them in the Docker image
# We temporarily set HOME so insightface downloads to a writable location during build
ENV HOME=/app/data/temp_models
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n-face.pt')" || true
RUN python -c "import insightface; a=insightface.app.FaceAnalysis(name='buffalo_l'); a.prepare(ctx_id=-1)" || true

# Copy the rest of the application code
COPY --chown=user:user . .

# Switch to the non-root user
USER user
ENV HOME=/home/user

# Hugging Face runs on port 7860
EXPOSE 7860

# Run Uvicorn directly from the current directory (since main.py is in /app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
