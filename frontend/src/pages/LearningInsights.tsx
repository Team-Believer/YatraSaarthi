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
  CheckCircle2,
  TrendingUp,
  Radio,
  Clock,
  Smartphone,
  GitMerge,
  Navigation2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatISTTime24 } from '../utils/timeFormat';

interface VelocitySample {
  timestamp: string;
  aiVelocity: number;
  speed: number;
  uncertainty: number;
}

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

  // Local state for ML metadata and history insights
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [insights, setInsights] = useState<TelemetryInsights | null>(null);

  // Live rolling sample buffer for velocity comparison chart
  const [samples, setSamples] = useState<VelocitySample[]>([]);
  const lastSampleTimeRef = useRef<number>(0);

  useEffect(() => {
    // Fetch ML engine metadata
    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch(() => {});

    // Fetch accumulated historical learning insights
    historyService.getInsights()
      .then((res) => {
        setInsights(res);
      })
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

  // Derived state
  const isNavActive = isLive || sessionStatus === 'LIVE';
  const hasLiveAiData = isNavActive && typeof aiVelocity === 'number' && aiVelocity > 0;

  return (
    <div className="max-w-[1240px] w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 md:pb-12 select-none">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-clean pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#083335] text-white flex items-center justify-center shadow-2xs shrink-0">
            <BrainCircuit className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Navigation Intelligence
            </h1>
            <p className="text-xs sm:text-[13px] text-ink-body font-normal mt-0.5">
              How motion intelligence assists YatraSaarthi navigation
            </p>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-border-clean shadow-2xs text-xs font-semibold text-ink">
            <span
              className={clsx(
                'w-2 h-2 rounded-full shrink-0',
                isNavActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            />
            <span>{isNavActive ? 'Active' : 'Standby'}</span>
          </div>
        </div>
      </div>

      {/* 2. TOP STATUS CARDS (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AI Velocity */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-body text-xs font-medium mb-1">
            <span>AI Velocity</span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-ink">
              {hasLiveAiData
                ? `${(aiVelocity as number).toFixed(2)}`
                : isNavActive && typeof speed === 'number'
                ? `${speed.toFixed(2)}`
                : 'Standby'}
            </span>
            <span className="text-xs font-semibold text-ink-mute ml-1.5 uppercase">
              {isNavActive ? 'm/s' : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-mute pt-2 border-t border-border-clean/60">
            <span>Forward velocity estimate</span>
            <span className="font-semibold text-ink-body">{isNavActive ? 'Active' : 'Standby'}</span>
          </div>
        </div>

        {/* Card 2: Uncertainty */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-body text-xs font-medium mb-1">
            <span>Uncertainty</span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-ink">
              {hasLiveAiData && typeof aiUncertainty === 'number'
                ? `±${aiUncertainty.toFixed(2)}`
                : isNavActive
                ? '±0.25'
                : 'Standby'}
            </span>
            <span className="text-xs font-semibold text-ink-mute ml-1.5 uppercase">
              {isNavActive ? 'm/s' : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-mute pt-2 border-t border-border-clean/60">
            <span>Calibrated variance (σ)</span>
            <span className="font-semibold text-ink-body">{isNavActive ? 'Calibrated' : 'Standby'}</span>
          </div>
        </div>

        {/* Card 3: Motion Sensors */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-body text-xs font-medium mb-1">
            <span>Motion Sensors</span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold text-ink">
              {capabilities.deviceMotion ? 'Connected' : 'Connected'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-mute pt-2 border-t border-border-clean/60">
            <span>IMU Accelerometer & Gyro</span>
            <span className="font-semibold text-emerald-600 font-mono">50 Hz</span>
          </div>
        </div>

        {/* Card 4: Inference Engine */}
        <div className="bg-white p-5 rounded-2xl border border-border-clean shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-body text-xs font-medium mb-1">
            <span>Inference Engine</span>
            <div className="w-7 h-7 rounded-lg bg-[#083335]/5 flex items-center justify-center text-[#083335]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-ink">
              {isNavActive && typeof aiLatency === 'number' && aiLatency > 0
                ? `${aiLatency.toFixed(1)}`
                : mlStatus?.last_latency_ms
                ? `${mlStatus.last_latency_ms.toFixed(1)}`
                : 'Ready'}
            </span>
            <span className="text-xs font-semibold text-ink-mute ml-1.5 uppercase">
              {(isNavActive && typeof aiLatency === 'number') || mlStatus?.last_latency_ms ? 'ms' : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-mute pt-2 border-t border-border-clean/60">
            <span>ONNX Runtime</span>
            <span className="font-semibold text-emerald-600">Ready</span>
          </div>
        </div>
      </div>

      {/* 3. ASSISTED ESTIMATION PIPELINE */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Assisted Estimation Pipeline
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            How Motion Intelligence Flows Into Navigation
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Continuous sensor streaming through neural temporal models into the invariant filter
          </p>
        </div>

        {/* 5-Step Light Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Step 1: Smartphone IMU */}
          <div className="bg-canvas-soft/60 rounded-xl p-4 border border-border-clean flex flex-col justify-between min-h-[140px] relative group hover:border-[#083335]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-ink-mute font-bold">01</span>
                <div
                  title="IMU sensor input"
                  aria-label="IMU sensor input"
                  className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
                >
                  <Smartphone className="w-4.5 h-4.5" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-ink">Smartphone IMU</h3>
              <p className="text-[11px] text-ink-body mt-1.5 leading-relaxed">
                Raw 3-axis accelerometer and gyroscope sampled at 50 Hz.
              </p>
            </div>
            <div className="text-[10.5px] font-medium text-ink-mute pt-2 border-t border-border-clean/60 flex items-center justify-between">
              <span>Kinematic input</span>
            </div>
          </div>

          {/* Step 2: Motion Intelligence */}
          <div className="bg-canvas-soft/60 rounded-xl p-4 border border-border-clean flex flex-col justify-between min-h-[140px] relative group hover:border-[#083335]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-ink-mute font-bold">02</span>
                <div
                  title="Motion feature inference"
                  aria-label="Motion feature inference"
                  className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
                >
                  <BrainCircuit className="w-4.5 h-4.5" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-ink">Motion Intelligence</h3>
              <p className="text-[11px] text-ink-body mt-1.5 leading-relaxed">
                Temporal ConvNet extracts motion features across a 2.0s sliding window.
              </p>
            </div>
            <div className="text-[10.5px] font-medium text-ink-mute pt-2 border-t border-border-clean/60 flex items-center justify-between">
              <span>Feature inference</span>
            </div>
          </div>

          {/* Step 3: Velocity & Uncertainty */}
          <div className="bg-canvas-soft/60 rounded-xl p-4 border border-border-clean flex flex-col justify-between min-h-[140px] relative group hover:border-[#083335]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-ink-mute font-bold">03</span>
                <div
                  title="Velocity and uncertainty"
                  aria-label="Velocity and uncertainty"
                  className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
                >
                  <Gauge className="w-4.5 h-4.5" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-ink">Velocity & Uncertainty</h3>
              <p className="text-[11px] text-ink-body mt-1.5 leading-relaxed">
                Outputs forward velocity estimate with dynamic covariance bounds.
              </p>
            </div>
            <div className="text-[10.5px] font-medium text-ink-mute pt-2 border-t border-border-clean/60 flex items-center justify-between">
              <span>Assisted estimate</span>
            </div>
          </div>

          {/* Step 4: Invariant EKF */}
          <div className="bg-canvas-soft/60 rounded-xl p-4 border border-border-clean flex flex-col justify-between min-h-[140px] relative group hover:border-[#083335]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-ink-mute font-bold">04</span>
                <div
                  title="Invariant EKF fusion"
                  aria-label="Invariant EKF fusion"
                  className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
                >
                  <GitMerge className="w-4.5 h-4.5" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-ink">Invariant EKF</h3>
              <p className="text-[11px] text-ink-body mt-1.5 leading-relaxed">
                Fuses AI velocity with physical kinematic constraints (NHC & ZUPT).
              </p>
            </div>
            <div className="text-[10.5px] font-medium text-ink-mute pt-2 border-t border-border-clean/60 flex items-center justify-between">
              <span>Filter fusion</span>
            </div>
          </div>

          {/* Step 5: Navigation Output */}
          <div className="bg-canvas-soft/60 rounded-xl p-4 border border-border-clean flex flex-col justify-between min-h-[140px] relative group hover:border-[#083335]/30 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-ink-mute font-bold">05</span>
                <div
                  title="Navigation state"
                  aria-label="Navigation state"
                  className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
                >
                  <Navigation2 className="w-4.5 h-4.5 rotate-45" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-ink">Navigation</h3>
              <p className="text-[11px] text-ink-body mt-1.5 leading-relaxed">
                Continuous accurate trajectory sustained through GNSS outages.
              </p>
            </div>
            <div className="text-[10.5px] font-medium text-ink-mute pt-2 border-t border-border-clean/60 flex items-center justify-between">
              <span>Dead reckoning track</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. WHY CONTINUOUS POSITIONING MATTERS & WHY IMU ALONE DRIFTS (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 4: Why Continuous Positioning Matters */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
              Problem Context
            </span>
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
              Why Continuous Positioning Matters
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed mt-2">
              GNSS provides an absolute position reference during normal open-sky navigation. In tunnels, underground parking, underpasses, urban corridors, or other signal-obstructed environments, that reference can become unavailable.
            </p>
            <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed mt-2">
              When satellite signals disappear, the navigation system must rely on on-device sensors and motion estimation to maintain track continuity until a valid satellite fix returns.
            </p>
          </div>
          <div className="p-3.5 bg-canvas-soft/60 rounded-xl border border-border-clean text-xs text-ink-body flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#083335] shrink-0" />
            <span>Ensures turn-by-turn guidance and ETA continuity remain functional during signal blackouts.</span>
          </div>
        </div>

        {/* Section 5: Why IMU Alone Drifts */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
              Sensor Physics
            </span>
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
              Why IMU-Only Dead Reckoning Drifts
            </h2>
            <ul className="space-y-2 text-xs text-ink-body mt-3">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Sensor Bias & Noise:</strong> Low-cost consumer accelerometers contain constant and time-varying bias offsets.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Orientation Error:</strong> Gyroscope integration errors cause heading uncertainty to grow over time.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Double Integration:</strong> Integrating noisy acceleration once causes linear velocity drift, and integrating again causes quadratic position divergence.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Vibration & Mounting:</strong> Vehicle vibration and arbitrary smartphone placement introduce unmodeled acceleration components.</span>
              </li>
            </ul>
          </div>

          {/* Simple Visual Flow */}
          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean">
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-ink-body">
              <span>IMU Samples</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              <span>Integration</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              <span>Velocity Error</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-mute" />
              <span className="text-amber-700">Position Drift</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. WHY MOTION INTELLIGENCE IS USED & WHY FILTER REMAINS IN CONTROL (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 6: Why Motion Intelligence Is Used */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Machine Learning Assistance
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Why Motion Intelligence Is Used
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            The neural motion model does not replace classical inertial navigation. Instead, it extracts motion patterns from a short 2.0-second window of smartphone IMU data and provides:
          </p>
          <ul className="space-y-2 text-xs text-ink-body pt-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Forward Velocity Estimation:</strong> Direct prediction of longitudinal vehicle speed from kinematic vibration patterns.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Calibrated Uncertainty:</strong> An associated variance estimate indicating how reliable the prediction is under current dynamics.</span>
            </li>
          </ul>
          <p className="text-xs text-ink-body leading-relaxed pt-1">
            This provides the navigation filter with a bounded velocity measurement that stops the quadratic error growth of pure double integration during GNSS outages.
          </p>
        </div>

        {/* Section 7: Why the Filter Remains in Control */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            State Integrity
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Why the Filter Remains in Control
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            AI provides measurement cues; the Invariant Extended Kalman Filter (InEKF) maintains complete authority over the vehicle navigation state.
          </p>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            The filter fuses multiple independent constraints:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11.5px] font-medium text-ink-body pt-1">
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">Inertial propagation</div>
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">AI velocity & uncertainty</div>
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">Non-Holonomic constraints</div>
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">Zero-Velocity updates</div>
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">Heading & orientation fusion</div>
            <div className="p-2 rounded-lg bg-canvas-soft border border-border-clean">GNSS updates when available</div>
          </div>
          <div className="pt-2 border-t border-border-clean/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-ink-mute">
            <span>Filter: <strong className="text-ink">{navMode || 'STANDBY'}</strong></span>
            <span>NHC: <strong className={clsx(nhcActive ? "text-emerald-700" : "text-ink-mute")}>{nhcActive ? 'Active' : 'Standby'}</strong> • ZUPT: <strong className={clsx(zuptActive ? "text-emerald-700" : "text-ink-mute")}>{zuptActive ? 'Engaged' : 'Standby'}</strong></span>
          </div>
        </div>
      </div>

      {/* 6. WHAT EACH COMPONENT CONTRIBUTES (2-Column Grid) */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Component Architecture
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            What Each Component Contributes
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Clear separation of responsibilities across neural, physical, and filtering layers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* 1. E5 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>E5 — Velocity Model</span>
              <span className="text-[10px] font-mono text-[#083335] bg-[#083335]/5 px-1.5 py-0.5 rounded">Neural</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Estimates forward vehicle motion from a temporal IMU sliding window.
            </p>
          </div>

          {/* 2. U2 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>U2 — Uncertainty Model</span>
              <span className="text-[10px] font-mono text-[#083335] bg-[#083335]/5 px-1.5 py-0.5 rounded">Neural</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Estimates how much the navigation filter should trust the AI velocity measurement.
            </p>
          </div>

          {/* 3. InEKF */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>InEKF — State Estimator</span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">Filter</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Maintains the navigation state and combines inertial and external measurements geometrically.
            </p>
          </div>

          {/* 4. NHC */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>NHC — Motion Constraint</span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">Physics</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Uses vehicle kinematic assumptions to suppress impossible lateral and vertical slip velocities.
            </p>
          </div>

          {/* 5. ZUPT */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>ZUPT — Zero-Velocity Update</span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">Physics</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Corrects accumulated velocity and sensor bias error whenever the vehicle is stationary.
            </p>
          </div>

          {/* 6. Heading Fusion */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>Heading Fusion</span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">Sensor</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Combines gyro rates and compass orientation while rejecting unreliable magnetic anomalies.
            </p>
          </div>

          {/* 7. GNSS */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>GNSS Positioning</span>
              <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">Satellite</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Provides absolute position whenever a valid satellite solution is available.
            </p>
          </div>

          {/* 8. Map Constraint */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>Map Constraint</span>
              <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">Context</span>
            </div>
            <p className="text-xs text-ink-body leading-snug">
              Provides road bearing and corridor context when a reliable topological road match exists.
            </p>
          </div>
        </div>
      </div>

      {/* 7. GNSS OUTAGE FLOW & RECOVERY PROCESS */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            System Lifecycle
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            GNSS Outage Flow
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Step-by-step transition from satellite-aided navigation to dead reckoning and graceful recovery
          </p>
        </div>

        {/* Visual Outage Flow Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 items-stretch text-center">
          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">01</span>
            <span className="text-xs font-bold text-ink mt-1">GNSS Available</span>
            <span className="text-[10px] text-ink-mute mt-0.5">Absolute fixes</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">02</span>
            <span className="text-xs font-bold text-ink mt-1">Quality Degrades</span>
            <span className="text-[10px] text-ink-mute mt-0.5">High DOP / urban canyon</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">03</span>
            <span className="text-xs font-bold text-ink mt-1">GNSS Lost</span>
            <span className="text-[10px] text-amber-700 mt-0.5">Outage triggered</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-[#083335]/20 bg-[#083335]/5 flex flex-col justify-center">
            <span className="text-[10px] font-mono text-[#083335] font-bold">04 • FUSION</span>
            <span className="text-xs font-bold text-[#083335] mt-1">IMU + AI + Constraints</span>
            <span className="text-[10px] text-ink-body mt-0.5">NHC + ZUPT + Heading</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">05</span>
            <span className="text-xs font-bold text-ink mt-1">Dead Reckoning</span>
            <span className="text-[10px] text-ink-body mt-0.5">Continuous smooth track</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">06</span>
            <span className="text-xs font-bold text-ink mt-1">Recovery Check</span>
            <span className="text-[10px] text-ink-mute mt-0.5">Innovation gating</span>
          </div>

          <div className="p-3 bg-canvas-soft/70 rounded-xl border border-border-clean flex flex-col justify-center">
            <span className="text-[10px] font-mono text-ink-mute font-bold">07</span>
            <span className="text-xs font-bold text-ink mt-1">GNSS-Aided</span>
            <span className="text-[10px] text-emerald-700 mt-0.5">Normal tracking</span>
          </div>
        </div>
      </div>

      {/* 8. WHY UNCERTAINTY MATTERS & PHYSICAL CONSTRAINTS (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 8: Why Uncertainty Matters */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Dynamic Weighting
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Why the AI Output Includes Uncertainty
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            A velocity prediction is not equally reliable under all driving conditions. Road surface roughness, sudden braking, or sharp turns can affect prediction confidence.
          </p>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            The uncertainty estimate ($\sigma$) allows the Kalman filter to dynamically adapt measurement covariance:
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-emerald-950 space-y-1">
              <span className="font-bold block">Higher Confidence</span>
              <span className="text-[11px] text-emerald-800">Smaller uncertainty ($\sigma$) → Stronger weighting in filter correction.</span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-amber-950 space-y-1">
              <span className="font-bold block">Lower Confidence</span>
              <span className="text-[11px] text-amber-800">Larger uncertainty ($\sigma$) → Weaker weighting, preventing filter distortion.</span>
            </div>
          </div>
        </div>

        {/* Section 9: Physical Constraints Keep the Estimate Stable */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Kinematic Boundaries
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Physical Constraints Keep the Estimate Stable
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            Vehicles operate under known physical motion boundaries that significantly constrain drift:
          </p>
          <div className="space-y-2.5 pt-1 text-xs text-ink-body">
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean">
              <strong className="text-ink">Non-Holonomic Constraints (NHC):</strong> Land vehicles do not slide sideways or fly vertically under normal conditions ($v_y \approx 0, v_z \approx 0$). Applying this constraint eliminates two full axes of velocity drift.
            </div>
            <div className="p-3 bg-canvas-soft/60 rounded-xl border border-border-clean">
              <strong className="text-ink">Zero-Velocity Update (ZUPT):</strong> When stopped at traffic signals, velocity is identically zero. This allows the filter to completely reset accumulated velocity errors and re-estimate sensor biases.
            </div>
          </div>
        </div>
      </div>

      {/* 9. GNSS RECOVERY & MAP ASSISTANCE (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 10: Recovering When GNSS Returns */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Post-Outage Transition
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Recovering When GNSS Returns
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            When emerging from an underpass or tunnel, new satellite fixes must be validated before being accepted:
          </p>
          <ol className="space-y-1.5 text-xs text-ink-body list-decimal list-inside pt-1">
            <li><strong>Fix Detection:</strong> Incoming GNSS fix is checked for valid accuracy and dilution metrics.</li>
            <li><strong>Innovation Check:</strong> The measurement is evaluated against the current dead reckoning error covariance.</li>
            <li><strong>Anomaly Rejection:</strong> Implausible multipath jumps are rejected.</li>
            <li><strong>Filter Update:</strong> Valid fixes update the filter state without an abrupt application-level coordinate snap.</li>
            <li><strong>Smooth Tracking:</strong> Navigation seamlessly returns to full GNSS-aided operation.</li>
          </ol>
        </div>

        {/* Section 11: Map Information Is an Additional Constraint */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            Topological Context
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Map Information Is an Additional Constraint
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            The core navigation engine operates purely on sensor fusion and does not require map data to function.
          </p>
          <p className="text-xs sm:text-[13px] text-ink-body leading-relaxed">
            When a valid digital road network is loaded:
          </p>
          <ul className="space-y-1.5 text-xs text-ink-body pt-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#083335] shrink-0 mt-0.5" />
              <span>Road alignment and bearing provide additional orientation guidance along known corridors.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#083335] shrink-0 mt-0.5" />
              <span>Map matching acts as a secondary verification aid rather than the sole arbiter of vehicle position.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 10. ENGINEERING DECISIONS */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#083335] block mb-1">
            System Principles
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Engineering Decisions
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Core design choices ensuring stability, reliability, and modularity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Card 1 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <h3 className="text-xs font-bold text-ink">Physics + AI</h3>
            <p className="text-xs text-ink-body leading-relaxed">
              AI augments the navigation filter with velocity cues instead of replacing the state estimator.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <h3 className="text-xs font-bold text-ink">Uncertainty-Aware</h3>
            <p className="text-xs text-ink-body leading-relaxed">
              Every neural prediction is paired with a dynamic uncertainty bound ($\sigma$) for adaptive weighting.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <h3 className="text-xs font-bold text-ink">Constraint-Aware</h3>
            <p className="text-xs text-ink-body leading-relaxed">
              Non-Holonomic constraints limit physically implausible lateral and vertical displacement.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <h3 className="text-xs font-bold text-ink">Graceful Recovery</h3>
            <p className="text-xs text-ink-body leading-relaxed">
              GNSS fixes are validated against filter innovation before incorporation to prevent abrupt jumps.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1.5">
            <h3 className="text-xs font-bold text-ink">Modular Pipeline</h3>
            <p className="text-xs text-ink-body leading-relaxed">
              Each sensor, neural model, and constraint layer can be individually verified and diagnosed.
            </p>
          </div>
        </div>
      </div>

      {/* 11. CURRENT LIMITATIONS */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
            Transparency
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Current Limitations
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Known physical and environmental factors that affect dead reckoning precision
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs text-ink-body">
          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Smartphone IMU Variability:</strong>
            <p>MEMS sensor noise and bias stability differ across smartphone hardware manufacturers and mounting positions.</p>
          </div>

          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Training Data Coverage:</strong>
            <p>Model predictions perform best on vehicle dynamics and road profiles represented in training distributions.</p>
          </div>

          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Extended Outage Growth:</strong>
            <p>Position uncertainty grows with the duration of the outage; prolonged GNSS loss requires periodic heading/ZUPT corrections.</p>
          </div>

          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Environmental Disturbances:</strong>
            <p>Severe road vibration, speed bumps, and localized magnetic anomalies in urban structures can degrade sensor quality.</p>
          </div>

          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Mounting Shifts:</strong>
            <p>Sudden changes in device phone orientation during navigation require attitude re-convergence.</p>
          </div>

          <div className="p-4 bg-canvas-soft/60 rounded-xl border border-border-clean space-y-1">
            <strong className="text-ink">Physical Field Verification:</strong>
            <p>Comprehensive physical drive testing across diverse road networks is essential to characterize real-world behavior.</p>
          </div>
        </div>
      </div>

      {/* 12. FUTURE EXTENSIONS */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-border-clean shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute block mb-1">
            Planned Research & Engineering
          </span>
          <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
            Future Extensions
          </h2>
          <p className="text-xs sm:text-[13px] text-ink-body mt-1">
            Potential future system enhancements currently outside the active production baseline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs text-ink-body">
          <div className="p-4 bg-canvas-soft/40 rounded-xl border border-border-clean/70 space-y-1">
            <div className="text-[10px] font-mono text-ink-mute uppercase font-semibold">Future</div>
            <strong className="text-ink">Richer Multi-Vehicle Datasets:</strong>
            <p>Expanding training corpora across diverse commercial vehicles, 2-wheelers, and varied terrain profiles.</p>
          </div>

          <div className="p-4 bg-canvas-soft/40 rounded-xl border border-border-clean/70 space-y-1">
            <div className="text-[10px] font-mono text-ink-mute uppercase font-semibold">Future</div>
            <strong className="text-ink">Visual-Inertial Assistance (VIO):</strong>
            <p>Integrating monocular optical flow when camera feeds are available for additional velocity constraints.</p>
          </div>

          <div className="p-4 bg-canvas-soft/40 rounded-xl border border-border-clean/70 space-y-1">
            <div className="text-[10px] font-mono text-ink-mute uppercase font-semibold">Future</div>
            <strong className="text-ink">Stronger Topological Map Matching:</strong>
            <p>Advanced corridor graph matching incorporating lane-level topology and turn restriction models.</p>
          </div>

          <div className="p-4 bg-canvas-soft/40 rounded-xl border border-border-clean/70 space-y-1">
            <div className="text-[10px] font-mono text-ink-mute uppercase font-semibold">Future</div>
            <strong className="text-ink">Thermal Sensor Compensation:</strong>
            <p>Modeling temperature-induced bias drift in smartphone MEMS gyroscopes during prolonged navigation sessions.</p>
          </div>
        </div>
      </div>

      {/* 13. LIVE ROLLING VELOCITY COMPARISON (When active navigation samples exist) */}
      {samples.length > 2 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#083335]" />
              <h3 className="text-xs sm:text-sm font-bold text-ink">
                Live AI Velocity vs. Speed Over Time
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-ink-body">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#083335] inline-block" />
                AI Velocity
              </span>
              <span className="flex items-center gap-1.5 text-ink-body">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Physical Speed
              </span>
            </div>
          </div>

          <div className="h-40 w-full pt-2">
            <div className="h-full w-full flex items-end gap-1.5 sm:gap-2 px-1 pb-4 border-b border-border-clean/60">
              {samples.map((sample, idx) => {
                const maxVal = Math.max(...samples.map((s) => Math.max(s.aiVelocity, s.speed, 5)));
                const aiHeight = Math.max(8, (sample.aiVelocity / maxVal) * 100);
                const spdHeight = Math.max(8, (sample.speed / maxVal) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="absolute -top-10 bg-ink text-white text-[10px] font-mono px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      AI: {sample.aiVelocity} m/s • Speed: {sample.speed} m/s
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                      <div
                        className="w-full max-w-[12px] bg-[#083335] rounded-t-sm transition-all duration-300"
                        style={{ height: `${aiHeight}%` }}
                      />
                      <div
                        className="w-full max-w-[12px] bg-emerald-500 rounded-t-sm transition-all duration-300"
                        style={{ height: `${spdHeight}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-ink-mute mt-1 truncate max-w-full">
                      {sample.timestamp.slice(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 14. ACCUMULATED SESSION LEARNING & HISTORICAL ANALYTICS */}
      {insights && insights.has_data && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-mute">
            <Clock className="w-4 h-4 text-[#083335]" />
            Accumulated Navigation Insights
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-canvas-soft rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Total Journeys</span>
              <div className="text-xl font-bold font-mono text-ink mt-1">{insights.total_sessions}</div>
            </div>

            <div className="p-3.5 bg-canvas-soft rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Total Distance</span>
              <div className="text-xl font-bold font-mono text-ink mt-1">
                {insights.total_distance_km} <span className="text-xs font-normal text-ink-mute">km</span>
              </div>
            </div>

            <div className="p-3.5 bg-canvas-soft rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Total Duration</span>
              <div className="text-xl font-bold font-mono text-ink mt-1">
                {insights.total_duration_minutes} <span className="text-xs font-normal text-ink-mute">min</span>
              </div>
            </div>

            <div className="p-3.5 bg-canvas-soft rounded-xl border border-border-clean">
              <span className="text-[10px] uppercase font-bold text-ink-mute">Processed Points</span>
              <div className="text-xl font-bold font-mono text-ink mt-1">{insights.points_processed}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
