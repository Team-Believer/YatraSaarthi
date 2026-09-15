"""
YatraSaarthi IDR Engine - Map Matching

Road network matching using Shapely & NetworkX.
Confidence-aware: only applies road constraint when map confidence is high.

Uses a local road network graph representation. Initially empty.
Roads are loaded from GeoJSON or built from Mapbox API responses.
"""
import numpy as np
from typing import Optional, List, Tuple
from dataclasses import dataclass
from shapely.geometry import Point, LineString
from shapely.ops import nearest_points
import networkx as nx


@dataclass
class RoadSegment:
    """A single road segment in the local network."""
    id: str
    name: str
    geometry: LineString
    bearing: float  # degrees
    road_class: str = "secondary"


@dataclass 
class MatchResult:
    """Result of a map matching query."""
    matched_lat: float
    matched_lon: float
    raw_lat: float
    raw_lon: float
    road_name: Optional[str]
    road_bearing: Optional[float]
    distance_to_road: float  # meters
    confidence: float  # 0-1


class MapMatcher:
    """
    Confidence-aware map matcher using Shapely geometry operations.
    
    The road network is built from route geometry data.
    If no road network is loaded, map matching returns low-confidence results.
    """
    
    def __init__(self):
        self.road_segments: List[RoadSegment] = []
        self.road_graph = nx.DiGraph()
        
        # Matching parameters
        self._max_match_distance = 30.0  # meters - max distance to consider a road
        self._confidence_decay_distance = 15.0  # meters - distance for confidence decay
        self._heading_weight = 0.3  # Weight for heading consistency in confidence
        
        self.has_roads = False
    
    def load_route_geometry(self, coordinates: List[List[float]], road_name: str = "Route"):
        """
        Load road geometry from route coordinates [[lon, lat], ...].
        Used when a route is computed via Mapbox directions.
        """
        if len(coordinates) < 2:
            return
        
        for i in range(len(coordinates) - 1):
            start = coordinates[i]
            end = coordinates[i + 1]
            
            line = LineString([start, end])
            bearing = self._compute_bearing(start[1], start[0], end[1], end[0])
            
            segment = RoadSegment(
                id=f"seg_{i}",
                name=road_name,
                geometry=line,
                bearing=bearing
            )
            self.road_segments.append(segment)
            
            # Add to graph
            start_id = f"node_{i}"
            end_id = f"node_{i+1}"
            self.road_graph.add_edge(
                start_id, end_id,
                segment_id=segment.id,
                weight=line.length
            )
        
        self.has_roads = True
    
    def match(self, lat: float, lon: float, heading_deg: Optional[float] = None) -> MatchResult:
        """
        Find the best road match for a given position.
        
        Returns MatchResult with confidence score.
        If no roads loaded, returns low-confidence result at input position.
        """
        if not self.has_roads or not self.road_segments:
            return MatchResult(
                matched_lat=lat,
                matched_lon=lon,
                raw_lat=lat,
                raw_lon=lon,
                road_name=None,
                road_bearing=None,
                distance_to_road=float('inf'),
                confidence=0.0
            )
        
        point = Point(lon, lat)
        
        best_distance = float('inf')
        best_segment: Optional[RoadSegment] = None
        best_projected: Optional[Point] = None
        
        for segment in self.road_segments:
            dist = point.distance(segment.geometry)
            dist_meters = dist * 111319.5  # Approximate conversion at equator
            
            if dist_meters < best_distance:
                best_distance = dist_meters
                best_segment = segment
                nearest_on_road = segment.geometry.interpolate(
                    segment.geometry.project(point)
                )
                best_projected = nearest_on_road
        
        if best_segment is None or best_projected is None or best_distance > self._max_match_distance:
            return MatchResult(
                matched_lat=lat,
                matched_lon=lon,
                raw_lat=lat,
                raw_lon=lon,
                road_name=None,
                road_bearing=None,
                distance_to_road=best_distance if best_distance != float('inf') else -1,
                confidence=0.0
            )
        
        # Compute confidence
        distance_confidence = max(0, 1.0 - best_distance / self._confidence_decay_distance)
        
        heading_confidence = 1.0
        if heading_deg is not None and best_segment.bearing is not None:
            heading_diff = abs(heading_deg - best_segment.bearing)
            heading_diff = min(heading_diff, 360 - heading_diff)
            heading_confidence = max(0, 1.0 - heading_diff / 90.0)
        
        overall_confidence = (
            (1 - self._heading_weight) * distance_confidence +
            self._heading_weight * heading_confidence
        )
        
        return MatchResult(
            matched_lat=best_projected.y,
            matched_lon=best_projected.x,
            raw_lat=lat,
            raw_lon=lon,
            road_name=best_segment.name,
            road_bearing=best_segment.bearing,
            distance_to_road=best_distance,
            confidence=overall_confidence
        )
    
    def clear(self):
        """Clear all loaded road data."""
        self.road_segments = []
        self.road_graph = nx.DiGraph()
        self.has_roads = False
    
    @staticmethod
    def _compute_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Compute bearing between two points in degrees."""
        lat1_r, lon1_r = np.radians(lat1), np.radians(lon1)
        lat2_r, lon2_r = np.radians(lat2), np.radians(lon2)
        
        dlon = lon2_r - lon1_r
        x = np.sin(dlon) * np.cos(lat2_r)
        y = np.cos(lat1_r) * np.sin(lat2_r) - np.sin(lat1_r) * np.cos(lat2_r) * np.cos(dlon)
        
        bearing = np.degrees(np.arctan2(x, y))
        return bearing % 360
