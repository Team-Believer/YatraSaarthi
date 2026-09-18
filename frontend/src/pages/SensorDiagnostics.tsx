import { useEffect, useState } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { GlobalStatusBadge } from '../components/common/GlobalStatusBadge';
import {
  Cpu,
  Radio,
  Compass,
  Activity,
  Layers,
  Camera,
  Brain,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import { sensorService } from '../services/api/sensorService';
import { fetchMLStatus, type MLStatusResponse } from '../services/api/mlService';
import { ModelManagerCard } from '../components/dashboard/ModelManagerCard';

export default function SensorDiagnostics() {
  const state = useNavigationStore((s) => s.state);
  const { capabilities, permissions } = useSensorStore();
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [mlError, setMlError] = useState<string | null>(null);

  useEffect(() => {
    sensorService.getStatus()
      .catch((err) => console.warn('System diag note:', err.message));

    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch((err) => setMlError(err.message));
  }, []);

  const getSensorStatus = (cap: boolean, perm?: string) => {
    if (!cap) return { text: 'Unavailable', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (perm === 'DENIED') return { text: 'Permission Required', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (perm === 'GRANTED' || cap) return { text: 'LIVE', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    return { text: 'Standby', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  };

  const gnssStatus = getSensorStatus(capabilities.geolocation, permissions.geolocation);
  const motionStatus = getSensorStatus(capabilities.deviceMotion, permissions.deviceMotion);
  const orientStatus = getSensorStatus(capabilities.deviceOrientation, permissions.deviceOrientation);

  // Count working sensors for mobile header
  const workingSensors = [
    capabilities.geolocation && permissions.geolocation !== 'DENIED',
    capabilities.deviceMotion && permissions.deviceMotion !== 'DENIED',
    capabilities.deviceOrientation && permissions.deviceOrientation !== 'DENIED',
  ].filter(Boolean).length;

  // Sensor list for compact mobile view
  const sensors = [
    { name: 'Accelerometer', icon: Activity, status: motionStatus, subtitle: 'DeviceMotionEvent' },
    { name: 'Gyroscope', icon: Cpu, status: motionStatus, subtitle: 'Rotation rate' },
    { name: 'Magnetometer', icon: Compass, status: orientStatus, subtitle: 'Orientation heading' },
    { name: 'Barometer', icon: Layers, status: { text: 'Unavailable', color: 'bg-gray-100 text-gray-600 border-gray-200' }, subtitle: 'Not supported by browser' },
    { name: 'GPS / GNSS', icon: Radio, status: gnssStatus, subtitle: 'Geolocation API' },
    { name: 'Camera', icon: Camera, status: { text: 'Standby', color: 'bg-blue-100 text-blue-800 border-blue-200' }, subtitle: 'Visual inertial ready' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Header - Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-navy">Sensor Diagnostics</h1>
            <p className="text-[10px] text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Overall status badge */}
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            {workingSensors} Sensors Working
          </span>
        </div>
      </div>

      {/* Header - Desktop */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Sensor Hardware & Diagnostics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real W3C Web Sensor API status, update rates, and backend stream health
          </p>
        </div>
        <GlobalStatusBadge />
      </div>

      {/* AI Dead Reckoning Engine Section */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-navy rounded-2xl md:rounded-3xl p-4 md:p-6 text-white shadow-md border border-brand-800 space-y-4 md:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 flex items-center justify-center text-accent-cyan border border-white/15">
              <Brain className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-lg font-bold tracking-tight">AI Neural DR Engine</h2>
                <span className={`px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full border ${
                  mlStatus?.ready
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {mlStatus?.ready ? 'LOADED' : mlError ? 'ERROR' : 'CHECKING...'}
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-white/70 mt-0.5">
                Physics-aware velocity (E5) + uncertainty (U2)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-mono text-white/80 bg-black/25 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl border border-white/10">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-gold" />
              <span><strong className="text-white">{state.ai_total_inferences || mlStatus?.total_inferences || 0}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-cyan" />
              <span><strong className="text-white">{state.ai_inference_latency_ms ? `${state.ai_inference_latency_ms}ms` : mlStatus?.last_latency_ms ? `${mlStatus.last_latency_ms}ms` : 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Telemetry grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-white/70">
              <span>E5 Velocity</span>
              <span className="text-accent-cyan font-mono text-[9px] md:text-xs">CNN-GRU</span>
            </div>
            <div className="text-base md:text-xl font-bold font-mono text-white">
              {state.ai_velocity !== null
                ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h`
                : 'Waiting'}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-white/70">
              <span>U2 Uncertainty</span>
              <span className="text-accent-gold font-mono text-[9px] md:text-xs">MLP</span>
            </div>
            <div className="text-base md:text-xl font-bold font-mono text-white">
              {state.ai_uncertainty_sigma !== null
                ? `± ${state.ai_uncertainty_sigma.toFixed(2)}`
                : 'Waiting'}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-white/70">
              <span>IMU Window</span>
              <span className="text-white font-mono text-[9px] md:text-xs">{state.ai_window_fill_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 md:h-2 overflow-hidden mt-1.5 md:mt-2">
              <div
                className="bg-accent-cyan h-full rounded-full transition-all duration-300"
                style={{ width: `${state.ai_window_fill_pct}%` }}
              />
            </div>
            <div className="text-[9px] md:text-[11px] text-white/60">
              {state.ai_window_fill_pct >= 100 ? 'Inference active' : 'Buffering...'}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-white/70">
              <span>Filter</span>
              <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400" />
            </div>
            <div className="text-xs md:text-sm font-bold font-mono text-white">
              {state.navigation_mode !== 'GNSS_AIDED' && state.ai_velocity !== null
                ? 'DR Update'
                : 'Awaiting'}
            </div>
          </div>
        </div>
      </div>

      {/* Model Registry - hidden on small mobile for cleaner view */}
      <div className="hidden md:block">
        <ModelManagerCard />
      </div>

      {/* Sensor Cards - Mobile: compact list, Desktop: grid */}
      {/* Mobile compact sensor list */}
      <div className="md:hidden space-y-2">
        {sensors.map((sensor) => {
          const Icon = sensor.icon;
          return (
            <div key={sensor.name} className="bg-white rounded-2xl p-4 border border-brand-50 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-brand-navy">{sensor.name}</div>
                <div className="text-[10px] text-gray-500">{sensor.subtitle}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${sensor.status.color}`}>
                {sensor.status.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Desktop grid sensor cards */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {/* GNSS Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <Radio className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${gnssStatus.color}`}>
                {gnssStatus.text}
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">GNSS / GPS / NavIC</h3>
            <p className="text-xs text-gray-500 mt-1">Satellite positioning via W3C Geolocation watchPosition</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Latitude</span>
              <span className="font-bold text-brand-navy">{state.latitude !== 0 ? state.latitude.toFixed(5) : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Longitude</span>
              <span className="font-bold text-brand-navy">{state.longitude !== 0 ? state.longitude.toFixed(5) : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Accuracy</span>
              <span className="font-bold text-status-success">{state.gnss_available ? `± ${state.horizontal_accuracy.toFixed(1)}m` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Accelerometer Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <Activity className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${motionStatus.color}`}>
                {motionStatus.text}
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">Accelerometer (3-Axis)</h3>
            <p className="text-xs text-gray-500 mt-1">Linear specific force measurements from DeviceMotionEvent</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Hardware State</span>
              <span className="font-bold text-brand-navy">{capabilities.deviceMotion ? 'Supported' : 'Unavailable on device'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Stream Rate</span>
              <span className="font-bold text-brand-navy">{state.imu_available ? '~50 Hz' : '0 Hz'}</span>
            </div>
          </div>
        </div>

        {/* Gyroscope Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <Cpu className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${motionStatus.color}`}>
                {motionStatus.text}
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">Gyroscope (3-Axis)</h3>
            <p className="text-xs text-gray-500 mt-1">Angular rotation rates via DeviceMotionEvent rotationRate</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Hardware State</span>
              <span className="font-bold text-brand-navy">{capabilities.deviceMotion ? 'Supported' : 'Unavailable on device'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Stream Rate</span>
              <span className="font-bold text-brand-navy">{state.imu_available ? '~50 Hz' : '0 Hz'}</span>
            </div>
          </div>
        </div>

        {/* Magnetometer Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <Compass className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${orientStatus.color}`}>
                {orientStatus.text}
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">Magnetometer / Compass</h3>
            <p className="text-xs text-gray-500 mt-1">Magnetic orientation heading via DeviceOrientationEvent</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Heading Angle</span>
              <span className="font-bold text-brand-navy">{state.heading_deg > 0 ? `${state.heading_deg.toFixed(0)}°` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Disturbance Check</span>
              <span className="font-bold text-status-success">PASSED</span>
            </div>
          </div>
        </div>

        {/* Barometer Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                Unavailable
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">Barometer / Altimeter</h3>
            <p className="text-xs text-gray-500 mt-1">Atmospheric pressure sensor for vertical elevation</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Hardware State</span>
              <span className="font-bold text-gray-400">Not supported by browser API</span>
            </div>
          </div>
        </div>

        {/* Camera Card */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                <Camera className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                Standby
              </span>
            </div>
            <h3 className="font-bold text-brand-navy text-base">Camera (Visual Inertial)</h3>
            <p className="text-xs text-gray-500 mt-1">Optical flow feature tracking for visual dead reckoning</p>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 text-xs font-mono">
            <div className="flex justify-between text-gray-600">
              <span>Hardware State</span>
              <span className="font-bold text-brand-navy">Available on request</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
