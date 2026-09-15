import { useEffect, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { sensorCollector } from '../services/sensors/sensorCollector';

export function useNavigationWebSocket(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { updateState } = useNavigationStore();

  useEffect(() => {
    if (!sessionId) return;

    // Connect to real WebSocket
    const wsUrl = `ws://localhost:8000/ws/navigation/${sessionId}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected to IDR engine');
      
      // Start collecting real sensor data and pushing it over WS
      sensorCollector.start((packet) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(packet));
        }
      });
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'navigation_state') {
          updateState(data);
        } else if (data.type === 'session_started') {
          console.log('Session verified by server:', data);
        } else if (data.type === 'error') {
          console.error('Server IDR error:', data.message);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      sensorCollector.stop();
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      sensorCollector.stop();
    };
  }, [sessionId, updateState]);

  return ws;
}
