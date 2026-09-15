import { useState, useEffect } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useNavigationWebSocket } from '../hooks/useNavigationWebSocket';
import {
  MapContainer,
  MapController,
  VehicleMarker,
  TrajectoryLayer,
  MapControls,
} from '../components/map';
import { GlobalStatusBadge } from '../components/common/GlobalStatusBadge';
import {
  ShieldAlert,
  Play,
  Square,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';

export default function LiveMap() {
  const { state, setSessionId } = useNavigationStore();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Hook into live WebSocket telemetry
  useNavigationWebSocket(state.session_id);

  // Default browser location fallback if inactive
  useEffect(() => {
    if ('geolocation' in navigator && state.latitude === 0) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
        (err) => console.warn('Geo init:', err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [state.latitude]);

  const activeLat = state.latitude || userLocation?.[1] || 23.0225;
  const activeLon = state.longitude || userLocation?.[0] || 72.5714;
  const isSessionActive = state.session_id !== null;

  const startSession = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/v1/navigation/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_type: 'CAR', start_lat: activeLat, start_lon: activeLon }),
      });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (err: any) {
      alert(err.message || 'Error starting session');
    } finally {
      setIsStarting(false);
    }
  };

  const stopSession = async () => {
    if (!state.session_id) return;
    try {
      await fetch('/api/v1/navigation/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: state.session_id }),
      });
      setSessionId(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] w-full relative flex flex-col rounded-3xl overflow-hidden shadow-sm border border-brand-50 bg-white">
      {/* MAP CANVAS (MAP-FIRST: 80%+ Viewport) */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer initialCenter={[activeLon, activeLat]} initialZoom={16} className="w-full h-full">
          <MapController
            latitude={activeLat}
            longitude={activeLon}
            heading={state.heading_deg}
            followVehicle={isSessionActive}
          />
          <VehicleMarker
            latitude={activeLat}
            longitude={activeLon}
            heading={state.heading_deg}
            mode={state.navigation_mode}
          />
          <TrajectoryLayer
            fusedTrack={state.latitude !== 0 ? [[state.longitude, state.latitude]] : []}
          />
          <MapControls />
        </MapContainer>

        {/* TOP NAVIGATION INSTRUCTION OVERLAY */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto z-10 md:w-96">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-brand-100 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                {isSessionActive ? 'Active Navigation' : 'Standby Mode'}
              </span>
              <h3 className="font-bold text-brand-navy text-sm truncate">
                {isSessionActive ? 'Following InEKF Fused Trajectory' : 'Ready to Start Session'}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {isSessionActive ? 'Keep moving along nominal path' : 'Click start to stream real 6-DoF telemetry'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT TELEMETRY OVERLAY CARD */}
        <div className="absolute top-4 right-4 z-10 hidden md:block w-72">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-brand-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-brand-navy">Live Telemetry</span>
              <GlobalStatusBadge />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Speed</span>
                <span className="font-bold text-brand-navy">{(state.speed * 3.6).toFixed(1)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Heading</span>
                <span className="font-bold text-brand-navy">{state.heading_deg.toFixed(0)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Accuracy</span>
                <span className="font-bold text-status-success">± {state.horizontal_accuracy.toFixed(1)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">InEKF Conf</span>
                <span className="font-bold text-brand-600">{(state.position_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="font-bold text-status-warning truncate max-w-[120px]">{state.navigation_mode}</span>
              </div>
            </div>

            {state.navigation_mode.includes('DEAD_RECKONING') && (
              <div className="p-3 bg-status-warning/10 rounded-2xl border border-status-warning/20 text-[11px] text-status-warning flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>GNSS Degraded. Inertial Dead Reckoning Active.</span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM TRIP CONTROL BAR */}
        <div className="absolute bottom-4 left-4 right-4 md:left-24 md:right-24 z-10">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-brand-100 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-navy">Current Position</div>
                <div className="text-[11px] font-mono text-gray-500">
                  {activeLat.toFixed(5)}, {activeLon.toFixed(5)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSessionActive ? (
                <button
                  onClick={stopSession}
                  className="bg-status-danger hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Square className="w-4 h-4 fill-white" /> Stop Navigation Session
                </button>
              ) : (
                <button
                  onClick={startSession}
                  disabled={isStarting}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isStarting ? 'Starting...' : 'Start Live Navigation Session'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
