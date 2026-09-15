import React, { useEffect, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ShieldAlert, Compass } from 'lucide-react';

// In a real app, use an env var
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA'; // Demo token

const LiveMap: React.FC = () => {
  const { state } = useNavigationStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // initialize map only once
    
    // Default to a generic location if no state is available
    const initLng = state.longitude || -74.006;
    const initLat = state.latitude || 40.7128;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [initLng, initLat],
      zoom: 15,
      pitch: 45,
    });

    const el = document.createElement('div');
    el.className = 'w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg';
    
    marker.current = new mapboxgl.Marker(el)
      .setLngLat([initLng, initLat])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update marker when state changes
  useEffect(() => {
    if (!map.current || !marker.current || state.latitude === 0) return;

    marker.current.setLngLat([state.longitude, state.latitude]);
    
    // Smoothly pan camera to follow
    map.current.easeTo({
      center: [state.longitude, state.latitude],
      bearing: state.heading_deg,
      duration: 1000 // match update rate roughly
    });
  }, [state.latitude, state.longitude, state.heading_deg]);

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 shadow-xl w-64 text-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">IDR Engine Live</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.gnss_available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {state.gnss_quality}
            </span>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mode</span>
              <span className="font-mono text-amber-400">{state.navigation_mode.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Position</span>
              <span className="font-mono">{state.latitude.toFixed(5)}, {state.longitude.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Speed</span>
              <span className="font-mono">{(state.speed * 3.6).toFixed(1)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Filter Conf</span>
              <span className="font-mono">{(state.position_confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Dynamic warning if degraded */}
        {(state.navigation_mode.includes('DEAD_RECKONING') || state.navigation_mode.includes('DEGRADING')) && (
          <div className="bg-amber-500/20 backdrop-blur-md p-3 rounded-xl border border-amber-500/50 shadow-xl flex items-center text-amber-300">
            <ShieldAlert className="w-5 h-5 mr-3 shrink-0" />
            <p className="text-xs font-medium">GNSS degraded. Dead reckoning active.</p>
          </div>
        )}
      </div>

      <div ref={mapContainer} className="flex-1 w-full bg-slate-900" />
      
      {/* Footer status bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-2 px-4 flex justify-between items-center text-xs text-slate-400">
        <div className="flex space-x-4">
          <span className="flex items-center"><Compass className="w-3 h-3 mr-1" /> {state.heading_deg.toFixed(0)}°</span>
          <span>Acc: {state.horizontal_accuracy.toFixed(1)}m</span>
        </div>
        <div>
          <span>ZUPT: {state.zupt_active ? 'ON' : 'OFF'}</span>
          <span className="mx-2">|</span>
          <span>NHC: {state.nhc_active ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
