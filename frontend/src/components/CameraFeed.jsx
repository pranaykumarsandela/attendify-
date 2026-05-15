import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import useWebSocket from '../hooks/useWebSocket';

export default function CameraFeed({ subjectId }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Camera offline");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const { isConnected, subscribe, sendMessage } = useWebSocket(`${wsUrl}/api/camera/stream`);

  // Handle incoming messages from backend
  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      if (!isStreaming) return;

      if (data.type === 'detected') {
        setStatusMessage(`✓ ${data.roll_no} recognized — ${(data.confidence * 100).toFixed(1)}%`);
        
        // Keep message for 2 seconds
        if (window.statusTimeout) clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            window.statusTimeout = null;
            setStatusMessage("Live monitoring active");
        }, 2000);
        
        // Mark attendance via API
        client.post('/api/attendance/mark', {
          roll_no: data.roll_no,
          subject_id: subjectId,
          period: 1, 
          confidence: data.confidence
        }).catch(console.error);
      } else if (data.type === 'unknown') {
        setStatusMessage(`⚠ Unknown face detected`);
      }
    });

    return unsubscribe;
  }, [subscribe, isStreaming, subjectId]);

  // Capture and send frames
  useEffect(() => {
    let intervalId = null;

    if (isStreaming && isConnected && videoRef.current) {
      intervalId = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext('2d');
          canvas.width = 640;
          canvas.height = 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 jpeg
          const frameData = canvas.toDataURL('image/jpeg', 0.6); // 0.6 quality
          const base64Data = frameData.split(',')[1];
          
          sendMessage({
            type: 'frame',
            data: base64Data,
            subject_id: subjectId
          });
        }
      }, 200); // Send frame every 200ms (5 fps)
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
      setStatusMessage("Camera stopped");
    } else {
      try {
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
      
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
        />
        
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
