"""
YatraSaarthi - WebSocket Session Manager

Manages bidirectional WebSocket connections:
- Receives raw sensor data from frontend
- Feeds to NavigationSessionEngine 
- Broadcasts fused navigation state back to frontend

One engine instance per active session.
No fake data injection at any point.
"""
import json
import time
import asyncio
import uuid
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.services.navigation_engine import NavigationSessionEngine
from app.idr.enums import SensorStatus


class ActiveSession:
    """Holds the state for a single active WebSocket session."""
    def __init__(self, session_id: str, websocket: WebSocket, vehicle_type: str = "CAR"):
        self.session_id = session_id
        self.websocket = websocket
        self.engine = NavigationSessionEngine(session_id, vehicle_type)
        self.connected = True
        self.last_activity = time.time()
        self.packets_received = 0
        self.packets_sent = 0


class WebSocketManager:
    """
    Manages all active WebSocket navigation sessions.
    In-process (no Redis). Designed for single-server deployment.
    """
    
    def __init__(self):
        self._sessions: Dict[str, ActiveSession] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str, 
                      vehicle_type: str = "CAR") -> ActiveSession:
        """Accept a WebSocket connection and create navigation session."""
        await websocket.accept()
        
        # If session_id is 'new', generate one
        if session_id == "new":
            session_id = str(uuid.uuid4())
        
        session = ActiveSession(session_id, websocket, vehicle_type)
        self._sessions[session_id] = session
        
        # Send session confirmation
        await websocket.send_json({
            "type": "session_started",
            "session_id": session_id,
            "message": "Navigation session active. Send sensor data.",
            "expected_packet_format": {
                "type": "gnss|imu|orientation|combined",
                "timestamp": "unix_seconds",
                "latitude": "float (gnss)",
                "longitude": "float (gnss)",
                "accel_x": "float (imu, m/s²)",
                "gyro_x": "float (imu, rad/s)",
                "alpha": "float (orientation, degrees)",
            }
        })
        
        return session
    
    def disconnect(self, session_id: str):
        """Clean up a disconnected session."""
        if session_id in self._sessions:
            self._sessions[session_id].connected = False
            del self._sessions[session_id]
    
    async def handle_session(self, session: ActiveSession):
        """
        Main WebSocket loop for a session.
        Receives sensor packets, processes through IDR engine,
        broadcasts navigation state back.
        """
        try:
            while session.connected:
                # Receive sensor data from frontend
                raw = await session.websocket.receive_text()
                
                try:
                    packet = json.loads(raw)
                except json.JSONDecodeError:
                    await session.websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON packet"
                    })
                    continue
                
                session.packets_received += 1
                session.last_activity = time.time()
                
                # Validate packet has required fields
                if "type" not in packet:
                    continue
                
                # Process through IDR engine
                try:
                    nav_state = session.engine.process_sensor_packet(packet)
                except Exception as e:
                    await session.websocket.send_json({
                        "type": "error",
                        "message": f"Engine error: {str(e)}"
                    })
                    continue
                
                # Add metadata to outgoing state
                nav_state["type"] = "navigation_state"
                nav_state["session_id"] = session.session_id
                nav_state["sensor_states"] = session.engine.sensor_states
                nav_state["packets_received"] = session.packets_received
                
                # Broadcast fused state back
                await session.websocket.send_json(nav_state)
                session.packets_sent += 1
                
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"[WS] Session {session.session_id} error: {e}")
        finally:
            self.disconnect(session.session_id)
    
    def get_session(self, session_id: str) -> Optional[ActiveSession]:
        return self._sessions.get(session_id)
    
    def get_active_sessions(self) -> list:
        return [
            {
                "session_id": s.session_id,
                "connected": s.connected,
                "packets_received": s.packets_received,
                "packets_sent": s.packets_sent,
                "last_activity": s.last_activity,
            }
            for s in self._sessions.values()
        ]
    
    def get_diagnostics(self, session_id: str) -> Optional[dict]:
        session = self._sessions.get(session_id)
        if session:
            return session.engine.get_diagnostics()
        return None


# Singleton instance
ws_manager = WebSocketManager()
