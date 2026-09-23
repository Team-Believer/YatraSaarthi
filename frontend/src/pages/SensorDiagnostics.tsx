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
  ShieldCheck,
  Clock,
  Gauge,
  Copy,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';
import { sensorService } from '../services/api/sensorService';
import { fetchMLStatus, type MLStatusResponse } from '../services/api/mlService';
import { formatISTTime24 } from '../utils/timeFormat';

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
  const [showAdvancedModels, setShowAdvancedModels] = useState(false);

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
      const timeStr = formatISTTime24(new Date());
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
        ...prev.slice(0, 19),
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
          timestamp: formatISTTime24(new Date()),
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
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00 (No Outage)';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSensorStatus = (cap: boolean, perm?: string) => {
    if (!cap) return { text: 'Unavailable', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (perm === 'DENIED') return { text: 'Permission Denied', color: 'bg-rose-50 text-rose-800 border-rose-200' };
    if (perm === 'GRANTED' || cap) return { text: 'Connected', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    return { text: 'Standby', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const gnssStatus = getSensorStatus(capabilities.geolocation, permissions.geolocation);
  const motionStatus = getSensorStatus(capabilities.deviceMotion, permissions.deviceMotion);
  const orientStatus = getSensorStatus(capabilities.deviceOrientation, permissions.deviceOrientation);

  const isNavActive = isLive || sessionStatus === 'LIVE';

  return (
    <div className="max-w-[1240px] w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-24 md:pb-12 select-none">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-clean pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Engineering Diagnostics
            </h1>
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-canvas-soft text-ink-mute border border-border-clean">
              InEKF v2.4
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-ink-body font-normal mt-0.5">
            Live navigation state, motion estimation, sensors, and fusion
          </p>
        </div>

        {/* Telemetry Actions Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <NavStatusPill alwaysVisible showSecondary showChevron showDrawerOnClick />
          <ConfidenceIndicator alwaysVisible showAccuracy />

          {/* Copy Telemetry Snapshot Button */}
          <button
            type="button"
            onClick={handleCopySnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-canvas-soft active:bg-[#EDEDED] text-ink border border-border-clean text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Copy current telemetry state as JSON"
          >
            {copiedSnapshot ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied JSON</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-ink-mute" />
                <span>Copy Snapshot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. TOP STATUS CARDS (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Navigation Engine Mode */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-wider">
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
              {isNavActive ? 'Active' : 'Standby'}
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold font-mono text-ink truncate">
              {state.navigation_mode || 'STANDBY'}
            </h3>
            <p className="text-[11px] text-ink-body mt-0.5">
              {state.gnss_available ? 'GNSS Constellation Lock' : 'Inertial Dead Reckoning Active'}
            </p>
          </div>

          <div className="pt-2.5 border-t border-border-clean/60 flex items-center justify-between text-xs">
            <span className="text-ink-mute">Outage Duration</span>
            <span className="font-mono font-bold text-ink">
              {formatOutage(state.gnss_outage_duration)}
            </span>
          </div>
        </div>

        {/* Card 2: Position Confidence */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-wider">
              Position Confidence
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
              {state.position_confidence > 0 ? `${Math.round(state.position_confidence * 100)}%` : 'Unavailable'}
            </div>
            <p className="text-[11px] text-ink-body mt-0.5">
              Est. Accuracy: <strong className="text-ink">±{state.horizontal_accuracy.toFixed(1)}m</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-border-clean/60 flex items-center justify-between text-xs">
            <span className="text-ink-mute">Innovation Norm</span>
            <span className="font-mono font-bold text-ink">
              {state.innovation_norm.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Card 3: Environment State */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-wider">
              Environment
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-ink capitalize truncate">
              {state.environment_state.replace(/_/g, ' ').toLowerCase()}
            </h3>
            <p className="text-[11px] text-ink-body mt-0.5">
              Alignment: <strong className="text-ink">{state.alignment_status.replace(/_/g, ' ')}</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-border-clean/60 flex items-center justify-between text-xs">
            <span className="text-ink-mute">Covariance Trace</span>
            <span className="font-mono font-bold text-ink">
              {state.covariance_trace.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 4: Fused Kinematics */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-wider">
              Fused Motion
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
              {(state.speed * 3.6).toFixed(1)} <span className="text-xs font-normal text-ink-mute font-sans">km/h</span>
            </div>
            <p className="text-[11px] text-ink-body mt-0.5 font-mono">
              Heading: <strong>{state.heading_deg.toFixed(1)}°</strong> • Alt: <strong>{state.altitude.toFixed(0)}m</strong>
            </p>
          </div>

          <div className="pt-2.5 border-t border-border-clean/60 flex items-center justify-between text-[11px] font-mono text-ink-mute">
            <span>Lat: {state.latitude.toFixed(4)}</span>
            <span>Lon: {state.longitude.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* 3. LIVE NAVIGATION ENGINE SUMMARY */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            System Overview
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Live Navigation Engine
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Real-time operational status across all sensing, neural inference, and fusion subsystems
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {/* Item 1: GNSS */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">GNSS</span>
            <span className={clsx(
              "text-xs font-bold block",
              state.gnss_available ? "text-emerald-700" : "text-amber-700"
            )}>
              {state.gnss_available ? 'Available' : 'Lost'}
            </span>
            <span className="text-[10px] text-ink-mute block">Constellation lock</span>
          </div>

          {/* Item 2: IMU */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">IMU</span>
            <span className="text-xs font-bold text-emerald-700 block">
              Connected
            </span>
            <span className="text-[10px] text-ink-mute block">50 Hz Accel & Gyro</span>
          </div>

          {/* Item 3: Motion Intelligence */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Motion Intelligence</span>
            <span className={clsx(
              "text-xs font-bold block",
              state.ai_model_ready || mlStatus?.ready ? "text-emerald-700" : "text-slate-600"
            )}>
              {state.ai_model_ready || mlStatus?.ready ? 'Ready' : 'Waiting for data'}
            </span>
            <span className="text-[10px] text-ink-mute block">E5 Temporal ConvNet</span>
          </div>

          {/* Item 4: Velocity Estimate */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Velocity Estimate</span>
            <span className="text-xs font-bold font-mono text-ink block">
              {state.ai_velocity !== null ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h` : 'Standby'}
            </span>
            <span className="text-[10px] text-ink-mute block">Forward prediction</span>
          </div>

          {/* Item 5: Uncertainty */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Uncertainty</span>
            <span className="text-xs font-bold font-mono text-ink block">
              {state.ai_uncertainty_sigma !== null ? `±${state.ai_uncertainty_sigma.toFixed(2)} m/s` : 'Standby'}
            </span>
            <span className="text-[10px] text-ink-mute block">U2 Heteroscedastic</span>
          </div>

          {/* Item 6: InEKF */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">InEKF</span>
            <span className="text-xs font-bold text-emerald-700 block">
              {isNavActive ? 'Active' : 'Ready'}
            </span>
            <span className="text-[10px] text-ink-mute block">SE₂(3) Lie Group</span>
          </div>

          {/* Item 7: NHC */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">NHC</span>
            <span className={clsx(
              "text-xs font-bold block",
              state.nhc_active ? "text-emerald-700" : "text-slate-600"
            )}>
              {state.nhc_active ? 'Active' : 'Relaxed'}
            </span>
            <span className="text-[10px] text-ink-mute block">v_y = v_z ≈ 0</span>
          </div>

          {/* Item 8: ZUPT */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">ZUPT</span>
            <span className={clsx(
              "text-xs font-bold block",
              state.zupt_active ? "text-emerald-700" : "text-slate-600"
            )}>
              {state.zupt_active ? 'Engaged' : 'Ready'}
            </span>
            <span className="text-[10px] text-ink-mute block">Stationary reset</span>
          </div>

          {/* Item 9: Heading */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Heading</span>
            <span className="text-xs font-bold text-emerald-700 block">
              {capabilities.deviceOrientation ? 'Available' : 'Synthetic'}
            </span>
            <span className="text-[10px] text-ink-mute block">Fused orientation</span>
          </div>

          {/* Item 10: Map Aid */}
          <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Map Aid</span>
            <span className={clsx(
              "text-xs font-bold block",
              state.map_matching_active ? "text-emerald-700" : "text-slate-600"
            )}>
              {state.map_matching_active ? 'Active' : 'Standby'}
            </span>
            <span className="text-[10px] text-ink-mute block">Road corridor match</span>
          </div>
        </div>
      </div>

      {/* 4. MOTION INTELLIGENCE SECTION (Compact) */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Machine Learning Assistance
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Motion Intelligence
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1 leading-relaxed">
            AI provides forward-motion estimates and uncertainty to assist the navigation filter during GNSS-denied operation.
          </p>
        </div>

        {/* 3 Compact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Card 1: AI Velocity */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-body text-xs font-medium">
              <span>AI Velocity</span>
              <BrainCircuit className="w-4 h-4 text-[#083335]" />
            </div>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-ink">
                {state.ai_velocity !== null ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h` : 'Waiting for data'}
              </span>
              <span className="text-[11px] text-ink-mute block mt-0.5 font-mono">
                {state.ai_velocity !== null ? `${state.ai_velocity.toFixed(2)} m/s` : '2.0s sliding window'}
              </span>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60">
              E5 Temporal ConvNet
            </div>
          </div>

          {/* Card 2: Uncertainty */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-body text-xs font-medium">
              <span>Uncertainty (±σ)</span>
              <ShieldCheck className="w-4 h-4 text-[#083335]" />
            </div>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-ink">
                {state.ai_uncertainty_sigma !== null ? `±${state.ai_uncertainty_sigma.toFixed(3)} m/s` : 'Waiting for data'}
              </span>
              <span className="text-[11px] text-ink-mute block mt-0.5 font-mono">
                Variance: {state.ai_variance !== null ? state.ai_variance.toFixed(4) : 'Standby'}
              </span>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60">
              U2 Heteroscedastic Model
            </div>
          </div>

          {/* Card 3: Inference Engine */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean flex flex-col justify-between">
            <div className="flex items-center justify-between text-ink-body text-xs font-medium">
              <span>Inference Engine</span>
              <Zap className="w-4 h-4 text-[#083335]" />
            </div>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-ink">
                {state.ai_inference_latency_ms ? `${state.ai_inference_latency_ms.toFixed(1)} ms` : mlStatus?.last_latency_ms ? `${mlStatus.last_latency_ms.toFixed(1)} ms` : 'Ready'}
              </span>
              <span className="text-[11px] text-ink-mute block mt-0.5">
                Total inferences: {state.ai_total_inferences || mlStatus?.total_inferences || 0}
              </span>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60">
              Buffer: {state.ai_window_fill_pct ? `${state.ai_window_fill_pct.toFixed(0)}%` : '100%'}
            </div>
          </div>
        </div>

        {/* Concise AI Role Box */}
        <div className="p-3.5 bg-canvas-soft/40 rounded-xl border border-border-clean space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-ink-body">
            <span>IMU Stream</span>
            <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
            <span>Motion Intelligence</span>
            <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
            <span>Velocity + Uncertainty</span>
            <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
            <span>InEKF Fusion</span>
            <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
            <span className="text-[#083335]">Navigation State</span>
          </div>
          <p className="text-[11.5px] text-ink-mute pt-1 border-t border-border-clean/50 leading-relaxed">
            AI supplies motion information and confidence. The navigation filter remains responsible for maintaining the physical navigation state.
          </p>
        </div>
      </div>

      {/* 5. FUSION HEALTH & SENSOR HEALTH (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fusion Health */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#083335]" />
              <h3 className="font-bold text-ink text-base">Fusion Health</h3>
            </div>
            <p className="text-xs text-ink-body mt-0.5">
              Invariant EKF Lie group state vector and dynamic vehicle constraints
            </p>
          </div>

          {/* Euler Attitude Angles */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean">
              <span className="text-[10px] font-bold text-ink-mute uppercase">Roll (Φ)</span>
              <div className="text-base font-bold font-mono text-ink mt-0.5">
                {state.roll.toFixed(1)}°
              </div>
            </div>

            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean">
              <span className="text-[10px] font-bold text-ink-mute uppercase">Pitch (θ)</span>
              <div className="text-base font-bold font-mono text-ink mt-0.5">
                {state.pitch.toFixed(1)}°
              </div>
            </div>

            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean">
              <span className="text-[10px] font-bold text-ink-mute uppercase">Yaw (Ψ)</span>
              <div className="text-base font-bold font-mono text-ink mt-0.5">
                {state.yaw.toFixed(1)}°
              </div>
            </div>
          </div>

          {/* Estimated Biases & Velocities */}
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-canvas-soft/60 rounded-lg border border-border-clean flex items-center justify-between">
              <span className="text-ink-mute font-sans">Accel Bias (b_a)</span>
              <span className="font-bold text-ink">
                [{state.accel_bias.map((b) => b.toFixed(3)).join(', ')}] m/s²
              </span>
            </div>

            <div className="p-2.5 bg-canvas-soft/60 rounded-lg border border-border-clean flex items-center justify-between">
              <span className="text-ink-mute font-sans">Gyro Bias (b_g)</span>
              <span className="font-bold text-ink">
                [{state.gyro_bias.map((b) => b.toFixed(4)).join(', ')}] rad/s
              </span>
            </div>

            <div className="p-2.5 bg-canvas-soft/60 rounded-lg border border-border-clean flex items-center justify-between">
              <span className="text-ink-mute font-sans">Local NED Velocity</span>
              <span className="font-bold text-ink">
                [{state.velocity_north.toFixed(1)}, {state.velocity_east.toFixed(1)}, {state.velocity_down.toFixed(1)}] m/s
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-clean/60 flex items-center justify-between text-xs text-ink-mute font-mono">
            <span>WebSocket: <strong className="text-ink">{state.packets_received} pkts</strong></span>
            <span>Link: <strong className="text-emerald-700">{websocketStatus}</strong></span>
          </div>
        </div>

        {/* Sensor Health */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#083335]" />
              <h3 className="font-bold text-ink text-base">Sensor Health</h3>
            </div>
            <p className="text-xs text-ink-body mt-0.5">
              W3C web sensor APIs and browser hardware drivers
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {/* Accelerometer */}
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#083335]" />
                <div>
                  <span className="font-bold text-ink block">Accelerometer</span>
                  <span className="text-[11px] text-ink-mute">3-axis linear acceleration</span>
                </div>
              </div>
              <div className="text-right">
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", motionStatus.color)}>
                  {motionStatus.text}
                </span>
                <span className="text-[10px] font-mono text-ink-mute block mt-0.5">50.0 Hz</span>
              </div>
            </div>

            {/* Gyroscope */}
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#083335]" />
                <div>
                  <span className="font-bold text-ink block">Gyroscope</span>
                  <span className="text-[11px] text-ink-mute">3-axis rotational angular velocity</span>
                </div>
              </div>
              <div className="text-right">
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", motionStatus.color)}>
                  {motionStatus.text}
                </span>
                <span className="text-[10px] font-mono text-ink-mute block mt-0.5">50.0 Hz</span>
              </div>
            </div>

            {/* Magnetometer */}
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-[#083335]" />
                <div>
                  <span className="font-bold text-ink block">Magnetometer / Compass</span>
                  <span className="text-[11px] text-ink-mute">Magnetic heading orientation</span>
                </div>
              </div>
              <div className="text-right">
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", orientStatus.color)}>
                  {orientStatus.text}
                </span>
                <span className="text-[10px] font-mono text-ink-mute block mt-0.5">
                  {capabilities.deviceOrientation ? 'Hardware' : 'Synthetic'}
                </span>
              </div>
            </div>

            {/* GNSS */}
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#083335]" />
                <div>
                  <span className="font-bold text-ink block">GNSS Constellation Lock</span>
                  <span className="text-[11px] text-ink-mute">Satellite positioning & horizontal accuracy</span>
                </div>
              </div>
              <div className="text-right">
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", gnssStatus.color)}>
                  {gnssStatus.text}
                </span>
                <span className="text-[10px] font-mono text-ink-mute block mt-0.5">
                  {state.gnss_available ? 'Tracking' : 'Outage'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. STATE TRANSITION TIMELINE */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border-clean/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#083335]" />
            <h3 className="font-bold text-ink text-base">Navigation State Transition Timeline</h3>
          </div>
          <span className="text-xs text-ink-mute">Chronological Event Stream</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 bg-canvas-soft/60 hover:bg-canvas-soft rounded-xl border border-border-clean transition-colors text-xs"
            >
              <span className="font-mono text-ink-mute text-[11px] shrink-0 pt-0.5">
                {event.timestamp}
              </span>

              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full font-bold text-[10px] uppercase shrink-0 border',
                  event.category === 'DEAD RECKONING'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : event.category === 'RECOVERY'
                    ? 'bg-sky-50 text-sky-900 border-sky-300'
                    : event.category === 'DEGRADED'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                )}
              >
                {event.category}
              </span>

              <div className="flex-1 min-w-0">
                <span className="font-semibold text-ink">{event.mode}</span>
                <p className="text-[11px] text-ink-body mt-0.5 leading-tight">{event.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. ADVANCED MODEL DIAGNOSTICS (COLLAPSED BY DEFAULT) */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedModels(!showAdvancedModels)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-canvas-soft/40 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0">
              <BrainCircuit className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink text-sm sm:text-base">
                  Advanced Model Diagnostics
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-soft text-ink-mute border border-border-clean">
                  12 Variants Integrated
                </span>
              </div>
              <p className="text-xs text-ink-body mt-0.5">
                Model registry inspection, comparative multi-model benchmarking, and ablation analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#083335] shrink-0">
            <span>{showAdvancedModels ? 'Collapse' : 'Expand'}</span>
            {showAdvancedModels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvancedModels && (
          <div className="p-5 sm:p-6 border-t border-border-clean bg-canvas-soft/20 animate-in fade-in duration-200">
            <ModelManagerCard />
          </div>
        )}
      </div>
    </div>
  );
}
