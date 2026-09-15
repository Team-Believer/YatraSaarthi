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


import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


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
        
        # Real trajectory & distance tracking
        self.points: list = []
        self.total_distance_m: float = 0.0
        self.start_lat: Optional[float] = None
        self.start_lon: Optional[float] = None
        self.end_lat: Optional[float] = None
        self.end_lon: Optional[float] = None
        self.last_point_time: float = 0.0


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
                
                # Accumulate real trajectory and distance
                lat = nav_state.get("latitude")
                lon = nav_state.get("longitude")
                if lat is not None and lon is not None and (lat != 0.0 or lon != 0.0):
                    if session.start_lat is None:
                        session.start_lat = lat
                        session.start_lon = lon
                    
                    dist_delta = 0.0
                    if session.end_lat is not None and session.end_lon is not None:
                        dist_delta = haversine_distance(session.end_lat, session.end_lon, lat, lon)
                        # Filter GPS noise / stationary jitter under 0.3m
                        if dist_delta > 0.3:
                            session.total_distance_m += dist_delta
                    
                    session.end_lat = lat
                    session.end_lon = lon
                    
                    now = time.time()
                    if now - session.last_point_time >= 1.0 or dist_delta > 2.0:
                        session.last_point_time = now
                        session.points.append({
                            "latitude": lat,
                            "longitude": lon,
                            "altitude": nav_state.get("altitude"),
                            "speed": nav_state.get("speed", 0.0),
                            "heading": nav_state.get("heading_deg", 0.0),
                            "horizontal_accuracy": nav_state.get("horizontal_accuracy", 0.0),
                            "position_confidence": nav_state.get("position_confidence", 1.0),
                            "navigation_mode": nav_state.get("navigation_mode", "GNSS_AIDED"),
                            "timestamp": now,
                        })
                
                # Add metadata to outgoing state
                nav_state["type"] = "navigation_state"
                nav_state["session_id"] = session.session_id
                nav_state["sensor_states"] = session.engine.sensor_states
                nav_state["packets_received"] = session.packets_received
                nav_state["total_distance_m"] = round(session.total_distance_m, 1)
                
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
    
    def get_session_summary(self, session_id: str) -> Optional[dict]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return {
            "session_id": session.session_id,
            "distance_m": round(session.total_distance_m, 1) if session.total_distance_m > 0 else None,
            "start_lat": session.start_lat,
            "start_lon": session.start_lon,
            "end_lat": session.end_lat,
            "end_lon": session.end_lon,
            "points": session.points,
        }
    
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
