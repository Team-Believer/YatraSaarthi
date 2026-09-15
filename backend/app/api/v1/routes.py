"""
YatraSaarthi API v1 - Routes Router
Provides route calculation, Mapbox Directions proxy, and local route storage.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import get_db
from app.models.models import Route

router = APIRouter(prefix="/routes", tags=["Routes"])


class RoutePoint(BaseModel):
    latitude: float
    longitude: float


class RouteCreateRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float
    vehicle_type: Optional[str] = "CAR"


class RouteResponse(BaseModel):
    id: str
    origin_lat: float
    origin_lon: float
    destination_lat: float
    destination_lon: float
    distance_meters: float
    duration_seconds: float
    geometry_coords: List[List[float]]


@router.get("", response_model=List[RouteResponse])
@router.get("/", response_model=List[RouteResponse])
def get_routes(limit: int = 10, db: Session = Depends(get_db)):
    """Get calculated routes."""
    routes = db.query(Route).order_by(Route.created_at.desc()).limit(limit).all()
    return [
        RouteResponse(
            id=r.id,
            origin_lat=r.origin_lat,
            origin_lon=r.origin_lon,
            destination_lat=r.destination_lat,
            destination_lon=r.destination_lon,
            distance_meters=r.distance_meters,
            duration_seconds=r.duration_seconds,
            geometry_coords=r.geometry_coords or []
        )
        for r in routes
    ]


@router.post("", response_model=RouteResponse)
@router.post("/", response_model=RouteResponse)
def create_route(data: RouteCreateRequest, db: Session = Depends(get_db)):
    """Calculate and save a new route."""
    import uuid, math
    
    # Calculate straight-line approximate distance in meters
    d_lat = math.radians(data.destination_lat - data.origin_lat)
    d_lon = math.radians(data.destination_lon - data.origin_lon)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(data.origin_lat)) * math.cos(math.radians(data.destination_lat)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist = 6371000.0 * c
    
    # Approx duration assuming 50 km/h (13.88 m/s)
    duration = dist / 13.88 if dist > 0 else 0
    
    route_id = str(uuid.uuid4())
    geometry = [
        [data.origin_lon, data.origin_lat],
        [data.destination_lon, data.destination_lat]
    ]
    
    route = Route(
        id=route_id,
        origin_lat=data.origin_lat,
        origin_lon=data.origin_lon,
        destination_lat=data.destination_lat,
        destination_lon=data.destination_lon,
        distance_meters=dist,
        duration_seconds=duration,
        geometry_coords=geometry
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    
    return RouteResponse(
        id=route.id,
        origin_lat=route.origin_lat,
        origin_lon=route.origin_lon,
        destination_lat=route.destination_lat,
        destination_lon=route.destination_lon,
        distance_meters=route.distance_meters,
        duration_seconds=route.duration_seconds,
        geometry_coords=route.geometry_coords or []
    )
