import cv2
import base64
import asyncio
import threading
import logging
from services.face_engine import face_engine
from services.recognizer import embedding_store

logger = logging.getLogger(__name__)

class CameraStreamer:
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.thread = None
        self._event_queue = None  # queue to pass events to websocket
        self.active_subject_id = None
        
        # Frame sampling control
        self.frame_count = 0
        self.process_every_n = 20
        self.last_faces = [] # Store last known faces for smooth rendering

    @property
    def event_queue(self):
        if self._event_queue is None:
            # Lazily initialize queue so it binds to the correct uvicorn event loop
            self._event_queue = asyncio.Queue()
        return self._event_queue

    def start(self, subject_id=None):
        if self.is_running:
            return
            
        self.active_subject_id = subject_id
        
        # Capture the main event loop to safely put items in the queue from the thread
        try:
            self.main_loop = asyncio.get_running_loop()
        except RuntimeError:
            self.main_loop = asyncio.get_event_loop()
        
        # Open default webcam
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if not self.cap.isOpened():
            logger.error("Failed to open webcam.")
            return False

        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        logger.info(f"Camera started for subject {subject_id}")
        return True

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        if self.cap:
            self.cap.release()
        logger.info("Camera stopped")

    def _capture_loop(self):
        while self.is_running:
            try:
                ret, frame = self.cap.read()
                if not ret:
                    continue
                
                self.frame_count += 1
                
                if self.frame_count % self.process_every_n == 0:
                    # Run detection and recognition
                    detected_faces = face_engine.detect_faces(frame)
                    
                    self.last_faces = [] # Reset last faces
                    
                    for face in detected_faces:
                        # Check liveness
                        if face_engine.check_liveness(face['crop']):
                            embedding = face_engine.get_embedding(face['crop'])
                            
                            try:
                                roll_no, confidence = face_engine.identify(embedding)
                            except Exception as e:
                                logger.error(f"Identify error: {e}")
                                roll_no, confidence = "unknown", 0.0
                            
                            if roll_no != "unknown":
                                # Queue identified event
                                event = {
                                    "type": "detected",
                                    "roll_no": roll_no,
                                    "name": "Student", # Can be enriched by DB lookup
                                    "confidence": confidence,
                                    "subject_id": self.active_subject_id
                                }
                                # Send event to queue using threadsafe method
                                self.main_loop.call_soon_threadsafe(self.event_queue.put_nowait, event)
                                
                                self.last_faces.append({
                                    "bbox": face['bbox'],
                                    "label": f"{roll_no} ({int(confidence*100)}%)",
                                    "color": (0, 255, 0)
                                })
                            else:
                                event = {
                                    "type": "unknown",
                                    "confidence": confidence
                                }
                                self.main_loop.call_soon_threadsafe(self.event_queue.put_nowait, event)
                                
                                self.last_faces.append({
                                    "bbox": face['bbox'],
                                    "label": "Unknown",
                                    "color": (0, 0, 255)
                                })
                        else:
                            # Failed liveness check
                            self.last_faces.append({
                                "bbox": face['bbox'],
                                "label": "Spoof Detected",
                                "color": (0, 165, 255)
                            })

                # Draw last known faces
                for f in self.last_faces:
                    x1, y1, x2, y2 = f['bbox']
                    cv2.rectangle(frame, (x1, y1), (x2, y2), f['color'], 2)
                    cv2.putText(frame, f['label'], (x1, max(0, y1 - 10)), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, f['color'], 2)

                # Encode frame to JPEG
                _, buffer = cv2.imencode('.jpg', frame)
                b64_frame = base64.b64encode(buffer).decode('utf-8')
                
                # Send frame event
                frame_event = {
                    "type": "frame",
                    "data": b64_frame
                }
                self.main_loop.call_soon_threadsafe(self.event_queue.put_nowait, frame_event)
            except Exception as e:
                logger.error(f"Error in capture loop: {e}")
                import time
                time.sleep(0.5)  # Prevent spamming logs if failing continuously

        # Cleanup handled in stop()

camera_streamer = CameraStreamer()
