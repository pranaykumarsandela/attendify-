import cv2
import torch
import numpy as np
from ultralytics import YOLO
from facenet_pytorch import InceptionResnetV1
import logging
import faiss

logger = logging.getLogger(__name__)

class FaceEngine:
    def __init__(self):
        # Determine the best device (CPU/GPU)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Initializing FaceEngine on {self.device}")

        # Load YOLOv8 face detection model
        # yolov8n-face is widely used for face detection with Ultralytics
        try:
            self.detector = YOLO('yolov8n-face.pt')
            self.detector_type = 'yolo'
        except Exception as e:
            logger.warning(f"Failed to load yolov8n-face.pt, falling back to OpenCV Haar Cascade: {e}")
            self.detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.detector_type = 'haar'

        # Load FaceNet InceptionResnetV1 model for embeddings
        self.embedder = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        
        # FAISS Index
        self.index = faiss.IndexFlatIP(512)
        self.roll_map = []

    def detect_faces(self, frame):
        """
        Detect faces in a given BGR frame.
        Returns a list of dictionaries containing bbox, confidence, and cropped face image.
        """
        detected_faces = []
        
        if self.detector_type == 'yolo':
            results = self.detector(frame, verbose=False, conf=0.60, iou=0.40)
            boxes_to_process = []
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    boxes_to_process.append((x1, y1, x2, y2, conf))
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # scaleFactor 1.1, minNeighbors 5 are good defaults for Haar
            faces = self.detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
            boxes_to_process = []
            for (x, y, w, h) in faces:
                boxes_to_process.append((x, y, x + w, y + h, 1.0))
                
        for (x1, y1, x2, y2, conf) in boxes_to_process:

                # Optional: If using general YOLOv8n, ensure it's a 'person' (class 0)
                # and maybe adjust to head, but if it's yolov8n-face, it detects faces directly.

                # Filter by size >= 60x60
                w, h = x2 - x1, y2 - y1
                if w < 60 or h < 60:
                    continue

                # Add 20px padding
                pad = 20
                frame_h, frame_w = frame.shape[:2]
                
                px1 = max(0, x1 - pad)
                py1 = max(0, y1 - pad)
                px2 = min(frame_w, x2 + pad)
                py2 = min(frame_h, y2 + pad)

                face_crop = frame[py1:py2, px1:px2]

                if face_crop.size == 0:
                    continue

                detected_faces.append({
                    "bbox": (x1, y1, x2, y2),
                    "confidence": conf,
                    "crop": face_crop
                })

        return detected_faces

    def check_liveness(self, face_crop):
        """
        Basic liveness check: checks texture variance.
        If standard deviation of gray image is <= 15, it's considered static/fake.
        """
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        std_dev = np.std(gray)
        return std_dev > 15

    def get_embedding(self, face_crop):
        """
        Preprocess the cropped face and generate a 512-dim embedding.
        """
        # Resize to 160x160 (FaceNet input size)
        face_resized = cv2.resize(face_crop, (160, 160))

        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)

        # Normalize: (pixel - 127.5) / 128.0
        face_norm = (face_rgb.astype(np.float32) - 127.5) / 128.0

        # Transpose to [C, H, W]
        face_transposed = np.transpose(face_norm, (2, 0, 1))

        # Convert to float32 torch tensor shape [1, 3, 160, 160]
        face_tensor = torch.tensor(face_transposed, dtype=torch.float32).unsqueeze(0).to(self.device)

        # Generate embedding
        with torch.no_grad():
            embedding = self.embedder(face_tensor)

        # L2 normalize
        embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
        
        # Return as 1D numpy array
        return embedding[0].cpu().numpy()

    def register_student(self, roll_no, frames):
        embeddings = []
        blur_scores = []
        bright_scores = []
        sizes = []
        for frame in frames:
            boxes = self.detect_faces(frame)
            if not boxes: continue
            
            b = boxes[0]['bbox']
            face_size = (b[2]-b[0])*(b[3]-b[1])
            sizes.append(face_size)
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur_scores.append(cv2.Laplacian(gray, cv2.CV_64F).var())
            bright_scores.append(np.mean(gray))
            
            emb = self.get_embedding(boxes[0]['crop'])
            embeddings.append(emb)
            
        if not embeddings:
            raise ValueError("No faces detected in provided photos")
            
        avg_emb = np.mean(embeddings, axis=0)
        avg_emb = avg_emb / np.linalg.norm(avg_emb)
        
        quality = min(1.0, (
            min(np.mean(blur_scores) / 500, 1.0) * 0.4 +
            min(np.mean(bright_scores) / 128, 1.0) * 0.3 +
            min(np.mean(sizes) / (100*100), 1.0) * 0.3
        ))
        
        # Add to faiss
        self.index.add(avg_emb.reshape(1, -1).astype('float32'))
        self.roll_map.append(roll_no)
        self._save()
        
        return avg_emb, quality

    def _save(self):
        import os
        os.makedirs("data/embeddings", exist_ok=True)
        faiss.write_index(self.index, "data/embeddings/index.faiss")

    def identify(self, embedding, threshold=0.65):
        """Identify face using FAISS index"""
        if self.index.ntotal == 0:
            return "unknown", 0.0
            
        import numpy as np
        emb_array = np.array(embedding).reshape(1, -1).astype('float32')
        D, I = self.index.search(emb_array, 1)
        
        score = float(D[0][0])
        idx = int(I[0][0])
        
        if score > threshold and idx != -1:
            roll_no = self.roll_map[idx]
            return roll_no, score
            
        return "unknown", score


# Singleton instance can be created later or used via Dependency Injection
face_engine = FaceEngine()
