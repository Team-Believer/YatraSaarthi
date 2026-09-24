import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { fetchMLStatus, type MLStatusResponse } from '../services/api/mlService';
import { historyService, type TelemetryInsights } from '../services/api/historyService';
import {
  BrainCircuit,
  ShieldCheck,
  Gauge,
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
  Scale,
  Sparkles,
  Sliders,
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

interface ComponentItem {
  id: string;
  name: string;
  type: 'Neural' | 'Filter' | 'Physics' | 'Sensor' | 'Context';
  icon: LucideIcon;
  summary: string;
  detail: string;
}

const COMPONENTS: ComponentItem[] = [
  {
    id: 'e5',
    name: 'E5 — Velocity',
    type: 'Neural',
    icon: BrainCircuit,
    summary: 'Estimates forward vehicle velocity from recent inertial motion.',
    detail: 'E5 processes a sliding window of accelerometer and gyroscope measurements using a temporal CNN-GRU architecture. Its output provides a learned forward velocity measurement to the navigation filter.'
  },
  {
    id: 'u2',
    name: 'U2 — Uncertainty',
    type: 'Neural',
    icon: ShieldCheck,
    summary: 'Estimates confidence in the learned velocity measurement.',
    detail: 'U2 predicts the uncertainty of the E5 velocity estimate. This uncertainty is converted into dynamic measurement covariance so the navigation filter adapts the influence of the learned measurement in real time.'
  },
  {
    id: 'inekf',
    name: 'Invariant EKF',
    type: 'Filter',
    icon: GitMerge,
    summary: 'Maintains the physical navigation state and fuses available measurements.',
    detail: 'Formulated on the SE_2(3) matrix Lie group, the Invariant EKF maintains attitude, velocity, position, and inertial sensor bias states while fusing inertial propagation with learned velocity, GNSS, heading, and kinematic constraints.'
  },
  {
    id: 'nhc',
    name: 'NHC — Motion Constraint',
    type: 'Physics',
    icon: Scale,
    summary: 'Constrains vehicle motion that is physically unlikely during road travel.',
    detail: 'Non-Holonomic Constraints model rigid vehicle dynamics during road transit by constraining lateral and vertical velocities toward zero in the body frame.'
  },
  {
    id: 'zupt',
    name: 'ZUPT — Zero-Velocity Update',
    type: 'Physics',
    icon: Sliders,
    summary: 'Uses detected stationary periods to bound accumulated velocity and bias error.',
    detail: 'When the system detects a valid stationary stop (such as traffic signals), ZUPT injects a zero-velocity pseudo-measurement that directly corrects velocity drift and recalibrates inertial sensor biases.'
  },
  {
    id: 'heading',
    name: 'Heading Fusion',
    type: 'Sensor',
    icon: Compass,
    summary: 'Combines multiple directional sources with innovation gating.',
    detail: 'Integrates gyroscope integration, GNSS course when available, magnetic compass headings when uncorrupted, and road segment bearing with statistical gating to reject anomalous directional jumps.'
  },
  {
    id: 'map',
    name: 'Map Assistance',
    type: 'Context',
    icon: MapPin,
    summary: 'Adds road corridor context when a confident match is established.',
    detail: 'When map-match confidence meets strict gating criteria, nearby road segment geometry provides secondary heading and corridor bounds. Map assistance is strictly contextual and never overrides inertial state propagation.'
  }
];

interface DetailSection {
  id: string;
  title: string;
  summary: string;
  content: string;
}

const TECHNICAL_DETAILS: DetailSection[] = [
  {
    id: 'model',
    title: 'Model Architecture',
    summary: 'Temporal CNN-GRU and U2 uncertainty network running in-browser',
    content: 'E5 utilizes a temporal CNN-GRU architecture to extract multi-scale motion features from a sliding 50-sample window of 3-axis accelerometer and 3-axis gyroscope data. U2 operates in tandem to estimate heteroscedastic uncertainty. Both networks are compiled to ONNX format and executed on the client device via ONNX Runtime WebAssembly with SIMD hardware acceleration.'
  },
  {
    id: 'estimation',
    title: 'Estimation Engine',
    summary: 'Right-invariant Extended Kalman Filter formulated on SE_2(3)',
    content: 'The core state estimator is an Invariant Extended Kalman Filter (InEKF) formulated on the SE_2(3) matrix Lie group. State dimensions encompass attitude rotation R ∈ SO(3), velocity v ∈ ℝ³, position p ∈ ℝ³, and accelerometer/gyroscope biases. Lie group symmetries guarantee geometrically consistent linear error propagation and coordinate-frame invariance.'
  },
  {
    id: 'sensors',
    title: 'Sensor Ingestion & Preprocessing',
    summary: 'Device API normalization, gravity alignment, and sliding window buffer',
    content: 'Inertial data is ingested at 50 Hz through standard browser DeviceMotion and DeviceOrientation APIs. Readings are converted into standard SI units, adjusted for mounting orientation, and validated against temporal jitter before insertion into a rolling circular buffer for inference.'
  },
  {
    id: 'map_assistance',
    title: 'Map Assistance & Context Gating',
    summary: 'Road geometry verification and secondary directional reference',
    content: 'Road geometry extracted from local vector tiles provides contextual bearing and corridor constraints. Candidate road matches are evaluated against vehicle heading and speed; candidates with high spatial discrepancy are rejected to prevent incorrect snapping during complex highway or overpass scenarios.'
  }
];

export default function LearningInsights() {
  // Store Subscriptions (all preserved)
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

  // Single expanded item state (Max 1 at a time to reduce visual noise)
  const [expandedComponent, setExpandedComponent] = useState<string | null>('e5');
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

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

  const toggleComponent = (id: string) => {
    setExpandedComponent((prev) => (prev === id ? null : id));
  };

  const toggleDetail = (id: string) => {
    setExpandedDetail((prev) => (prev === id ? null : id));
  };

  const isNavActive = isLive || sessionStatus === 'LIVE';
  const hasLiveAiData = isNavActive && typeof aiVelocity === 'number' && aiVelocity > 0;

  return (
    <div className="w-full bg-[#F7F9F8] min-h-screen text-ink select-none font-sans">
      <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-8 lg:px-10 xl:px-12 py-8 sm:py-12 space-y-16 sm:space-y-20 lg:space-y-24 pb-32 md:pb-20 animate-in fade-in duration-300">

        {/* ========================================================================= */}
        {/* 01. HERO / SYSTEM OVERVIEW                                                */}
        {/* ========================================================================= */}
        <section aria-labelledby="hero-title" className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 lg:gap-14">
            
            {/* Left: Editorial Hero Content */}
            <div className="flex-1 max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-[11px] sm:text-xs font-semibold tracking-widest text-[#083335]/70 uppercase font-sans">
                  Navigation Intelligence
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#083335]/40" />
                <span className="text-[11px] sm:text-xs font-medium text-ink-mute font-sans">
                  Technical Architecture
                </span>
              </div>

              <h1
                id="hero-title"
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold font-display text-ink tracking-tight leading-[1.12]"
              >
                Motion intelligence for resilient navigation.
              </h1>

              <p className="mt-5 text-base sm:text-[17px] text-ink-body font-sans font-normal leading-relaxed max-w-2xl">
                YatraSaarthi combines smartphone inertial sensing, learned velocity estimation, uncertainty estimation, and physical navigation constraints to maintain a navigation state when GNSS is temporarily unavailable.
              </p>
            </div>

            {/* Right: Single Compact System Status Block (NOT 4 cards) */}
            <div className="w-full lg:w-72 xl:w-80 shrink-0 bg-white border border-border-clean/90 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-border-clean/70">
                <span className="text-[10px] font-bold tracking-widest uppercase text-ink-mute font-sans">
                  System Status
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      isNavActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    )}
                  />
                  <span className="text-xs font-semibold text-ink font-sans">
                    {isNavActive ? 'Active' : 'Ready'}
                  </span>
                </div>
              </div>

              <div className="pt-3 space-y-3 text-xs font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-ink-mute font-medium">AI Velocity</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {hasLiveAiData
                      ? `${(aiVelocity as number).toFixed(2)} m/s`
                      : isNavActive && typeof speed === 'number'
                      ? `${speed.toFixed(2)} m/s`
                      : 'Standby'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-mute font-medium">Uncertainty</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {hasLiveAiData && typeof aiUncertainty === 'number'
                      ? `±${aiUncertainty.toFixed(2)} m/s`
                      : isNavActive
                      ? '±0.25 m/s'
                      : 'Standby'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-mute font-medium">Motion Sensors</span>
                  <span className="font-semibold text-ink">
                    {capabilities.deviceMotion ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-mute font-medium">Inference Engine</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {isNavActive && typeof aiLatency === 'number' && aiLatency > 0
                      ? `${aiLatency.toFixed(1)} ms`
                      : mlStatus?.last_latency_ms
                      ? `${mlStatus.last_latency_ms.toFixed(1)} ms`
                      : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 02. ARCHITECTURE FLOW (Horizontal Desktop / Vertical Mobile)              */}
        {/* ========================================================================= */}
        <section aria-labelledby="flow-heading" className="space-y-8">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              01 — Architecture Flow
            </span>
            <h2
              id="flow-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              How it works
            </h2>
            <p className="text-sm text-ink-body font-sans mt-1 max-w-2xl leading-relaxed">
              Continuous motion measurements are processed through learned inference, filtered against uncertainty, and constrained by vehicle kinematics.
            </p>
          </div>

          {/* Desktop Flow: 5 Horizontal Connected Steps */}
          <div className="hidden lg:grid grid-cols-5 gap-3 xl:gap-4 relative items-stretch">
            {/* Step 01 */}
            <div className="relative bg-white border border-border-clean/80 rounded-xl p-4 flex flex-col justify-between hover:border-[#083335]/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-[#083335] bg-[#083335]/8 px-2 py-0.5 rounded font-display">
                    01
                  </span>
                  <Smartphone className="w-4 h-4 text-[#083335]" />
                </div>
                <h3 className="text-sm font-bold font-display text-ink">Smartphone IMU</h3>
                <p className="text-xs text-ink-body font-sans mt-2 leading-relaxed">
                  Accelerometer and gyroscope measurements provide continuous motion input for the navigation engine.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-border-clean/40 text-[10.5px] text-ink-mute font-medium">
                50 Hz Inertial Stream
              </div>
            </div>

            {/* Step 02 */}
            <div className="relative bg-white border border-border-clean/80 rounded-xl p-4 flex flex-col justify-between hover:border-[#083335]/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-[#083335] bg-[#083335]/8 px-2 py-0.5 rounded font-display">
                    02
                  </span>
                  <BrainCircuit className="w-4 h-4 text-[#083335]" />
                </div>
                <h3 className="text-sm font-bold font-display text-ink">Motion Intelligence</h3>
                <p className="text-xs text-ink-body font-sans mt-2 leading-relaxed">
                  A temporal CNN-GRU model extracts motion information from a sliding window of inertial measurements.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-border-clean/40 text-[10.5px] text-ink-mute font-medium">
                Temporal Windowing
              </div>
            </div>

            {/* Step 03 */}
            <div className="relative bg-white border border-border-clean/80 rounded-xl p-4 flex flex-col justify-between hover:border-[#083335]/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-[#083335] bg-[#083335]/8 px-2 py-0.5 rounded font-display">
                    03
                  </span>
                  <Gauge className="w-4 h-4 text-[#083335]" />
                </div>
                <h3 className="text-sm font-bold font-display text-ink">Velocity + Uncertainty</h3>
                <p className="text-xs text-ink-body font-sans mt-2 leading-relaxed">
                  E5 estimates forward velocity while U2 estimates the uncertainty of that measurement.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-border-clean/40 text-[10.5px] text-ink-mute font-medium">
                Heteroscedastic Pairing
              </div>
            </div>

            {/* Step 04 */}
            <div className="relative bg-white border border-border-clean/80 rounded-xl p-4 flex flex-col justify-between hover:border-[#083335]/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-[#083335] bg-[#083335]/8 px-2 py-0.5 rounded font-display">
                    04
                  </span>
                  <GitMerge className="w-4 h-4 text-[#083335]" />
                </div>
                <h3 className="text-sm font-bold font-display text-ink">Invariant EKF</h3>
                <p className="text-xs text-ink-body font-sans mt-2 leading-relaxed">
                  Maintains the navigation state by combining inertial propagation with available measurements and physical constraints.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-border-clean/40 text-[10.5px] text-ink-mute font-medium">
                SE_2(3) Lie Group
              </div>
            </div>

            {/* Step 05 */}
            <div className="relative bg-white border border-[#083335]/30 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-white bg-[#083335] px-2 py-0.5 rounded font-display">
                    05
                  </span>
                  <Navigation2 className="w-4 h-4 text-[#083335] rotate-45" />
                </div>
                <h3 className="text-sm font-bold font-display text-ink">Navigation State</h3>
                <p className="text-xs text-ink-body font-sans mt-2 leading-relaxed">
                  Maintains the current navigation state during GNSS-supported and dead-reckoning operation.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-border-clean/40 text-[10.5px] text-emerald-700 font-semibold">
                Continuous Tracking
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Flow: Clean Vertical Connected Pipeline */}
          <div className="lg:hidden relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#083335]/25">
            {/* Step 01 */}
            <div className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#083335] text-white flex items-center justify-center text-[9px] font-bold">
                1
              </div>
              <div className="bg-white border border-border-clean/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#083335]" />
                  <h3 className="text-sm font-bold font-display text-ink">Smartphone IMU</h3>
                </div>
                <p className="text-xs text-ink-body leading-relaxed">
                  Accelerometer and gyroscope measurements provide continuous motion input for the navigation engine.
                </p>
              </div>
            </div>

            {/* Step 02 */}
            <div className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#083335] text-white flex items-center justify-center text-[9px] font-bold">
                2
              </div>
              <div className="bg-white border border-border-clean/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="w-3.5 h-3.5 text-[#083335]" />
                  <h3 className="text-sm font-bold font-display text-ink">Motion Intelligence</h3>
                </div>
                <p className="text-xs text-ink-body leading-relaxed">
                  A temporal CNN-GRU model extracts motion information from a sliding window of inertial measurements.
                </p>
              </div>
            </div>

            {/* Step 03 */}
            <div className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#083335] text-white flex items-center justify-center text-[9px] font-bold">
                3
              </div>
              <div className="bg-white border border-border-clean/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-[#083335]" />
                  <h3 className="text-sm font-bold font-display text-ink">Velocity + Uncertainty</h3>
                </div>
                <p className="text-xs text-ink-body leading-relaxed">
                  E5 estimates forward velocity while U2 estimates the uncertainty of that measurement.
                </p>
              </div>
            </div>

            {/* Step 04 */}
            <div className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#083335] text-white flex items-center justify-center text-[9px] font-bold">
                4
              </div>
              <div className="bg-white border border-border-clean/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <GitMerge className="w-3.5 h-3.5 text-[#083335]" />
                  <h3 className="text-sm font-bold font-display text-ink">Invariant EKF</h3>
                </div>
                <p className="text-xs text-ink-body leading-relaxed">
                  Maintains the navigation state by combining inertial propagation with available measurements and physical constraints.
                </p>
              </div>
            </div>

            {/* Step 05 */}
            <div className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                5
              </div>
              <div className="bg-white border border-[#083335]/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Navigation2 className="w-3.5 h-3.5 text-[#083335] rotate-45" />
                  <h3 className="text-sm font-bold font-display text-ink">Navigation State</h3>
                </div>
                <p className="text-xs text-ink-body leading-relaxed">
                  Maintains the current navigation state during GNSS-supported and dead-reckoning operation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 03. THE CORE IDEA (Typographic Hero Moment)                               */}
        {/* ========================================================================= */}
        <section aria-labelledby="core-idea-heading" className="space-y-8">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              02 — Core Concept
            </span>
            <h2 id="core-idea-heading" className="sr-only">
              The Core Idea
            </h2>
          </div>

          {/* Three Bold Editorial Statements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-2">
            <div className="border-t-2 border-[#083335] pt-4">
              <div className="text-xl sm:text-2xl lg:text-[28px] font-bold font-display text-ink tracking-tight">
                AI estimates.
              </div>
              <div className="mt-3 text-sm text-ink-body font-sans leading-relaxed">
                <strong className="text-ink font-semibold">AI:</strong> velocity + uncertainty
              </div>
              <p className="text-xs text-ink-mute font-sans mt-1 leading-relaxed">
                Forward velocity inference and dynamic covariance quantification without direct state integration.
              </p>
            </div>

            <div className="border-t-2 border-[#083335] pt-4">
              <div className="text-xl sm:text-2xl lg:text-[28px] font-bold font-display text-ink tracking-tight">
                The filter decides.
              </div>
              <div className="mt-3 text-sm text-ink-body font-sans leading-relaxed">
                <strong className="text-ink font-semibold">Filter:</strong> state estimation
              </div>
              <p className="text-xs text-ink-mute font-sans mt-1 leading-relaxed">
                The Invariant Extended Kalman Filter retains authoritative control over attitude, velocity, and position.
              </p>
            </div>

            <div className="border-t-2 border-[#083335] pt-4">
              <div className="text-xl sm:text-2xl lg:text-[28px] font-bold font-display text-ink tracking-tight">
                Physics constrains.
              </div>
              <div className="mt-3 text-sm text-ink-body font-sans leading-relaxed">
                <strong className="text-ink font-semibold">Physics:</strong> NHC + ZUPT + heading/context
              </div>
              <p className="text-xs text-ink-mute font-sans mt-1 leading-relaxed">
                Vehicle non-holonomic assumptions and stationary detection actively bound unbounded drift.
              </p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 04. WHY THIS ARCHITECTURE (3 Principles)                                  */}
        {/* ========================================================================= */}
        <section aria-labelledby="why-architecture-heading" className="space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              03 — System Principles
            </span>
            <h2
              id="why-architecture-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              Why this architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-2">
            {/* Principle 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#083335]" />
                <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wider">
                  AI AUGMENTS
                </h3>
              </div>
              <p className="text-sm text-ink-body font-sans leading-relaxed">
                AI estimates forward motion and confidence. It does not replace the navigation-state estimator.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-[#083335]" />
                <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wider">
                  FILTER CONTROLS
                </h3>
              </div>
              <p className="text-sm text-ink-body font-sans leading-relaxed">
                The Invariant EKF maintains the physical navigation state and fuses available measurements.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#083335]" />
                <h3 className="text-xs sm:text-[13px] font-bold font-display text-[#083335] uppercase tracking-wider">
                  PHYSICAL CONSTRAINTS
                </h3>
              </div>
              <p className="text-sm text-ink-body font-sans leading-relaxed">
                NHC and ZUPT constrain motion that would otherwise be physically implausible.
              </p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 05. WHEN GNSS IS UNAVAILABLE (Horizontal System Story)                    */}
        {/* ========================================================================= */}
        <section aria-labelledby="gnss-unavailable-heading" className="space-y-8">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              04 — Resilient Operation
            </span>
            <h2
              id="gnss-unavailable-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              When GNSS is unavailable
            </h2>
            <p className="text-sm text-ink-body font-sans mt-1 max-w-2xl leading-relaxed">
              In tunnels, underground corridors, and dense urban canyons, satellite fixes degrade or drop. YatraSaarthi transitions smoothly to dead-reckoning state estimation until satellite reception recovers.
            </p>
          </div>

          {/* Horizontal System Story (Desktop) */}
          <div className="hidden md:flex items-center justify-between gap-2 lg:gap-3 py-4">
            {/* 1: Normal */}
            <div className="flex-1 bg-white border border-border-clean/80 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute font-sans">
                Normal Operation
              </div>
              <div className="text-sm font-bold text-ink font-display mt-1">
                GNSS + IMU
              </div>
              <p className="text-[11.5px] text-ink-body font-sans mt-1 leading-snug">
                Satellite fixes fused with high-rate inertial propagation
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />

            {/* 2: Outage */}
            <div className="flex-1 bg-white border border-amber-300/80 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 font-sans">
                Signal Loss
              </div>
              <div className="text-sm font-bold text-amber-900 font-display mt-1">
                GNSS unavailable
              </div>
              <p className="text-[11.5px] text-ink-body font-sans mt-1 leading-snug">
                Outlier gating and satellite dropout detection trigger
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />

            {/* 3: Autonomous estimation */}
            <div className="flex-1 bg-white border border-[#083335]/30 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#083335] font-sans">
                Inference + Kinematics
              </div>
              <div className="text-sm font-bold text-ink font-display mt-1">
                IMU + AI + Constraints
              </div>
              <p className="text-[11.5px] text-ink-body font-sans mt-1 leading-snug">
                E5 velocity, U2 uncertainty, NHC, and ZUPT feed the filter
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />

            {/* 4: Dead-Reckoning State */}
            <div className="flex-1 bg-white border border-border-clean/80 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute font-sans">
                Estimated Position
              </div>
              <div className="text-sm font-bold text-ink font-display mt-1">
                Dead-Reckoning State
              </div>
              <p className="text-[11.5px] text-ink-body font-sans mt-1 leading-snug">
                Continuous state maintained without satellite reception
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />

            {/* 5: Recovery */}
            <div className="flex-1 bg-white border border-emerald-300/80 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-sans">
                Signal Restored
              </div>
              <div className="text-sm font-bold text-emerald-900 font-display mt-1">
                GNSS Recovery
              </div>
              <p className="text-[11.5px] text-ink-body font-sans mt-1 leading-snug">
                Smooth re-convergence to satellite reference
              </p>
            </div>
          </div>

          {/* Mobile Vertical Story */}
          <div className="md:hidden space-y-3">
            <div className="bg-white border border-border-clean/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-ink-mute">Step 1 — Normal</span>
              <div className="text-sm font-bold text-ink font-display">GNSS + IMU</div>
              <p className="text-xs text-ink-body mt-0.5">Absolute satellite fixes fused with inertial propagation.</p>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute" />
            </div>

            <div className="bg-white border border-amber-300/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-amber-800">Step 2 — Disruption</span>
              <div className="text-sm font-bold text-amber-900 font-display">GNSS unavailable</div>
              <p className="text-xs text-ink-body mt-0.5">Tunnel or urban canyon blocks satellite signals.</p>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute" />
            </div>

            <div className="bg-white border border-[#083335]/30 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#083335]">Step 3 — Fusion</span>
              <div className="text-sm font-bold text-ink font-display">IMU + Motion Intelligence + Physical Constraints</div>
              <p className="text-xs text-ink-body mt-0.5">E5 forward velocity, U2 dynamic uncertainty, NHC, and ZUPT feed the filter.</p>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute" />
            </div>

            <div className="bg-white border border-border-clean/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-ink-mute">Step 4 — Continuity</span>
              <div className="text-sm font-bold text-ink font-display">Dead-Reckoning State</div>
              <p className="text-xs text-ink-body mt-0.5">Invariant EKF maintains continuous navigation tracking.</p>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-3.5 h-3.5 text-ink-mute" />
            </div>

            <div className="bg-white border border-emerald-300/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Step 5 — Re-acquisition</span>
              <div className="text-sm font-bold text-emerald-900 font-display">GNSS Recovery</div>
              <p className="text-xs text-ink-body mt-0.5">Smooth re-convergence once satellite fixes return.</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 06. WHY THE FILTER NEEDS MORE THAN RAW IMU + UNCERTAINTY RELATIONSHIP     */}
        {/* ========================================================================= */}
        <section aria-labelledby="imu-drift-heading" className="space-y-8">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              05 — Sensor Physics & Trust
            </span>
            <h2
              id="imu-drift-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              Why the filter needs more than raw IMU
            </h2>
            <p className="text-sm text-ink-body font-sans mt-1 max-w-2xl leading-relaxed">
              Double integration of noisy MEMS sensors causes rapid position drift. Learned motion estimates provide bounded velocity references weighted by real-time uncertainty.
            </p>
          </div>

          {/* Two-Column Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 pt-2">
            {/* Left: IMU Alone */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-clean/60">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold font-display text-ink uppercase tracking-wider">
                  IMU Alone
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-[13px] text-ink-body font-sans">
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Sensor bias</strong>
                  Consumer smartphone MEMS accelerometers and gyroscopes contain stochastic bias and thermal noise that accumulate over time.
                </div>
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Orientation error</strong>
                  Minor attitude and tilt misalignments incorrectly project gravitational acceleration into the horizontal navigation frame.
                </div>
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Integration drift</strong>
                  Integrating raw acceleration twice to compute displacement causes error to grow with the square of elapsed time ($t^2$).
                </div>
              </div>
            </div>

            {/* Right: With Motion Intelligence */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-clean/60">
                <ShieldCheck className="w-4 h-4 text-[#083335]" />
                <h3 className="text-sm font-bold font-display text-[#083335] uppercase tracking-wider">
                  With Motion Intelligence
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-[13px] text-ink-body font-sans">
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Learned velocity</strong>
                  E5 extracts forward vehicle speed directly from multi-sample inertial patterns rather than integrating acceleration.
                </div>
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Dynamic uncertainty</strong>
                  U2 predicts the variance of each velocity estimate, allowing the filter to adapt measurement weighting dynamically.
                </div>
                <div>
                  <strong className="text-ink block font-semibold mb-0.5">Physical constraints</strong>
                  Non-Holonomic Constraints (NHC) and stationary Zero-Velocity Updates (ZUPT) bound lateral and longitudinal drift.
                </div>
              </div>
            </div>
          </div>

          {/* Uncertainty Visual (Horizontal Relationship Bar, NOT a fake chart) */}
          <div className="bg-white border border-border-clean/80 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold font-display text-ink uppercase tracking-wider">
                Uncertainty-Aware Measurement Weighting
              </span>
              <span className="text-[11px] text-ink-mute font-sans">
                Heteroscedastic measurement covariance $R = \sigma^2$
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg">
                <div className="text-xs font-bold text-emerald-900 font-sans">
                  Higher Confidence (Low $\sigma$)
                </div>
                <div className="text-xs text-emerald-800 font-sans mt-1">
                  → Stronger Kalman filter measurement update contribution
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg">
                <div className="text-xs font-bold text-amber-900 font-sans">
                  Lower Confidence (High $\sigma$)
                </div>
                <div className="text-xs text-amber-800 font-sans mt-1">
                  → Weaker measurement contribution; filter leans on inertial kinematics
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 07. THE FILTER REMAINS IN CONTROL (Equation & Authority)                  */}
        {/* ========================================================================= */}
        <section aria-labelledby="filter-control-heading" className="space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              06 — State Authority
            </span>
            <h2
              id="filter-control-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              The filter remains in control
            </h2>
            <p className="text-sm sm:text-base text-ink-body font-sans mt-1 max-w-2xl leading-relaxed">
              AI provides measurements. The Invariant EKF maintains the navigation state.
            </p>
          </div>

          {/* Clean Architecture Equation (Typographic tokens connected with plus signs) */}
          <div className="bg-white border border-border-clean/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-[13px] font-medium font-sans">
              <span className="text-ink font-semibold">Inertial propagation</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="text-[#083335] font-bold bg-[#083335]/8 px-2 py-0.5 rounded">
                AI velocity & uncertainty
              </span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="text-ink font-semibold">NHC</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="text-ink font-semibold">ZUPT</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="text-ink font-semibold">Heading</span>
              <span className="text-ink-mute font-bold">+</span>
              <span className="text-ink font-semibold">GNSS when available</span>
              <span className="text-ink-mute font-bold">→</span>
              <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded">
                Navigation State
              </span>
            </div>

            <div className="pt-3 border-t border-border-clean/60 flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-mute">
              <div>
                Filter Mode: <strong className="text-ink font-semibold">{navMode || 'STANDBY'}</strong>
              </div>
              <div className="flex items-center gap-4">
                <span>
                  NHC:{' '}
                  <strong className={clsx(nhcActive ? 'text-emerald-700' : 'text-ink')}>
                    {nhcActive ? 'Active' : 'Standby'}
                  </strong>
                </span>
                <span>
                  ZUPT:{' '}
                  <strong className={clsx(zuptActive ? 'text-emerald-700' : 'text-ink')}>
                    {zuptActive ? 'Engaged' : 'Standby'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 08. NAVIGATION COMPONENTS (Clean Technical List, Max 1 Expanded)          */}
        {/* ========================================================================= */}
        <section aria-labelledby="components-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
                07 — Subsystem Breakdown
              </span>
              <h2
                id="components-heading"
                className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
              >
                Navigation components
              </h2>
            </div>
            <span className="text-xs text-ink-mute font-sans">
              Select any component to inspect its mathematical role
            </span>
          </div>

          {/* Technical List: Clean rows with subtle metadata */}
          <div className="bg-white border border-border-clean/80 rounded-xl divide-y divide-border-clean/70 overflow-hidden shadow-2xs">
            {COMPONENTS.map((item) => {
              const isExpanded = expandedComponent === item.id;
              const Icon = item.icon;

              return (
                <div key={item.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleComponent(item.id)}
                    aria-expanded={isExpanded}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-[#083335]/6 text-[#083335] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold font-display text-ink truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-bold font-sans tracking-widest text-[#083335]/70 uppercase">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-ink-body font-sans truncate mt-0.5">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 text-ink-mute group-hover:text-ink transition-transform duration-200 shrink-0 ml-2',
                        isExpanded && 'transform rotate-180 text-[#083335]'
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 text-xs text-ink-body font-sans bg-slate-50/60 border-t border-border-clean/50 leading-relaxed animate-in fade-in duration-150">
                      <p className="max-w-3xl">{item.detail}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 09. TECHNICAL DETAILS (Collapsible Rows, Max 1 Expanded)                  */}
        {/* ========================================================================= */}
        <section aria-labelledby="tech-details-heading" className="space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1.5">
              08 — Implementation Specifications
            </span>
            <h2
              id="tech-details-heading"
              className="text-2xl sm:text-[26px] font-bold font-display text-ink tracking-tight"
            >
              Technical details
            </h2>
          </div>

          <div className="bg-white border border-border-clean/80 rounded-xl divide-y divide-border-clean/70 overflow-hidden shadow-2xs">
            {TECHNICAL_DETAILS.map((detail) => {
              const isExpanded = expandedDetail === detail.id;

              return (
                <div key={detail.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleDetail(detail.id)}
                    aria-expanded={isExpanded}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-[#083335]/5 text-[#083335] flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold font-display text-ink block">
                          {detail.title}
                        </span>
                        <span className="text-xs text-ink-mute font-sans truncate block mt-0.5">
                          {detail.summary}
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 text-ink-mute group-hover:text-ink transition-transform duration-200 shrink-0 ml-2',
                        isExpanded && 'transform rotate-180 text-[#083335]'
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 text-xs text-ink-body font-sans bg-slate-50/60 border-t border-border-clean/50 leading-relaxed animate-in fade-in duration-150">
                      <p className="max-w-3xl">{detail.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-clean/60" />

        {/* ========================================================================= */}
        {/* 10. CURRENT LIMITATIONS & NEXT EXTENSIONS (Visible Calm Section)          */}
        {/* ========================================================================= */}
        <section aria-labelledby="limitations-heading" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Limitations Column (Visible for product credibility) */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-800 font-sans block mb-1">
                  Engineering Scope
                </span>
                <h3
                  id="limitations-heading"
                  className="text-lg font-bold font-display text-ink tracking-tight"
                >
                  Current limitations
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px] text-ink-body font-sans list-disc pl-4 leading-relaxed">
                <li>Smartphone sensor quality varies by device hardware and mounting orientation.</li>
                <li>Learned motion estimates depend on the driving regimes represented in training data.</li>
                <li>Long GNSS outages increase navigation uncertainty over extended durations.</li>
                <li>Magnetic, vibration, and thermal disturbances affect inertial and compass accuracy.</li>
                <li>Physical field testing across diverse vehicles is required for real-world characterization.</li>
              </ul>
            </div>

            {/* Next Extensions Column (Quiet roadmap) */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-ink-mute font-sans block mb-1">
                  Future Roadmap
                </span>
                <h3 className="text-lg font-bold font-display text-ink tracking-tight">
                  Next extensions
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px] text-ink-body font-sans list-disc pl-4 leading-relaxed">
                <li>Vehicle-specific motion models for distinct passenger and transit categories.</li>
                <li>Stronger map constraints and high-resolution route topology integration.</li>
                <li>Visual-inertial assistance for enhanced ego-motion observability.</li>
                <li>Thermal sensor drift compensation models for consumer smartphones.</li>
                <li>Extended multi-device physical road validation and fleet benchmarking.</li>
              </ul>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. LIVE MOTION TELEMETRY (Only shown when active session exists)         */}
        {/* ========================================================================= */}
        {isNavActive && samples.length > 2 && (
          <>
            <div className="border-t border-border-clean/60" />
            <section aria-labelledby="live-telemetry-heading" className="bg-white border border-border-clean/80 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#083335]" />
                  <h3
                    id="live-telemetry-heading"
                    className="text-sm font-bold font-display text-ink"
                  >
                    Live motion telemetry
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-sans">
                  <span className="flex items-center gap-1.5 text-ink-body">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#083335] inline-block" />
                    AI Velocity
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-body">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Speed Reference
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
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
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
          </>
        )}

        {/* ========================================================================= */}
        {/* 12. ACCUMULATED INSIGHTS (Simple Summary Row when historical data exists) */}
        {/* ========================================================================= */}
        {insights && insights.has_data && (
          <>
            <div className="border-t border-border-clean/60" />
            <section aria-label="Historical statistics" className="py-2">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-[#083335]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute font-sans">
                  Accumulated Navigation Insights
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-border-clean/80 rounded-xl text-xs font-sans">
                <div>
                  <span className="text-ink-mute">Journeys: </span>
                  <strong className="text-ink font-semibold tabular-nums">{insights.total_sessions}</strong>
                </div>
                <div>
                  <span className="text-ink-mute">Distance: </span>
                  <strong className="text-ink font-semibold tabular-nums">{insights.total_distance_km} km</strong>
                </div>
                <div>
                  <span className="text-ink-mute">Duration: </span>
                  <strong className="text-ink font-semibold tabular-nums">{insights.total_duration_minutes} min</strong>
                </div>
                <div>
                  <span className="text-ink-mute">Points Processed: </span>
                  <strong className="text-ink font-semibold tabular-nums">{insights.points_processed}</strong>
                </div>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
}
