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
