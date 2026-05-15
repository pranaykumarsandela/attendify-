import { useEffect, useRef, useState, useCallback } from 'react';

// Global singleton for WebSocket to prevent multiple connections
let globalWs = null;
const subscribers = new Set();

export default function useWebSocket(url) {
  const [isConnected, setIsConnected] = useState(false);
  
  const connect = useCallback(() => {
    if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
      setIsConnected(globalWs.readyState === WebSocket.OPEN);
      return;
    }

    globalWs = new WebSocket(url);

    globalWs.onopen = () => {
      console.log('WS Connected');
      setIsConnected(true);
    };

    globalWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      subscribers.forEach(callback => callback(data));
    };

    globalWs.onclose = (e) => {
      console.log('WS Disconnected, reconnecting in 2s...', e.reason);
      setIsConnected(false);
      globalWs = null;
      // Exponential backoff could be implemented here
      setTimeout(connect, 2000);
    };

    globalWs.onerror = (err) => {
      console.error('WS Error:', err);
      globalWs.close();
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      // Don't close global connection on unmount, 
      // let it persist across page navigation for demo.
    };
  }, [connect]);

  const subscribe = useCallback((callback) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }, []);

  return { isConnected, subscribe };
}
