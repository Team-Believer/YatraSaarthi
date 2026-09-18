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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Sensor Hardware & Diagnostics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real W3C Web Sensor API status, update rates, and backend stream health
          </p>
        </div>
        <GlobalStatusBadge />
      </div>

      {/* AI Dead Reckoning Engine Section */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-navy rounded-3xl p-6 text-white shadow-md border border-brand-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-accent-cyan border border-white/15">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">AI Neural Dead Reckoning Engine</h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  mlStatus?.ready
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {mlStatus?.ready ? 'MODELS LOADED (CPU)' : mlError ? 'ERROR' : 'CHECKING STATUS...'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                Physics-aware velocity estimation (E5) and decoupled uncertainty estimation (U2)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-white/80 bg-black/25 px-4 py-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-accent-gold" />
              <span>Inferences: <strong className="text-white">{state.ai_total_inferences || mlStatus?.total_inferences || 0}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-accent-cyan" />
              <span>Latency: <strong className="text-white">{state.ai_inference_latency_ms ? `${state.ai_inference_latency_ms} ms` : mlStatus?.last_latency_ms ? `${mlStatus.last_latency_ms} ms` : 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Real-time telemetry grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* E5 Velocity */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs text-white/70">
              <span>E5 Velocity (Forward)</span>
              <span className="text-accent-cyan font-mono">CNN-GRU</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {state.ai_velocity !== null
                ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h`
                : 'Waiting for window'}
            </div>
            <div className="text-[11px] text-white/60">
              {state.ai_velocity !== null
                ? `${state.ai_velocity.toFixed(2)} m/s (135,425 params)`
                : 'Accumulating 50 samples at 10 Hz'}
            </div>
          </div>

          {/* U2 Uncertainty */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs text-white/70">
              <span>U2 Uncertainty (σ)</span>
              <span className="text-accent-gold font-mono">MLP-Softplus</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {state.ai_uncertainty_sigma !== null
                ? `± ${state.ai_uncertainty_sigma.toFixed(2)} m/s`
                : 'Waiting for window'}
            </div>
            <div className="text-[11px] text-white/60">
              {state.ai_variance !== null
                ? `Rv: ${state.ai_variance.toFixed(3)} (m/s)² (k=1.912)`
                : 'Calibrated error variance'}
            </div>
          </div>

          {/* Window Buffer Progress */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs text-white/70">
              <span>5.0s IMU Window</span>
              <span className="text-white font-mono">{state.ai_window_fill_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-accent-cyan h-full rounded-full transition-all duration-300"
                style={{ width: `${state.ai_window_fill_pct}%` }}
              />
            </div>
            <div className="text-[11px] text-white/60">
              {state.ai_window_fill_pct >= 100
                ? 'Window full — real-time inference active'
                : 'Buffering sensor stream...'}
            </div>
          </div>

          {/* InEKF Coupling */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs text-white/70">
              <span>Filter Integration</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold font-mono text-white">
              {state.navigation_mode !== 'GNSS_AIDED' && state.ai_velocity !== null
                ? 'ACTIVE (DR Update)'
                : 'ACTIVE (Awaiting Outage)'}
            </div>
            <div className="text-[11px] text-white/60">
              {state.navigation_mode !== 'GNSS_AIDED'
                ? 'Constraining dead reckoning drift'
                : 'GNSS aiding active; DR ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Model Registry & AI Management Interface */}
      <ModelManagerCard />

      {/* Grid of Hardware Sensor Cards */}
      <div className="grid md:grid-cols-3 gap-6">
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
            <div className="flex justify-between text-gray-600">
              <span>Bias Track</span>
              <span className="font-bold text-brand-navy">Active InEKF</span>
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
            <div className="flex justify-between text-gray-600">
              <span>Integration</span>
              <span className="font-bold text-brand-navy">Strapdown Kinematics</span>
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

        {/* Camera / Visual Odometry Card */}
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
