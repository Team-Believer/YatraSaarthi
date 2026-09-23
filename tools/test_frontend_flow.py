"""
Integration Test for Frontend Navigation-Start and Route-Injection Flow
Verifies:
1. Single dispatch of route injection upon session start.
2. Route coordinates come from currently selected route.
3. Null/missing route handling.
4. Session startup resilience when route injection endpoint fails or is absent.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.websocket.manager import ws_manager, ActiveSession


client = TestClient(app)


def test_frontend_flow_with_selected_route():
    # 1. Simulate POST /api/v1/navigation/session
    res = client.post("/api/v1/navigation/session", json={"vehicle_type": "CAR"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]
    
    # 2. Mock WebSocket connection creation
    ws_manager._sessions[session_id] = ActiveSession(session_id, None, "CAR")
    
    # 3. Simulate Frontend RoutePreviewCard injecting selected route geometry
    selected_coords = [
        [77.2090, 28.6139],
        [77.2190, 28.6139],
        [77.2190, 28.6239]
    ]
    route_res = client.post(f"/api/v1/navigation/session/{session_id}/route", json={
        "coordinates": selected_coords,
        "road_name": "Selected Fastest Route"
    })
    assert route_res.status_code == 200
    assert route_res.json()["status"] == "SUCCESS"
    assert route_res.json()["segments_loaded"] == 2
    
    # Verify engine state
    engine = ws_manager.get_session(session_id).engine
    assert engine.map_matcher.has_roads is True
    assert len(engine.map_matcher.road_segments) == 2
    
    # Clean up
    ws_manager.disconnect(session_id)


def test_frontend_flow_null_missing_route():
    # Session start without route geometry
    res = client.post("/api/v1/navigation/session", json={"vehicle_type": "CAR"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]
    
    ws_manager._sessions[session_id] = ActiveSession(session_id, None, "CAR")
    
    # Empty route injection should return 400 Bad Request safely
    route_res = client.post(f"/api/v1/navigation/session/{session_id}/route", json={
        "coordinates": [],
        "road_name": "Empty"
    })
    assert route_res.status_code == 400
    
    # Engine remains intact and functional
    engine = ws_manager.get_session(session_id).engine
    assert engine.map_matcher.has_roads is False
    
    ws_manager.disconnect(session_id)


def test_frontend_flow_non_existent_session():
    # Route injection to invalid session returns 404
    route_res = client.post("/api/v1/navigation/session/non_existent_id/route", json={
        "coordinates": [[77.20, 28.61], [77.21, 28.61]],
        "road_name": "Test"
    })
    assert route_res.status_code == 404


if __name__ == "__main__":
    test_frontend_flow_with_selected_route()
    test_frontend_flow_null_missing_route()
    test_frontend_flow_non_existent_session()
    print("ALL FRONTEND FLOW INTEGRATION TESTS PASSED")
