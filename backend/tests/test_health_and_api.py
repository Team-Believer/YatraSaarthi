from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"

def test_sensor_status():
    response = client.get("/api/v1/sensors/status")
    assert response.status_code == 200
    assert response.json()["status"] == "LIVE"

def test_idr_state():
    response = client.get("/api/v1/idr/state")
    assert response.status_code == 200
    assert "engine" in response.json()

def test_routes_api():
    response = client.get("/api/v1/routes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_navigation_session_create():
    response = client.post("/api/v1/navigation/session", json={"vehicle_type": "CAR"})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["is_active"] == True

def test_navigation_session_end_and_idempotent():
    # 1. Create session
    create_res = client.post("/api/v1/navigation/session", json={"vehicle_type": "CAR"})
    assert create_res.status_code == 200
    session_id = create_res.json()["session_id"]
    
    # 2. End session using POST /session/{session_id}/end
    end_res = client.post(f"/api/v1/navigation/session/{session_id}/end")
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["session_id"] == session_id
    assert end_data["status"] == "COMPLETED"
    assert end_data["ended_at"] is not None
    
    # 3. Test idempotency: calling end again should succeed safely without error
    end_again_res = client.post(f"/api/v1/navigation/session/{session_id}/end")
    assert end_again_res.status_code == 200
    assert end_again_res.json()["status"] == "COMPLETED"
    
    # 4. Check that History API shows the completed session
    history_res = client.get("/api/v1/history/sessions")
    assert history_res.status_code == 200
    sessions = history_res.json()
    assert any(s["session_id"] == session_id for s in sessions)
