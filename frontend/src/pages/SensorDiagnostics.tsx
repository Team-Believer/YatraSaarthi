import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { useSystemState } from '../hooks/useSystemState';
import { offlineStorage } from '../services/storage/offlineStorage';
import { ModelManagerCard } from '../components/dashboard/ModelManagerCard';
import {
  Cpu,
  Radio,
  Compass,
  Activity,
  Layers,
  ShieldCheck,
  Gauge,
  Copy,
  Check,
  Sliders,
  ChevronDown,
  BrainCircuit,
  Scale,
  MapPin,
  CheckCircle2,
  Database,
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
  const state = useNavigationStore((s) => s.state);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const capabilities = useSensorStore((s) => s.capabilities);
  const { networkState } = useSystemState();
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [storageMetrics, setStorageMetrics] = useState<{
    sessionCount: number;
    totalSensorSamples: number;
    cachedTripsCount: number;
    savedRoutesCount: number;
    estimatedStorageBytes?: number;
  } | null>(null);
  
  // Advanced Details accordion state (collapsed by default)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Real-time timeline log of observed state transitions
  const [timeline, setTimeline] = useState<StateTimelineEvent[]>([]);
  const prevModeRef = useRef<string>(state.navigation_mode);

  useEffect(() => {
    sensorService.getStatus().catch(() => {});
    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch(() => {});

    offlineStorage.getStorageMetrics().then((m) => {
      setStorageMetrics(m);
    }).catch(() => {});
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
  }, [timeline.length, state.navigation_mode]);

  const handleCopySnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      isLive,
      sessionStatus,
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

  const isNavActive = isLive || sessionStatus === 'LIVE';

  // Determine Primary Top Status
  let primaryStatus = 'Standby';
  let primaryDotColor = 'bg-slate-400';
  let primaryTextColor = 'text-ink';

  if (state.gnss_outage_duration > 0 || state.navigation_mode?.includes('DEAD_RECKONING')) {
    primaryStatus = 'Dead reckoning active';
    primaryDotColor = 'bg-amber-500 animate-pulse';
    primaryTextColor = 'text-amber-800';
  } else if (state.gnss_available) {
    primaryStatus = isNavActive ? 'Navigation active' : 'Navigation ready';
    primaryDotColor = 'bg-emerald-500';
    primaryTextColor = 'text-emerald-800';
  } else if (isNavActive) {
    primaryStatus = 'Acquiring GNSS';
    primaryDotColor = 'bg-amber-500 animate-pulse';
    primaryTextColor = 'text-amber-800';
  }

  return (
    <div className="max-w-[1080px] w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 select-none pb-28 md:pb-16 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. COMPACT HEADER & SUBTLE METADATA                                       */}
      {/* ========================================================================= */}
      <header className="border-b border-border-clean pb-4 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-tight">
            Engineering Diagnostics
          </h1>
          <span className="text-[11px] font-mono text-ink-mute font-medium">
            InEKF v2.4
          </span>
        </div>
        <p className="text-xs sm:text-[13px] text-ink-body font-normal">
          Live navigation state, motion sensors, and fusion
        </p>
      </header>

      {/* ========================================================================= */}
      {/* 2. COMPACT SYSTEM STATUS BAR & SNAPSHOT ACTION                            */}
      {/* ========================================================================= */}
      <section aria-label="System health summary" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Compact Status Pill & Engine Source */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-border-clean shadow-2xs text-xs font-semibold text-ink self-start sm:self-auto">
            <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', primaryDotColor)} />
            <span className={primaryTextColor}>{primaryStatus}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border-clean shadow-2xs text-xs font-medium text-ink-body">
            <Cpu className="w-3.5 h-3.5 text-[#083335]" />
            <span>Engine:</span>
            <span
              className={clsx(
                'font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md',
                state.engine_source === 'SERVER'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                  : state.engine_source === 'LOCAL'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              )}
            >
              {state.engine_source || (isLive ? 'SERVER' : 'STANDBY')}
            </span>
          </div>
        </div>

        {/* Right: Confidence Badge & Subtle Copy Snapshot */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-full bg-white border border-border-clean shadow-2xs text-xs font-medium text-ink-body flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#083335]" />
            <span>Confidence:</span>
            <strong className="text-ink">
              {state.position_confidence > 0 ? `${Math.round(state.position_confidence * 100)}%` : 'Ready'}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleCopySnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 active:bg-slate-100 text-ink border border-border-clean text-xs font-medium shadow-2xs transition-all cursor-pointer"
            title="Copy snapshot JSON"
          >
            {copiedSnapshot ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-ink-mute" />
                <span>Copy snapshot</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRIMARY LIVE NAVIGATION HEALTH (Compact 2x2 Grid, ~105-120px tall)     */}
      {/* ========================================================================= */}
      <section aria-label="Primary live navigation state" className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Tile 1: Navigation Mode */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              <span>Navigation</span>
              <Activity className="w-3.5 h-3.5 text-[#083335]" />
            </div>
            <div className="my-1">
              <h2 className="text-base sm:text-lg font-bold font-display text-ink truncate">
                {state.navigation_mode || 'STANDBY'}
              </h2>
              <p className="text-[11px] text-ink-body truncate mt-0.5">
                {state.gnss_available ? 'GNSS Constellation Lock' : 'Inertial Dead Reckoning Active'}
              </p>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60 flex items-center justify-between">
              <span>Outage:</span>
              <span className="font-semibold text-ink tabular-nums">{formatOutage(state.gnss_outage_duration)}</span>
            </div>
          </div>

          {/* Tile 2: Position Confidence */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              <span>Position</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#083335]" />
            </div>
            <div className="my-1">
              <h2 className="text-base sm:text-lg font-bold font-display text-ink">
                {state.position_confidence > 0 ? `${Math.round(state.position_confidence * 100)}%` : 'Unavailable'}
              </h2>
              <p className="text-[11px] text-ink-body truncate mt-0.5">
                Accuracy: {state.horizontal_accuracy > 0 ? `±${state.horizontal_accuracy.toFixed(1)}m` : 'Unavailable'}
              </p>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60 flex items-center justify-between">
              <span>Innovation:</span>
              <span className="font-semibold text-ink tabular-nums">{state.innovation_norm.toFixed(3)}</span>
            </div>
          </div>

          {/* Tile 3: Environment */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              <span>Environment</span>
              <Layers className="w-3.5 h-3.5 text-[#083335]" />
            </div>
            <div className="my-1">
              <h2 className="text-base sm:text-lg font-bold font-display text-ink capitalize truncate">
                {state.environment_state ? state.environment_state.replace(/_/g, ' ').toLowerCase() : 'Unknown'}
              </h2>
              <p className="text-[11px] text-ink-body truncate mt-0.5">
                Alignment: {state.alignment_status ? state.alignment_status.replace(/_/g, ' ') : 'Unaligned'}
              </p>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60 flex items-center justify-between">
              <span>Covariance:</span>
              <span className="font-semibold text-ink tabular-nums">{state.covariance_trace.toFixed(2)}</span>
            </div>
          </div>

          {/* Tile 4: Fused Motion */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between min-h-[105px] sm:min-h-[115px]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              <span>Fused Motion</span>
              <Gauge className="w-3.5 h-3.5 text-[#083335]" />
            </div>
            <div className="my-1">
              <div className="text-xl sm:text-2xl font-bold font-display text-ink tracking-tight">
                {(state.speed * 3.6).toFixed(1)} <span className="text-xs font-normal text-ink-mute font-sans">km/h</span>
              </div>
              <p className="text-[11px] text-ink-body truncate mt-0.5">
                Heading: <strong className="text-ink">{state.heading_deg.toFixed(0)}°</strong> • Alt: {state.altitude.toFixed(0)}m
              </p>
            </div>
            <div className="text-[10.5px] text-ink-mute pt-1.5 border-t border-border-clean/60 flex items-center justify-between tabular-nums">
              <span>{state.latitude ? `${state.latitude.toFixed(3)}, ${state.longitude.toFixed(3)}` : 'No coordinates'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LIVE ENGINE STATUS LIST                                                 */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#083335]">
            LIVE ENGINE
          </h2>
          <span className="text-[11px] text-ink-mute">Subsystem execution status</span>
        </div>

        <div className="bg-white rounded-xl border border-border-clean divide-y divide-border-clean shadow-2xs overflow-hidden text-xs">
          
          {/* GNSS */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">GNSS Constellation</span>
            </div>
            <span className={clsx(
              "font-semibold px-2 py-0.5 rounded-full text-[10.5px] border",
              state.gnss_available ? "bg-emerald-50 text-emerald-800 border-emerald-200" : isNavActive ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200"
            )}>
              {state.gnss_available ? 'Available / Tracking' : isNavActive ? 'Acquiring' : 'Standby'}
            </span>
          </div>

          {/* IMU */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">IMU Sensors (6-DoF)</span>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded-full text-[10.5px] bg-emerald-50 text-emerald-800 border border-emerald-200">
              {capabilities.deviceMotion ? 'Connected · 50 Hz' : 'Connected'}
            </span>
          </div>

          {/* Motion Intelligence */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Motion Intelligence (E5/U2)</span>
            </div>
            <span className={clsx(
              "font-semibold px-2 py-0.5 rounded-full text-[10.5px] border",
              state.ai_velocity !== null ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
            )}>
              {state.ai_velocity !== null ? 'Active' : 'Ready'}
            </span>
          </div>

          {/* InEKF */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Invariant EKF State Estimator</span>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded-full text-[10.5px] bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isNavActive ? 'Active' : 'Ready'}
            </span>
          </div>

          {/* NHC */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Scale className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Non-Holonomic Constraints (NHC)</span>
            </div>
            <span className={clsx(
              "font-semibold px-2 py-0.5 rounded-full text-[10.5px] border",
              state.nhc_active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
            )}>
              {state.nhc_active ? 'Active / Engaged' : 'Ready / Armed'}
            </span>
          </div>

          {/* ZUPT */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Zero-Velocity Update (ZUPT)</span>
            </div>
            <span className={clsx(
              "font-semibold px-2 py-0.5 rounded-full text-[10.5px] border",
              state.zupt_active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
            )}>
              {state.zupt_active ? 'Stationary Lock' : 'Ready / Armed'}
            </span>
          </div>

          {/* Heading Fusion */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Heading Fusion</span>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded-full text-[10.5px] bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isNavActive ? 'Active' : 'Ready'}
            </span>
          </div>

          {/* Map Assistance */}
          <div className="p-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#083335] shrink-0" />
              <span className="font-semibold text-ink">Map Assistance</span>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded-full text-[10.5px] bg-slate-50 text-slate-700 border border-slate-200">
              Available
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SENSOR HEALTH & MOTION INTELLIGENCE (2-Column Grid)                     */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* SENSOR HEALTH */}
        <div className="bg-white rounded-xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#083335]">
              SENSOR HEALTH
            </h2>
            <span className="text-[11px] text-ink-mute">Hardware drivers</span>
          </div>

          <div className="divide-y divide-border-clean/70 text-xs">
            {/* Accelerometer */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">Accelerometer</span>
              </div>
              <span className="text-ink-body font-medium">Connected · 50 Hz</span>
            </div>

            {/* Gyroscope */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">Gyroscope</span>
              </div>
              <span className="text-ink-body font-medium">Connected · 50 Hz</span>
            </div>

            {/* Magnetometer */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">Magnetometer</span>
              </div>
              <span className="text-ink-body font-medium">
                {capabilities.deviceOrientation ? 'Connected' : 'Synthetic'}
              </span>
            </div>

            {/* GNSS */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={clsx('w-2 h-2 rounded-full shrink-0', state.gnss_available ? 'bg-emerald-500' : 'bg-amber-500')} />
                <span className="font-semibold text-ink">GNSS</span>
              </div>
              <span className="text-ink-body font-medium">
                {state.gnss_available ? 'Connected · 1 Hz' : isNavActive ? 'Acquiring' : 'Standby'}
              </span>
            </div>

            {/* Orientation */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-ink">Orientation</span>
              </div>
              <span className="text-ink-body font-medium">Connected</span>
            </div>
          </div>
        </div>

        {/* MOTION INTELLIGENCE */}
        <div className="bg-white rounded-xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#083335]">
                MOTION INTELLIGENCE
              </h2>
              <span className="text-[11px] text-ink-mute">Neural inference</span>
            </div>

            <div className="divide-y divide-border-clean/70 text-xs mt-1">
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-ink">AI Velocity</span>
                <span className="text-ink font-semibold tabular-nums">
                  {state.ai_velocity !== null ? `${(state.ai_velocity * 3.6).toFixed(1)} km/h` : 'Standby / Ready'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-ink">Uncertainty</span>
                <span className="text-ink font-semibold tabular-nums">
                  {state.ai_uncertainty_sigma !== null ? `±${state.ai_uncertainty_sigma.toFixed(3)} m/s` : 'Standby / Ready'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-ink">Inference Engine</span>
                <span className="text-ink font-semibold tabular-nums">
                  {state.ai_inference_latency_ms ? `${state.ai_inference_latency_ms.toFixed(1)} ms` : mlStatus?.last_latency_ms ? `${mlStatus.last_latency_ms.toFixed(1)} ms` : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11.5px] text-ink-body font-normal pt-2.5 border-t border-border-clean/60 leading-relaxed">
            AI provides forward-motion estimation and uncertainty to assist the navigation filter.
          </p>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. FUSION HEALTH                                                           */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#083335]">
            FUSION HEALTH
          </h2>
          <span className="text-[11px] text-ink-mute">Invariant EKF state constraints</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">InEKF Filter</span>
            <span className="font-semibold text-ink mt-0.5 block">{isNavActive ? 'Active' : 'Ready'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">NHC Constraint</span>
            <span className="font-semibold text-ink mt-0.5 block">{state.nhc_active ? 'Active' : 'Ready'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">ZUPT Detection</span>
            <span className="font-semibold text-ink mt-0.5 block">{state.zupt_active ? 'Active' : 'Ready'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Heading Fusion</span>
            <span className="font-semibold text-ink mt-0.5 block">{isNavActive ? 'Active' : 'Ready'}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border-clean/60 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-body">
          <span>GNSS Updates: <strong className="text-ink">{state.gnss_available ? 'Active (1 Hz)' : 'Unavailable'}</strong></span>
          <span>Innovation: <strong className="text-ink tabular-nums">{state.innovation_norm.toFixed(3)}</strong></span>
          <span>Covariance: <strong className="text-ink tabular-nums">{state.covariance_trace.toFixed(2)}</strong></span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6B. OFFLINE PWA & STORAGE READINESS                                        */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#083335]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#083335]">
              OFFLINE & STORAGE READINESS
            </h2>
          </div>
          <span className="text-[11px] text-ink-mute">IndexedDB & PWA Infrastructure</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean flex flex-col justify-between">
            <span className="text-[10.5px] uppercase font-bold text-ink-mute">Network Mode</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('w-2 h-2 rounded-full', networkState === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400')} />
              <span className="font-semibold text-ink">{networkState}</span>
            </div>
            <span className="text-[10px] text-ink-mute mt-1">PWA Shell: Cached</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean flex flex-col justify-between">
            <span className="text-[10.5px] uppercase font-bold text-ink-mute">Local Database</span>
            <span className="font-semibold text-ink mt-1">IndexedDB v1</span>
            <span className="text-[10px] text-ink-mute mt-1">
              {storageMetrics ? `${storageMetrics.totalSensorSamples} IMU samples stored` : 'Ready'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean flex flex-col justify-between">
            <span className="text-[10.5px] uppercase font-bold text-ink-mute">Cached Data</span>
            <span className="font-semibold text-ink mt-1">
              {storageMetrics?.cachedTripsCount || 0} Trips · {storageMetrics?.savedRoutesCount || 0} Routes
            </span>
            <span className="text-[10px] text-ink-mute mt-1">Dual-sync active</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-border-clean flex flex-col justify-between">
            <span className="text-[10.5px] uppercase font-bold text-ink-mute">Dead Reckoning Engine</span>
            <span className="font-semibold text-ink mt-1">
              {networkState === 'ONLINE' ? 'Server InEKF' : 'Client-Side DR Not Ported'}
            </span>
            <span className="text-[10px] text-ink-mute mt-1">
              {networkState === 'ONLINE' ? 'Streaming active' : 'Offline sensor logging ready'}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ADVANCED DETAILS (Progressive Disclosure / Collapsed by Default)        */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="bg-white rounded-xl border border-border-clean shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-diagnostics-drawer"
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#083335]/5 text-[#083335] flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold font-display text-ink tracking-tight">
                  ADVANCED DETAILS
                </h2>
                <p className="text-[11.5px] text-ink-mute font-sans mt-0.5">
                  InEKF state vectors, model registry, calibration, and timeline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#083335] hidden sm:inline">
                {advancedOpen ? 'Hide' : 'Expand'}
              </span>
              <ChevronDown
                className={clsx(
                  'w-4 h-4 text-[#083335] transition-transform duration-200',
                  advancedOpen && 'transform rotate-180'
                )}
              />
            </div>
          </button>

          {advancedOpen && (
            <div
              id="advanced-diagnostics-drawer"
              className="p-4 sm:p-6 border-t border-border-clean space-y-6 bg-slate-50/40 animate-in fade-in duration-200 text-xs"
            >
              {/* InEKF Euler Attitude & Biases */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ InEKF State & Sensor Biases</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 bg-white rounded-lg border border-border-clean">
                    <span className="text-[10px] font-bold text-ink-mute uppercase">Roll (Φ)</span>
                    <div className="text-sm sm:text-base font-bold font-sans tabular-nums text-ink mt-0.5">
                      {state.roll.toFixed(1)}°
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-border-clean">
                    <span className="text-[10px] font-bold text-ink-mute uppercase">Pitch (θ)</span>
                    <div className="text-sm sm:text-base font-bold font-sans tabular-nums text-ink mt-0.5">
                      {state.pitch.toFixed(1)}°
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-border-clean">
                    <span className="text-[10px] font-bold text-ink-mute uppercase">Yaw (Ψ)</span>
                    <div className="text-sm sm:text-base font-bold font-sans tabular-nums text-ink mt-0.5">
                      {state.yaw.toFixed(1)}°
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-border-clean">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-ink-mute">Accel Bias (b_a):</span>
                    <span className="font-semibold text-ink tabular-nums">
                      [{state.accel_bias.map((b) => b.toFixed(3)).join(', ')}] m/s²
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-ink-mute">Gyro Bias (b_g):</span>
                    <span className="font-semibold text-ink tabular-nums">
                      [{state.gyro_bias.map((b) => b.toFixed(4)).join(', ')}] rad/s
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-ink-mute">Local NED Velocity:</span>
                    <span className="font-semibold text-ink tabular-nums">
                      [{state.velocity_north.toFixed(1)}, {state.velocity_east.toFixed(1)}, {state.velocity_down.toFixed(1)}] m/s
                    </span>
                  </div>
                </div>
              </div>

              {/* State Transition Timeline */}
              <div className="space-y-3 pt-2 border-t border-border-clean/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Navigation State Transition Timeline</span>
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {timeline.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-border-clean transition-colors text-xs"
                    >
                      <span className="font-sans tabular-nums text-ink-mute text-[10.5px] shrink-0 pt-0.5">
                        {event.timestamp}
                      </span>

                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full font-bold text-[9.5px] uppercase shrink-0 border',
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

              {/* Advanced Model Management */}
              <div className="space-y-3 pt-2 border-t border-border-clean/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Model Registry & Ablation Analysis</span>
                </h3>
                <ModelManagerCard />
              </div>

            </div>
          )}
        </div>
      </section>

    </div>
  );
}
