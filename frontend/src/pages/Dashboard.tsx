import { useState, useEffect } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useAuthStore } from '../stores/useAuthStore';
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
  Play,
  Square,
  Activity,
  Compass,
  Gauge,
  Navigation,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { navigationService } from '../services/api/navigationService';
import { ArchitectureOverview } from '../components/dashboard/ArchitectureOverview';

export default function Dashboard() {
  const { state, setSessionId } = useNavigationStore();
  const { user } = useAuthStore();
  const [isStarting, setIsStarting] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Hook into WebSocket stream for active session
  useNavigationWebSocket(state.session_id);

  // Use browser geolocation to set default camera center if state is inactive
  useEffect(() => {
    if ('geolocation' in navigator && state.latitude === 0) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        },
        (err) => console.warn('Geolocation initial center note:', err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [state.latitude]);

  const startSession = async () => {
    setIsStarting(true);
    try {
      const data = await navigationService.startSession(
        'CAR',
        state.latitude || userLocation?.[1] || 23.0225,
        state.longitude || userLocation?.[0] || 72.5714
      );
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
      await navigationService.stopSession(state.session_id);
      setSessionId(null);
    } catch (err: any) {
      console.error('Error stopping session', err);
    }
  };

  const activeLat = state.latitude || userLocation?.[1] || 23.0225;
  const activeLon = state.longitude || userLocation?.[0] || 72.5714;
  const isSessionActive = state.session_id !== null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Welcome / Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Welcome back, {user ? user.full_name : 'Driver'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Intelligent Dead Reckoning Navigation • Real Hardware Streaming
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlobalStatusBadge />
          {isSessionActive ? (
            <button
              onClick={stopSession}
              className="bg-status-danger hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Square className="w-4 h-4 fill-white" /> Stop Session
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={isStarting}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />{' '}
              {isStarting ? 'Initializing...' : 'Start Live Session'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: LARGE MAP on Left, Key Telemetry Metrics on Right */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch min-h-[520px]">
        {/* LARGE MAP CONTAINER (Occupies 2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-3 border border-brand-50 shadow-sm flex flex-col h-[520px] relative">
          <div className="flex justify-between items-center px-4 py-2 mb-2">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-brand-600" />
              <span className="font-bold text-sm text-brand-navy">Real-Time Navigation Canvas</span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {activeLat.toFixed(5)}, {activeLon.toFixed(5)}
            </span>
          </div>

          <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden min-h-[440px]">
            <MapContainer
              initialCenter={[activeLon, activeLat]}
              initialZoom={16}
              className="w-full h-full"
            >
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
                fusedTrack={
                  state.latitude !== 0 ? [[state.longitude, state.latitude]] : []
                }
              />
              <MapControls
                onRecenter={() => {
                  /* MapController auto-centers */
                }}
              />
            </MapContainer>
          </div>
        </div>

        {/* METRICS & SYSTEM STATE SIDE PANEL (1 Column) */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Speed Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-brand-600" /> Vehicle Speed
              </div>
              <div className="text-3xl font-bold text-brand-navy">
                {(state.speed * 3.6).toFixed(1)}{' '}
                <span className="text-sm font-medium text-gray-500">km/h</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-bold text-sm">
              {(state.speed * 3.6).toFixed(0)}
            </div>
          </div>

          {/* Heading Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-600" /> Heading Bearing
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {state.heading_deg.toFixed(0)}°{' '}
                <span className="text-xs font-medium text-gray-500">
                  ({(state.heading_confidence * 100).toFixed(0)}% conf)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          {/* Accuracy Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-600" /> Position Accuracy
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                ± {state.horizontal_accuracy.toFixed(1)}{' '}
                <span className="text-xs font-medium text-gray-500">meters</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
              <ShieldCheck className="w-5 h-5 text-status-success" />
            </div>
          </div>

          {/* Navigation Filter State */}
          <div className="bg-brand-navy rounded-3xl p-5 text-white shadow-xl flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-brand-100 uppercase tracking-wider">
                  InEKF IDR Status
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    state.navigation_mode.includes('DEAD_RECKONING')
                      ? 'bg-status-warning/20 text-status-warning border border-status-warning/30'
                      : 'bg-status-success/20 text-status-success border border-status-success/30'
                  }`}
                >
                  {state.navigation_mode}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-brand-100">Zero-Velocity (ZUPT)</span>
                  <span className="font-semibold text-white">
                    {state.zupt_active ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-brand-100">Non-Holonomic (NHC)</span>
                  <span className="font-semibold text-status-success">
                    {state.nhc_active ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-100">InEKF Confidence</span>
                  <span className="font-bold text-white">
                    {(state.position_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {state.navigation_mode.includes('DEAD_RECKONING') && (
              <div className="mt-4 p-3 bg-status-warning/20 rounded-2xl border border-status-warning/30 text-[11px] text-status-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>GNSS unavailable. Inertial dead reckoning active.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conceptual Explanation & Technical Architecture Section */}
      <ArchitectureOverview />
    </div>
  );
}
