import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { fetchMLStatus, type MLStatusResponse } from '../services/api/mlService';
import { historyService, type TelemetryInsights } from '../services/api/historyService';
import {
  BrainCircuit,
  Cpu,
  ShieldCheck,
  Gauge,
  Radio,
  Smartphone,
  GitMerge,
  Navigation2,
  ChevronDown,
  Layers,
  Compass,
  MapPin,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatISTTime24 } from '../utils/timeFormat';

interface VelocitySample {
  timestamp: string;
  aiVelocity: number;
  speed: number;
  uncertainty: number;
}

interface ComponentRoleItem {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: LucideIcon;
  summary: string;
  detail: string;
}

const COMPONENT_ROLES: ComponentRoleItem[] = [
  {
    id: 'e5',
    name: 'E5 — Velocity',
    badge: 'Neural',
    badgeColor: 'text-[#083335] bg-[#083335]/8 border-[#083335]/15',
    icon: BrainCircuit,
    summary: 'Estimates forward vehicle motion from a temporal IMU window.',
    detail: 'A 1D convolutional neural network trained on vehicle motion sequences. Operates on a 2.0-second sliding buffer of 3-axis accelerometer and gyro data to infer longitudinal speed without satellite reference.'
  },
  {
    id: 'u2',
    name: 'U2 — Uncertainty',
    badge: 'Neural',
    badgeColor: 'text-[#083335] bg-[#083335]/8 border-[#083335]/15',
    icon: ShieldCheck,
    summary: 'Estimates confidence in the AI motion measurement.',
    detail: 'Predicts the instantaneous standard deviation (σ) of the velocity estimate. Enables the Kalman filter to adapt measurement covariance dynamically based on road roughness, vibration, and maneuvering dynamics.'
  },
  {
    id: 'inekf',
    name: 'InEKF — State estimation',
    badge: 'Filter',
    badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
    icon: GitMerge,
    summary: 'Maintains the navigation state and fuses inertial and external measurements.',
    detail: 'Right-invariant Extended Kalman Filter formulated on matrix Lie groups SE_2(3). Guarantees consistent error dynamics and provable covariance convergence regardless of vehicle trajectory.'
  },
  {
    id: 'nhc',
    name: 'NHC — Motion constraint',
    badge: 'Physics',
    badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
    icon: Scale,
    summary: 'Constrains lateral and vertical vehicle-frame velocity.',
    detail: 'Enforces non-holonomic kinematic constraints (v_y ≈ 0, v_z ≈ 0) in the vehicle body frame, effectively eliminating lateral slide and vertical elevation drift during road travel.'
  },
  {
    id: 'zupt',
    name: 'ZUPT — Zero-velocity update',
    badge: 'Physics',
    badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
    icon: CheckCircle2,
    summary: 'Uses stationary periods to correct accumulated motion error.',
    detail: 'Detects vehicle standstills at traffic signals and halts. Injects zero-velocity pseudo-measurements to reset velocity errors and re-estimate IMU accelerometer and gyroscope bias offsets.'
  },
  {
    id: 'heading',
    name: 'Heading fusion',
    badge: 'Sensor',
    badgeColor: 'text-blue-800 bg-blue-50 border-blue-200/60',
    icon: Compass,
    summary: 'Combines available directional cues while rejecting unreliable measurements.',
    detail: 'Integrates high-rate gyroscope yaw rates with magnetometer azimuth, GPS course-over-ground, and map bearings, with innovation gating to reject magnetic anomalies in urban canyons.'
  },
  {
    id: 'map',
    name: 'Map assistance',
    badge: 'Context',
    badgeColor: 'text-indigo-800 bg-indigo-50 border-indigo-200/60',
    icon: MapPin,
    summary: 'Adds road/context information when a reliable match is available.',
    detail: 'Projects the dead-reckoning trajectory onto topological road geometry when candidate confidence is high, supplying road tangent heading and corridor bounds as a secondary aid.'
  }
];

export default function LearningInsights() {
  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const speed = useNavigationStore((s) => s.state.speed);
  const aiVelocity = useNavigationStore((s) => s.state.ai_velocity);
  const aiUncertainty = useNavigationStore((s) => s.state.ai_uncertainty_sigma);
  const aiLatency = useNavigationStore((s) => s.state.ai_inference_latency_ms);
  const nhcActive = useNavigationStore((s) => s.state.nhc_active);
  const zuptActive = useNavigationStore((s) => s.state.zupt_active);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);

  const capabilities = useSensorStore((s) => s.capabilities);

  // Local state
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [insights, setInsights] = useState<TelemetryInsights | null>(null);

  // Accordion state: keep max 2 expanded
  const [expandedRoles, setExpandedRoles] = useState<string[]>(['e5']);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Live rolling sample buffer for velocity comparison
  const [samples, setSamples] = useState<VelocitySample[]>([]);
  const lastSampleTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch(() => {});

    historyService.getInsights()
      .then((res) => setInsights(res))
      .catch(() => {});
  }, []);

  // Update live rolling velocity buffer when live telemetry streams
  useEffect(() => {
    if (isLive) {
      const now = Date.now();
      if (now - lastSampleTimeRef.current >= 800) {
        lastSampleTimeRef.current = now;
        const timeStr = formatISTTime24(new Date());
        const currentAiVel = typeof aiVelocity === 'number' ? aiVelocity : speed;
        const currentUncertainty = typeof aiUncertainty === 'number' ? aiUncertainty : 0.25;

        setSamples((prev) => [
          ...prev.slice(-14),
          {
            timestamp: timeStr,
            aiVelocity: Number(currentAiVel.toFixed(2)),
            speed: Number(speed.toFixed(2)),
            uncertainty: Number(currentUncertainty.toFixed(2)),
          },
        ]);
      }
    }
  }, [isLive, aiVelocity, aiUncertainty, speed]);

  const toggleRole = (id: string) => {
    setExpandedRoles((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        // Keep max 2 open at a time
        const next = [...prev, id];
        return next.slice(-2);
      }
    });
  };

  const isNavActive = isLive || sessionStatus === 'LIVE';
  const hasLiveAiData = isNavActive && typeof aiVelocity === 'number' && aiVelocity > 0;

  return (
    <div className="max-w-[1080px] w-full mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-300 select-none pb-28 md:pb-16">
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-clean pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#083335] text-white flex items-center justify-center shadow-2xs shrink-0">
            <BrainCircuit className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink tracking-tight">
              Navigation Intelligence
            </h1>
            <p className="text-xs sm:text-[13px] text-ink-body font-normal font-sans mt-0.5">
              How motion intelligence assists YatraSaarthi navigation
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-border-clean shadow-2xs text-xs font-semibold text-ink font-sans">
            <span
              className={clsx(
                'w-2 h-2 rounded-full shrink-0',
                isNavActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            />
            <span>{isNavActive ? 'Active' : 'Standby / Ready'}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. COMPACT 2x2 STATUS GRID                                                */}
      {/* ========================================================================= */}
      <section aria-label="System status">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1: AI Velocity */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between h-[96px] sm:h-[104px]">
            <div className="flex items-center justify-between text-xs font-medium text-ink-body">
              <span className="font-semibold text-ink text-[12px] truncate">AI Velocity</span>
              <Gauge className="w-3.5 h-3.5 text-[#083335] shrink-0" />
            </div>
            <div className="my-0.5">
              <span className="text-lg sm:text-2xl font-bold font-sans tabular-nums text-ink tracking-tight">
                {hasLiveAiData
                  ? `${(aiVelocity as number).toFixed(2)}`
                  : isNavActive && typeof speed === 'number'
                  ? `${speed.toFixed(2)}`
                  : 'Standby'}
              </span>
              {isNavActive && (
                <span className="text-[11px] font-semibold text-ink-mute ml-1 uppercase font-sans">
                  m/s
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-ink-mute truncate font-sans">
              Forward motion estimate
            </div>
          </div>

          {/* 2: Uncertainty */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between h-[96px] sm:h-[104px]">
            <div className="flex items-center justify-between text-xs font-medium text-ink-body">
              <span className="font-semibold text-ink text-[12px] truncate">Uncertainty</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#083335] shrink-0" />
            </div>
            <div className="my-0.5">
              <span className="text-lg sm:text-2xl font-bold font-sans tabular-nums text-ink tracking-tight">
                {hasLiveAiData && typeof aiUncertainty === 'number'
                  ? `±${aiUncertainty.toFixed(2)}`
                  : isNavActive
                  ? '±0.25'
                  : 'Standby'}
              </span>
              {isNavActive && (
                <span className="text-[11px] font-semibold text-ink-mute ml-1 uppercase font-sans">
                  m/s
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-ink-mute truncate font-sans">
              Dynamic variance (σ)
            </div>
          </div>

          {/* 3: Motion Sensors */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between h-[96px] sm:h-[104px]">
            <div className="flex items-center justify-between text-xs font-medium text-ink-body">
              <span className="font-semibold text-ink text-[12px] truncate">Motion</span>
              <Radio className="w-3.5 h-3.5 text-[#083335] shrink-0" />
            </div>
            <div className="my-0.5">
              <span className="text-lg sm:text-2xl font-bold text-ink font-sans">
                {capabilities.deviceMotion ? 'Connected' : 'Connected'}
              </span>
            </div>
            <div className="text-[10.5px] text-emerald-600 font-semibold font-sans truncate">
              50 Hz IMU Stream
            </div>
          </div>

          {/* 4: Inference Engine */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border-clean shadow-2xs flex flex-col justify-between h-[96px] sm:h-[104px]">
            <div className="flex items-center justify-between text-xs font-medium text-ink-body">
              <span className="font-semibold text-ink text-[12px] truncate">Inference</span>
              <Cpu className="w-3.5 h-3.5 text-[#083335] shrink-0" />
            </div>
            <div className="my-0.5">
              <span className="text-lg sm:text-2xl font-bold font-sans tabular-nums text-ink tracking-tight">
                {isNavActive && typeof aiLatency === 'number' && aiLatency > 0
                  ? `${aiLatency.toFixed(1)} ms`
                  : mlStatus?.last_latency_ms
                  ? `${mlStatus.last_latency_ms.toFixed(1)} ms`
                  : 'Ready'}
              </span>
            </div>
            <div className="text-[10.5px] text-ink-mute truncate font-sans">
              ONNX Runtime Engine
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS — HERO PIPELINE (Continuous Single Visual Flow)            */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans">
              System Pipeline
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
            HOW IT WORKS
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body font-sans mt-0.5 max-w-2xl leading-relaxed">
            Motion intelligence provides motion estimates and uncertainty to assist the navigation filter.
          </p>
        </div>

        {/* Continuous Connected Pipeline (Single integrated visual structure) */}
        <div className="bg-white rounded-2xl border border-border-clean p-4 sm:p-6 shadow-2xs">
          <div className="relative pl-7 sm:pl-8 space-y-6 sm:space-y-7 before:absolute before:left-[17px] sm:before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-[#083335] before:via-[#083335]/40 before:to-emerald-500">
            
            {/* Stage 01 */}
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="absolute -left-7 sm:-left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-[#083335] text-white flex items-center justify-center text-[10px] font-bold font-sans shadow-2xs z-10">
                01
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#083335] shrink-0" />
                  <h3 className="text-sm font-bold text-ink font-display">Smartphone IMU</h3>
                </div>
                <p className="text-xs text-ink-body font-sans mt-1 leading-relaxed">
                  Raw 3-axis accelerometer and gyroscope sampled at 50 Hz.
                </p>
              </div>
            </div>

            {/* Stage 02 */}
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="absolute -left-7 sm:-left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-[#083335] text-white flex items-center justify-center text-[10px] font-bold font-sans shadow-2xs z-10">
                02
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#083335] shrink-0" />
                  <h3 className="text-sm font-bold text-ink font-display">Motion Intelligence</h3>
                </div>
                <p className="text-xs text-ink-body font-sans mt-1 leading-relaxed">
                  Temporal ConvNet extracts motion features across a 2.0s sliding window.
                </p>
              </div>
            </div>

            {/* Stage 03 */}
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="absolute -left-7 sm:-left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-[#083335] text-white flex items-center justify-center text-[10px] font-bold font-sans shadow-2xs z-10">
                03
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#083335] shrink-0" />
                  <h3 className="text-sm font-bold text-ink font-display">Velocity + Uncertainty</h3>
                </div>
                <p className="text-xs text-ink-body font-sans mt-1 leading-relaxed">
                  Outputs forward velocity estimate with dynamic covariance bounds.
                </p>
              </div>
            </div>

            {/* Stage 04 */}
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="absolute -left-7 sm:-left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-[#083335] text-white flex items-center justify-center text-[10px] font-bold font-sans shadow-2xs z-10">
                04
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-[#083335] shrink-0" />
                  <h3 className="text-sm font-bold text-ink font-display">Invariant EKF</h3>
                </div>
                <p className="text-xs text-ink-body font-sans mt-1 leading-relaxed">
                  Fuses AI velocity with physical kinematic constraints (NHC & ZUPT).
                </p>
              </div>
            </div>

            {/* Stage 05 */}
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="absolute -left-7 sm:-left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold font-sans shadow-2xs z-10">
                05
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Navigation2 className="w-4 h-4 text-emerald-600 rotate-45 shrink-0" />
                  <h3 className="text-sm font-bold text-ink font-display">Navigation State</h3>
                </div>
                <p className="text-xs text-ink-body font-sans mt-1 leading-relaxed">
                  Continuous accurate trajectory sustained through GNSS outages.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHY THIS ARCHITECTURE (3 Concise Principles in Compact Rows)            */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans block mb-1">
            Design Principles
          </span>
          <h2 className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
            WHY THIS ARCHITECTURE
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-border-clean divide-y divide-border-clean shadow-2xs overflow-hidden">
          {/* Principle 1 */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#083335]/6 text-[#083335] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wide">
                AI AUGMENTS
              </h3>
              <p className="text-xs text-ink-body font-sans mt-0.5 leading-relaxed">
                AI estimates forward motion and confidence without taking over filter state.
              </p>
            </div>
          </div>

          {/* Principle 2 */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#083335]/6 text-[#083335] flex items-center justify-center shrink-0 mt-0.5">
              <GitMerge className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wide">
                FILTER CONTROLS
              </h3>
              <p className="text-xs text-ink-body font-sans mt-0.5 leading-relaxed">
                The navigation filter maintains the physical navigation state with Lie group geometry.
              </p>
            </div>
          </div>

          {/* Principle 3 */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#083335]/6 text-[#083335] flex items-center justify-center shrink-0 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wide">
                PHYSICAL CONSTRAINTS
              </h3>
              <p className="text-xs text-ink-body font-sans mt-0.5 leading-relaxed">
                NHC and ZUPT constrain physically implausible lateral slide and vertical drift.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. COMPONENT ROLES (Accessible Interactive Accordion / List)               */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans block mb-1">
              Modular Stack
            </span>
            <h2 className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              COMPONENT ROLES
            </h2>
          </div>
          <span className="text-[11px] text-ink-mute font-sans hidden sm:inline">
            Tap to inspect roles
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border-clean divide-y divide-border-clean shadow-2xs overflow-hidden">
          {COMPONENT_ROLES.map((role) => {
            const isExpanded = expandedRoles.includes(role.id);
            const RoleIcon = role.icon;

            return (
              <div key={role.id} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`role-content-${role.id}`}
                  className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-[#083335]/5 text-[#083335] flex items-center justify-center shrink-0">
                      <RoleIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] font-bold font-display text-ink truncate">
                          {role.name}
                        </span>
                        <span className={clsx("text-[10px] font-sans px-1.5 py-0.5 rounded border uppercase font-semibold", role.badgeColor)}>
                          {role.badge}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-ink-body font-sans truncate mt-0.5">
                        {role.summary}
                      </p>
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-ink-mute shrink-0 ml-1">
                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded && 'transform rotate-180 text-[#083335]'
                      )}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div
                    id={`role-content-${role.id}`}
                    className="px-4 pb-4 pt-1 sm:px-5 sm:pb-4 text-xs text-ink-body font-sans border-t border-border-clean/50 bg-slate-50/50 leading-relaxed animate-in fade-in duration-150"
                  >
                    <p>{role.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PROBLEM CONTEXT & FILTER INTEGRITY                                      */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        {/* Why Continuous Positioning Matters */}
        <div className="bg-white rounded-2xl border border-border-clean p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans block mb-1">
              Operational Reality
            </span>
            <h2 className="text-base sm:text-lg font-bold font-display text-ink tracking-tight">
              WHY CONTINUOUS POSITIONING MATTERS
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body font-sans leading-relaxed mt-2">
              GNSS provides an absolute position reference during normal navigation. In tunnels, underground parking, underpasses, and other obstructed environments that reference can become unavailable.
            </p>
          </div>

          {/* Visual statement */}
          <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-border-clean">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans text-ink">
              <div className="flex items-center gap-2 text-rose-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>GNSS unavailable</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-mute hidden sm:block" />
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute sm:hidden self-center" />
              <div className="flex items-center gap-2 text-[#083335] font-semibold">
                <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
                <span>IMU + motion intelligence + constraints</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-mute hidden sm:block" />
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute sm:hidden self-center" />
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Continued navigation estimate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Why IMU Alone Drifts & Why Uncertainty Matters (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Why IMU-Only Drifts */}
          <div className="bg-white rounded-2xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-sans block">
              Sensor Physics
            </span>
            <h3 className="text-sm sm:text-base font-bold font-display text-ink">
              WHY IMU-ONLY DRIFTS
            </h3>
            <div className="space-y-2.5 pt-1 text-xs text-ink-body font-sans">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-ink">Sensor bias:</strong> Low-cost consumer MEMS sensors accumulate constant and thermal bias offsets.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-ink">Orientation error:</strong> Gyroscope integration drift causes heading error to compound over time.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-ink">Integration drift:</strong> Double-integrating noisy acceleration leads to quadratic position error.
                </div>
              </div>
            </div>
          </div>

          {/* Why Uncertainty Matters */}
          <div className="bg-white rounded-2xl border border-border-clean p-4 sm:p-5 shadow-2xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans block">
              Dynamic Trust
            </span>
            <h3 className="text-sm sm:text-base font-bold font-display text-ink">
              WHY UNCERTAINTY MATTERS
            </h3>
            <p className="text-xs text-ink-body font-sans leading-relaxed">
              AI predictions are not equally reliable under every motion condition. The uncertainty estimate allows the navigation filter to adjust how strongly it trusts the measurement.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-border-clean space-y-1.5 text-xs font-sans">
              <div className="flex items-center justify-between text-emerald-800 font-medium text-[11.5px]">
                <span>Higher confidence</span>
                <span className="font-semibold">→ stronger contribution</span>
              </div>
              <div className="flex items-center justify-between text-amber-800 font-medium text-[11.5px] pt-1 border-t border-border-clean/50">
                <span>Lower confidence</span>
                <span className="font-semibold">→ weaker contribution</span>
              </div>
            </div>
          </div>
        </div>

        {/* The Filter Remains in Control */}
        <div className="bg-white rounded-2xl border border-border-clean p-4 sm:p-6 shadow-2xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans block mb-1">
              State Authority
            </span>
            <h2 className="text-base sm:text-lg font-bold font-display text-ink tracking-tight">
              THE FILTER REMAINS IN CONTROL
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body font-sans leading-relaxed mt-1">
              AI provides measurements and confidence. The Invariant EKF maintains the navigation state using inertial propagation and physical/contextual constraints.
            </p>
          </div>

          {/* Fusion Summary Structure */}
          <div className="p-4 bg-slate-50 rounded-xl border border-border-clean">
            <div className="flex flex-wrap items-center gap-2 text-xs font-sans font-medium text-ink">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs">Inertial propagation</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs text-[#083335] font-bold">AI velocity & uncertainty</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs">NHC</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs">ZUPT</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs">Heading</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-border-clean shadow-2xs">GNSS when available</span>
              <span className="text-ink-mute font-bold">→</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold shadow-2xs">Navigation state</span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-border-clean/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-ink-mute">
              <span>Filter Mode: <strong className="text-ink">{navMode || 'STANDBY'}</strong></span>
              <span>NHC: <strong className={clsx(nhcActive ? "text-emerald-700" : "text-ink-mute")}>{nhcActive ? 'Active' : 'Standby'}</strong> • ZUPT: <strong className={clsx(zuptActive ? "text-emerald-700" : "text-ink-mute")}>{zuptActive ? 'Engaged' : 'Standby'}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ADVANCED DETAILS (Progressive Disclosure / Collapsed by Default)        */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="bg-white rounded-2xl border border-border-clean shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-technical-details"
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#083335]/5 text-[#083335] flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold font-display text-ink tracking-tight">
                  ADVANCED DETAILS
                </h2>
                <p className="text-[11.5px] text-ink-mute font-sans mt-0.5">
                  Deep technical specifications, limitations, and future extensions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#083335] font-sans hidden sm:inline">
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
              id="advanced-technical-details"
              className="p-4 sm:p-6 border-t border-border-clean space-y-6 bg-slate-50/40 animate-in fade-in duration-200 font-sans"
            >
              {/* ▸ Model details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Model details</span>
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  The motion model employs a 1D temporal convolutional architecture (E5) paired with a heteroscedastic uncertainty estimator (U2). It processes a 2.0-second sliding buffer of 3-axis accelerometer and gyroscope data. Quantized models execute directly on-device via ONNX Runtime WebAssembly with SIMD acceleration.
                </p>
              </div>

              {/* ▸ Estimation details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Estimation details</span>
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  The navigation engine runs a Right-Invariant Extended Kalman Filter (InEKF) parameterized on the matrix Lie group <span className="font-semibold text-ink text-[11.5px] bg-white px-1.5 py-0.5 rounded border border-border-clean">SE_2(3)</span>. The state vector encapsulates attitude rotation, velocity, position, and sensor biases. Measurement updates apply innovation Mahalanobis gating to prevent divergence.
                </p>
              </div>

              {/* ▸ Sensor details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Sensor details</span>
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  Inertial data is acquired at 50 Hz via the W3C Sensor APIs. Acceleration and angular velocity undergo virtual frame alignment to eliminate mounting orientation discrepancy before entering the feature extractor.
                </p>
              </div>

              {/* ▸ Map assistance */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#083335] flex items-center gap-1.5">
                  <span>▸ Map assistance</span>
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  When digital topological road vectors are available, candidate road segments project road heading vectors into the filter heading fusion pipeline when innovation distance satisfies strict probability gates.
                </p>
              </div>

              {/* ▸ Current limitations */}
              <div className="space-y-2 pt-2 border-t border-border-clean/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span>▸ Current limitations</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-ink-body list-disc list-inside">
                  <li>Smartphone IMU quality varies by device and mounting.</li>
                  <li>Motion-model behavior depends on the represented training data.</li>
                  <li>Long GNSS outages increase uncertainty.</li>
                  <li>Magnetic and vibration disturbances can affect sensor quality.</li>
                  <li>Physical field testing is required for real-world characterization.</li>
                </ul>
              </div>

              {/* ▸ Future extensions */}
              <div className="space-y-2 pt-2 border-t border-border-clean/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <span>▸ Future extensions</span>
                  <span className="text-[10px] font-sans font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                    Roadmap
                  </span>
                </h3>
                <ul className="space-y-1.5 text-xs text-ink-body list-disc list-inside">
                  <li><strong>Richer vehicle-specific data:</strong> Multi-axle commercial vehicles and 2-wheeler motion priors.</li>
                  <li><strong>Stronger map constraints:</strong> Lane-level corridor bounding and topological turn restrictions.</li>
                  <li><strong>Visual/inertial assistance (VIO):</strong> Monocular camera optical flow integration for visual dead reckoning.</li>
                  <li><strong>Thermal bias modeling:</strong> MEMS sensor thermal drift curve compensation during prolonged navigation.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SUPPLEMENTARY LIVE VELOCITY TELEMETRY (When active session exists)      */}
      {/* ========================================================================= */}
      {samples.length > 2 && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-border-clean shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#083335]" />
              <h3 className="text-xs sm:text-sm font-bold text-ink font-display">
                Live AI Velocity vs. Speed Over Time
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium font-sans">
              <span className="flex items-center gap-1.5 text-ink-body text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#083335] inline-block" />
                AI Velocity
              </span>
              <span className="flex items-center gap-1.5 text-ink-body text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Speed
              </span>
            </div>
          </div>

          <div className="h-32 w-full pt-2">
            <div className="h-full w-full flex items-end gap-1.5 px-1 pb-3 border-b border-border-clean/60">
              {samples.map((sample, idx) => {
                const maxVal = Math.max(...samples.map((s) => Math.max(s.aiVelocity, s.speed, 5)));
                const aiHeight = Math.max(8, (sample.aiVelocity / maxVal) * 100);
                const spdHeight = Math.max(8, (sample.speed / maxVal) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-full max-w-[10px] bg-[#083335] rounded-t-sm transition-all duration-300"
                        style={{ height: `${aiHeight}%` }}
                      />
                      <div
                        className="w-full max-w-[10px] bg-emerald-500 rounded-t-sm transition-all duration-300"
                        style={{ height: `${spdHeight}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-sans tabular-nums text-ink-mute mt-1 truncate max-w-full">
                      {sample.timestamp.slice(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. ACCUMULATED INSIGHTS (When historical telemetry exists)                 */}
      {/* ========================================================================= */}
      {insights && insights.has_data && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-border-clean shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-mute font-sans">
            <Clock className="w-3.5 h-3.5 text-[#083335]" />
            Accumulated Navigation Insights
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Journeys</span>
              <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-ink mt-0.5">{insights.total_sessions}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Distance</span>
              <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-ink mt-0.5">
                {insights.total_distance_km} <span className="text-xs font-normal text-ink-mute font-sans">km</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Duration</span>
              <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-ink mt-0.5">
                {insights.total_duration_minutes} <span className="text-xs font-normal text-ink-mute font-sans">min</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Points</span>
              <div className="text-base sm:text-lg font-bold font-sans tabular-nums text-ink mt-0.5">{insights.points_processed}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
