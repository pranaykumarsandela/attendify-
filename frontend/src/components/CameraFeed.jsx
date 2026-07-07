import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import useWebSocket from '../hooks/useWebSocket';

export default function CameraFeed({ subjectId, duration }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Camera offline");
  const [detectedFaces, setDetectedFaces] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);
  
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const { isConnected, subscribe, sendMessage } = useWebSocket(`${wsUrl}/api/camera/stream`);

  // Handle incoming messages from backend
  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      if (!isStreaming) return;

      if (data.type === 'faces') {
        setDetectedFaces(data.faces);
        isProcessingRef.current = false; // Release flow control lock immediately
        
        // Clear boxes if no updates received for 1 second
        if (window.faceTimeout) clearTimeout(window.faceTimeout);
        window.faceTimeout = setTimeout(() => {
          setDetectedFaces([]);
        }, 1000);
      } else if (data.type === 'detected') {
        setStatusMessage(`✓ ${data.roll_no} recognized — ${(data.confidence * 100).toFixed(1)}%`);
        
        // Keep message for 2 seconds
        if (window.statusTimeout) clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            window.statusTimeout = null;
            setStatusMessage("Live monitoring active");
        }, 2000);
      } else if (data.type === 'unknown') {
        setStatusMessage(`⚠ Unknown face detected`);
      }
    });

    return unsubscribe;
  }, [subscribe, isStreaming, subjectId]);

  // Capture and send frames with flow-control
  useEffect(() => {
    let intervalId = null;

    if (isStreaming && isConnected && videoRef.current) {
      intervalId = setInterval(() => {
        if (isProcessingRef.current) return; // Wait for the previous frame to finish processing

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext('2d');
          // Scale down the frame to 480x360 to decrease payload size and speed up backend detection!
          canvas.width = 480;
          canvas.height = 360;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 jpeg with slightly lower quality for faster network transmission
          const frameData = canvas.toDataURL('image/jpeg', 0.4); 
          const base64Data = frameData.split(',')[1];
          
          isProcessingRef.current = true;
          sendMessage({
            type: 'frame',
            data: base64Data,
            subject_id: subjectId,
            duration: duration
          });
        }
      }, 100); // Check/send every 100ms (up to 10 fps)
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming, isConnected, sendMessage, subjectId]);

  const toggleCamera = async () => {
    if (isStreaming) {
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsStreaming(false);
      setDetectedFaces([]);
      isProcessingRef.current = false;
      setStatusMessage("Camera stopped");
    } else {
      try {
        isProcessingRef.current = false;
        setDetectedFaces([]);
        setStatusMessage("Requesting camera permission...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsStreaming(true);
        setStatusMessage("Live monitoring active");
      } catch (err) {
        console.error("Failed to access webcam:", err);
        setStatusMessage("❌ Failed to access webcam");
      }
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
      <div className="p-3 bg-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
          <span className="text-sm font-medium text-slate-300">Live Feed {isConnected ? '(Connected)' : ''}</span>
        </div>
        <button 
          onClick={toggleCamera}
          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
            isStreaming 
              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
              : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
          }`}
        >
          {isStreaming ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
      
      {/* 4:3 Aspect ratio container to match 640x480 webcam dimensions and prevent overlay mismatch */}
      <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
        />
        
        {/* Draw absolute green/red bounding boxes over the 30fps smooth local video feed */}
        {isStreaming && detectedFaces.map((face, index) => {
          const [x1, y1, x2, y2] = face.bbox;
          // Calculate percentage coordinates relative to 480x360 canvas resolution
          const left = `${(x1 / 480) * 100}%`;
          const top = `${(y1 / 360) * 100}%`;
          const width = `${((x2 - x1) / 480) * 100}%`;
          const height = `${((y2 - y1) / 360) * 100}%`;
          
          const isSpoof = face.roll_no === 'spoof';
          const isUnknown = face.roll_no === 'unknown';
          
          const borderColor = isSpoof ? '#f97316' : isUnknown ? '#ef4444' : '#10b981'; // Orange, Red, Emerald
          const labelText = isSpoof 
            ? 'Spoof Detected' 
            : isUnknown 
            ? 'Unknown' 
            : `${face.roll_no} (${Math.round(face.confidence * 100)}%)`;

          return (
            <div 
              key={index}
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: `3px solid ${borderColor}`,
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 20,
                boxShadow: `0 0 12px ${borderColor}40`,
                transition: 'all 0.05s ease-out'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: '-28px',
                  left: '-3px',
                  backgroundColor: borderColor,
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: '900',
                  letterSpacing: '0.05em',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  textTransform: 'uppercase'
                }}
              >
                {labelText}
              </div>
            </div>
          );
        })}
        
        {!isStreaming && (
          <div className="text-slate-600 flex flex-col items-center">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Camera Offline</p>
          </div>
        )}
        
        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" width="640" height="480"></canvas>
      </div>
      
      <div className="bg-slate-800 px-4 py-3 border-t border-slate-700/50">
        <div className="font-mono text-xs text-emerald-400 flex items-center gap-2">
          <span className="text-slate-500">{'>'}</span> {statusMessage}
        </div>
      </div>
    </div>
  );
}
