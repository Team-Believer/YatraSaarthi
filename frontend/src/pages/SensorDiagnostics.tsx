import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { NavStatusPill } from '../components/navigation/NavStatusPill';
import { ConfidenceIndicator } from '../components/navigation/ConfidenceIndicator';
import { ModelManagerCard } from '../components/dashboard/ModelManagerCard';
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
  Gauge,
  Copy,
  Check,
  Sliders,
  Terminal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { sensorService } from '../services/api/sensorService';
import { fetchMLStatus, type MLStatusResponse } from '../services/api/mlService';

interface StateTimelineEvent {
  id: string;
  timestamp: string;
  mode: string;
  category: string;
  details: string;
}

export default function SensorDiagnostics() {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const websocketStatus = useNavigationStore((s) => s.websocketStatus);
  const state = useNavigationStore((s) => s.state);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const { capabilities, permissions } = useSensorStore();
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);

  // Real-time timeline log of observed state transitions
  const [timeline, setTimeline] = useState<StateTimelineEvent[]>([]);
  const prevModeRef = useRef<string>(state.navigation_mode);

  useEffect(() => {
    sensorService.getStatus().catch(() => {});
    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch(() => {});
  }, []);

  // Track state transitions into the timeline
  useEffect(() => {
    const currentMode = state.navigation_mode;
    if (currentMode && currentMode !== prevModeRef.current) {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      let category = 'GNSS';
      let details = 'Operating in GNSS satellite navigation mode';

      if (currentMode.includes('DEAD_RECKONING') || currentMode.includes('LOST')) {
        category = 'DEAD RECKONING';
        details = 'InEKF inertial dead reckoning active with vehicle constraints';
      } else if (currentMode.includes('REACQUISITION') || currentMode.includes('RECOVERY')) {
        category = 'RECOVERY';
        details = 'GNSS signals detected, validating positional consistency';
      } else if (currentMode.includes('DEGRADING')) {
        category = 'DEGRADED';
        details = 'GNSS signal quality reduced, inertial aiding active';
      }

      setTimeline((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: timeStr,
          mode: currentMode,
          category,
          details,
        },
        ...prev.slice(0, 19), // Keep last 20 events
      ]);
      prevModeRef.current = currentMode;
    }
  }, [state.navigation_mode]);

  // Initial timeline entry if empty
  useEffect(() => {
    if (timeline.length === 0) {
      setTimeline([
        {
          id: 'init-1',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          mode: state.navigation_mode || 'STANDBY',
          category: 'INITIALIZATION',
          details: 'Telemetry stream initialized. InEKF navigation engine ready.',
        },
      ]);
    }
  }, []);

  const handleCopySnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      isLive,
      sessionStatus,
      websocketStatus,
      navigationState: state,
      fusedPosition,
    };
    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2500);
  };

  const formatOutage = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSensorStatus = (cap: boolean, perm?: string) => {
    if (!cap) return { text: 'Unavailable', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (perm === 'DENIED') return { text: 'Permission Required', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (perm === 'GRANTED' || cap) return { text: 'LIVE', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    return { text: 'Standby', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  };

  const gnssStatus = getSensorStatus(capabilities.geolocation, permissions.geolocation);
  const motionStatus = getSensorStatus(capabilities.deviceMotion, permissions.deviceMotion);
  const orientStatus = getSensorStatus(capabilities.deviceOrientation, permissions.deviceOrientation);

  const hardwareSensors = [
    { name: 'Accelerometer (3-Axis)', icon: Activity, status: motionStatus, subtitle: 'DeviceMotionEvent linear acceleration (~50 Hz)' },
    { name: 'Gyroscope (3-Axis)', icon: Cpu, status: motionStatus, subtitle: 'Rotation rate rad/s around body frame' },
    { name: 'Magnetometer / Compass', icon: Compass, status: orientStatus, subtitle: 'Magnetic heading orientation angle' },
    { name: 'GNSS Constellation Lock', icon: Radio, status: gnssStatus, subtitle: 'Satellite positioning & horizontal accuracy' },
    { name: 'Barometer / Altimeter', icon: Layers, status: { text: 'Unavailable', color: 'bg-gray-100 text-gray-600 border-gray-200' }, subtitle: 'Atmospheric pressure (Not exposed by browser)' },
    { name: 'Camera (Visual Inertial)', icon: Camera, status: { text: 'Standby', color: 'bg-blue-100 text-blue-800 border-blue-200' }, subtitle: 'Optical feature tracking for visual DR' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300 pb-28 md:pb-12 select-none">
      {/* TOP HEADER & TELEMETRY TOOLBAR */}
      <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400 shrink-0">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Engineering Diagnostics & AI Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-brand-400 border border-slate-700">
                v2.4 InEKF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time Invariant EKF state vector, neural motion intelligence, and multi-sensor diagnostics
            </p>
          </div>
        </div>

        {/* Telemetry Actions Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <NavStatusPill alwaysVisible showSecondary showChevron showDrawerOnClick />
          <ConfidenceIndicator alwaysVisible showAccuracy />

          {/* Copy Telemetry Snapshot Button */}
          <button
            type="button"
            onClick={handleCopySnapshot}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all press-scale cursor-pointer"
            title="Copy current telemetry state as JSON"
          >
            {copiedSnapshot ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied JSON</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Snapshot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: PRIMARY NAVIGATION STATE & FUSION HERO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Navigation Engine Mode */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation Mode
            </span>
            <span
              className={clsx(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                state.navigation_mode.includes('DEAD_RECKONING')
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : state.navigation_mode.includes('RECOVERY')
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              )}
            >
              {isLive ? 'LIVE STREAM' : 'STANDBY'}
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold font-mono text-slate-900 truncate">
              {state.navigation_mode}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {state.gnss_available ? 'GNSS Constellation Lock' : 'Inertial Dead Reckoning Active'}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Outage Duration</span>
            <span className="font-mono font-bold text-slate-900">
              {state.gnss_outage_duration > 0 ? formatOutage(state.gnss_outage_duration) : '00:00 (No Outage)'}
            </span>
          </div>
        </div>

        {/* Card 2: Confidence & Uncertainty */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Position Confidence
            </span>
            <ShieldCheck className="w-4 h-4 text-brand-600" />
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {state.position_confidence > 0 ? `${Math.round(state.position_confidence * 100)}%` : 'Unavailable'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Est. Accuracy: <strong className="text-slate-900">±{state.horizontal_accuracy.toFixed(1)}m</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Innovation Norm</span>
            <span className="font-mono font-bold text-slate-900">
              {state.innovation_norm.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Card 3: Environment State */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Environment State
            </span>
            <Layers className="w-4 h-4 text-brand-600" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 capitalize truncate">
              {state.environment_state.replace(/_/g, ' ').toLowerCase()}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Alignment: <strong className="text-slate-900">{state.alignment_status.replace(/_/g, ' ')}</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Covariance Trace</span>
            <span className="font-mono font-bold text-slate-900">
              {state.covariance_trace.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 4: Fused Position & Speed */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Fused Kinematics
            </span>
            <Gauge className="w-4 h-4 text-brand-600" />
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {(state.speed * 3.6).toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">km/h</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Heading: <strong>{state.heading_deg.toFixed(1)}°</strong> • Alt: <strong>{state.altitude.toFixed(0)}m</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Lat: {state.latitude.toFixed(4)}</span>
            <span>Lon: {state.longitude.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI MOTION INTELLIGENCE CENTER (E5 & U2 MODELS) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 rounded-3xl p-5 md:p-6 text-white border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400 shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  AI Neural Motion Intelligence
                </h2>
                <span
                  className={clsx(
                    'px-2.5 py-0.5 text-[10px] font-semibold rounded-full border',
                    state.ai_model_ready || mlStatus?.ready
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  )}
                >
                  {state.ai_model_ready || mlStatus?.ready ? 'E5 + U2 LOADED' : 'INITIALIZING...'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physics-informed CNN-GRU velocity prediction with dynamic epistemic uncertainty gating
              </p>
            </div>
          </div>

          {/* Inference Stats Badge */}
          <div className="flex items-center gap-3 text-xs font-mono bg-black/40 px-3.5 py-2 rounded-2xl border border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>{state.ai_total_inferences || mlStatus?.total_inferences || 0} inf</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{state.ai_inference_latency_ms ? `${state.ai_inference_latency_ms.toFixed(1)}ms` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* AI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Metric 1: E5 Neural Velocity */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>E5 Predicted Velocity</span>
              <span className="text-cyan-400 font-mono text-[10px]">CNN-GRU</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-white">
              {state.ai_velocity !== null
                ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h`
                : 'Awaiting data'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {state.ai_velocity !== null ? `${state.ai_velocity.toFixed(2)} m/s` : 'Window buffering'}
            </p>
          </div>

          {/* Metric 2: U2 Epistemic Uncertainty */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>U2 Uncertainty (±σ)</span>
              <span className="text-amber-400 font-mono text-[10px]">MLP</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-white">
              {state.ai_uncertainty_sigma !== null
                ? `±${state.ai_uncertainty_sigma.toFixed(3)}`
                : 'Awaiting data'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Variance: {state.ai_variance !== null ? state.ai_variance.toFixed(4) : 'N/A'}
            </p>
          </div>

          {/* Metric 3: IMU Sliding Window */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>IMU Buffer Window</span>
              <span className="text-cyan-400 font-mono text-[10px]">{state.ai_window_fill_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, state.ai_window_fill_pct)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {state.ai_window_fill_pct >= 100 ? 'Real-time inference stream' : 'Filling 50-sample buffer...'}
            </p>
          </div>

          {/* Metric 4: Fusion Gating State */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Filter Integration</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm md:text-base font-bold font-mono text-white">
              {state.navigation_mode !== 'GNSS_AIDED' && state.ai_velocity !== null
                ? 'Active InEKF Update'
                : 'Shadow Filter Ready'}
            </div>
            <p className="text-[10px] text-slate-400">
              InEKF measurement fusion
            </p>
          </div>
        </div>

        {/* Real Model Registry & Benchmark Console */}
        <div className="pt-2">
          <ModelManagerCard />
        </div>
      </div>

      {/* SECTION 3 & 4: INVARIANT EKF STATE VECTOR & VEHICLE CONSTRAINTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* InEKF Attitude & Biases */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">InEKF Attitude & Biases</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">SE_2(3) Group</span>
          </div>

          {/* Euler Attitude Angles */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Roll (Φ)</span>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
                {state.roll.toFixed(1)}°
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pitch (θ)</span>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
                {state.pitch.toFixed(1)}°
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Yaw (Ψ)</span>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
                {state.yaw.toFixed(1)}°
              </div>
            </div>
          </div>

          {/* Estimated IMU Biases */}
          <div className="space-y-2 pt-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-500 font-sans">Estimated Accel Bias (b_a)</span>
              <span className="font-bold text-slate-900">
                [{state.accel_bias.map((b) => b.toFixed(3)).join(', ')}] m/s²
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-500 font-sans">Estimated Gyro Bias (b_g)</span>
              <span className="font-bold text-slate-900">
                [{state.gyro_bias.map((b) => b.toFixed(4)).join(', ')}] rad/s
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-500 font-sans">Local NED Velocity</span>
              <span className="font-bold text-slate-900">
                [{state.velocity_north.toFixed(1)}, {state.velocity_east.toFixed(1)}, {state.velocity_down.toFixed(1)}] m/s
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Motion Constraints & GNSS Health */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">Vehicle Constraints & GNSS</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">Kinematic Rules</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* NHC */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Non-Holonomic (NHC)</span>
                <span className={clsx('w-2 h-2 rounded-full', state.nhc_active ? 'bg-emerald-500' : 'bg-slate-300')} />
              </div>
              <div className="font-bold text-slate-900">
                {state.nhc_active ? 'Active (v_y = v_z ≈ 0)' : 'Inactive'}
              </div>
              <p className="text-[10px] text-slate-400">Lateral slip suppression</p>
            </div>

            {/* ZUPT */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Zero-Velocity (ZUPT)</span>
                <span className={clsx('w-2 h-2 rounded-full', state.zupt_active ? 'bg-emerald-500' : 'bg-slate-300')} />
              </div>
              <div className="font-bold text-slate-900">
                {state.zupt_active ? 'Engaged (Stationary)' : 'Inactive'}
              </div>
              <p className="text-[10px] text-slate-400">Stationary bias reset</p>
            </div>

            {/* GNSS Quality */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">GNSS Signal Quality</span>
                <Radio className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <div className="font-bold text-slate-900">
                {state.gnss_quality}
              </div>
              <p className="text-[10px] text-slate-400">{state.gnss_available ? 'Constellation tracking' : 'Outage detected'}</p>
            </div>

            {/* Map Matching */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Map Matching</span>
                <span className={clsx('w-2 h-2 rounded-full', state.map_matching_active ? 'bg-emerald-500' : 'bg-slate-300')} />
              </div>
              <div className="font-bold text-slate-900">
                {state.map_matching_active ? 'Active' : 'Standby'}
              </div>
              <p className="text-[10px] text-slate-400">Road network alignment</p>
            </div>
          </div>

          {/* Stream Diagnostics Strip */}
          <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-mono">
            <span>WebSocket Packets: <strong>{state.packets_received}</strong></span>
            <span>Link: <strong className="text-emerald-400">{websocketStatus}</strong></span>
          </div>
        </div>
      </div>

      {/* SECTION 5: W3C WEB SENSOR HARDWARE PLATFORM */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-base">W3C Web Sensor Hardware Platform</h3>
          </div>
          <span className="text-xs text-slate-400">Hardware & Browser Drivers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {hardwareSensors.map((sensor) => {
            const Icon = sensor.icon;
            return (
              <div
                key={sensor.name}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-600 shadow-xs shrink-0 border border-slate-200/60">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{sensor.name}</h4>
                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0', sensor.status.color)}>
                      {sensor.status.text}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-tight">{sensor.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 6: LIVE EVENT & STATE TRANSITION TIMELINE */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-base">Navigation State Transition Timeline</h3>
          </div>
          <span className="text-xs text-slate-400">Chronological Event Stream</span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-colors text-xs"
            >
              <span className="font-mono text-slate-400 text-[11px] shrink-0 pt-0.5">
                {event.timestamp}
              </span>

              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase shrink-0',
                  event.category === 'DEAD RECKONING'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : event.category === 'RECOVERY'
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : event.category === 'DEGRADED'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                )}
              >
                {event.category}
              </span>

              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800">{event.mode}</span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{event.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
