import { useState, useEffect } from 'react';
import client from '../api/client';
import useWebSocket from '../hooks/useWebSocket';

export default function CameraFeed({ subjectId }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameSrc, setFrameSrc] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Camera offline");
  
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const { isConnected, subscribe } = useWebSocket(`${wsUrl}/api/camera/stream`);

  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      if (!isStreaming) return; // Ignore events if camera is toggled off locally

      if (data.type === 'frame') {
        setFrameSrc(`data:image/jpeg;base64,${data.data}`);
        // Only reset status message if we haven't recognized someone in the last 2 seconds
        if (!window.statusTimeout) {
            setStatusMessage("Live monitoring active");
        }
      } else if (data.type === 'detected') {
        setStatusMessage(`✓ ${data.roll_no} recognized — ${(data.confidence * 100).toFixed(1)}%`);
        
        // Keep message for 2 seconds
        if (window.statusTimeout) clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            window.statusTimeout = null;
        }, 2000);
        
        // Also mark attendance via API
        client.post('/api/attendance/mark', {
          roll_no: data.roll_no,
          subject_id: subjectId,
          period: 1, // Mock period
          confidence: data.confidence
        }).catch(console.error);
      } else if (data.type === 'unknown') {
        setStatusMessage(`⚠ Unknown face detected`);
      }
    });

    return unsubscribe;
  }, [subscribe, isStreaming, subjectId]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isStreaming) {
        client.post('/api/camera/stop');
      }
    };
  }, [isStreaming]);

  const toggleCamera = async () => {
    if (isStreaming) {
      await client.post('/api/camera/stop');
      setIsStreaming(false);
      setFrameSrc(null);
      setStatusMessage("Camera stopped");
    } else {
      setIsStreaming(true);
      setStatusMessage("Initializing camera...");
      await client.post(`/api/camera/start?subject_id=${subjectId}`);
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
        {frameSrc ? (
          <img src={frameSrc} alt="Live feed" className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-600 flex flex-col items-center">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Camera Offline</p>
          </div>
        )}
      </div>
      
      <div className="bg-slate-800 px-4 py-3 border-t border-slate-700/50">
        <div className="font-mono text-xs text-emerald-400 flex items-center gap-2">
          <span className="text-slate-500">{'>'}</span> {statusMessage}
        </div>
      </div>
    </div>
  );
}
