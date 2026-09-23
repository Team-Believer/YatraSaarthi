import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { fetchMLStatus, fetchModels, type MLStatusResponse, type RegisteredModel } from '../services/api/mlService';
import { historyService, type TelemetryInsights } from '../services/api/historyService';
import {
  BrainCircuit,
  Cpu,
  ShieldCheck,
  Activity,
  Layers,
  Zap,
  Gauge,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Radio,
  Clock,
  Compass,
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
  // Store Subscriptions (Focused selectors for optimal performance)
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const speed = useNavigationStore((s) => s.state.speed);
  const aiVelocity = useNavigationStore((s) => s.state.ai_velocity);
  const aiUncertainty = useNavigationStore((s) => s.state.ai_uncertainty_sigma);
  const aiLatency = useNavigationStore((s) => s.state.ai_inference_latency_ms);
  const aiWindowFill = useNavigationStore((s) => s.state.ai_window_fill_pct);
  const aiTotalInferences = useNavigationStore((s) => s.state.ai_total_inferences);
  const accelBias = useNavigationStore((s) => s.state.accel_bias);
  const gyroBias = useNavigationStore((s) => s.state.gyro_bias);
  const nhcActive = useNavigationStore((s) => s.state.nhc_active);
  const zuptActive = useNavigationStore((s) => s.state.zupt_active);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);

  const capabilities = useSensorStore((s) => s.capabilities);

  // Local state for ML metadata and history insights
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [modelsList, setModelsList] = useState<RegisteredModel[]>([]);
  const [insights, setInsights] = useState<TelemetryInsights | null>(null);

  // Live rolling sample buffer for velocity comparison chart
  const [samples, setSamples] = useState<VelocitySample[]>([]);
  const lastSampleTimeRef = useRef<number>(0);

  useEffect(() => {
    // Fetch ML engine metadata
    fetchMLStatus()
      .then((res) => setMlStatus(res))
      .catch(() => {});

    fetchModels()
      .then((res) => {
        if (res && res.models) {
          setModelsList(res.models);
        }
      })
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
    <div className="max-w-[1240px] w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-24 md:pb-12 select-none">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#083335] to-[#0e4345] text-white flex items-center justify-center shadow-md shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              AI Motion Intelligence
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500">
              Machine-learning assistance for inertial navigation & dead reckoning
            </p>
          </div>
        </div>

        {/* Engine Operational Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span
              className={clsx(
                'w-2 h-2 rounded-full shrink-0',
                isNavActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            />
            <span>{isNavActive ? 'Inference Engine Active' : 'Model Ready (Standby)'}</span>
          </div>
        </div>
      </div>

      {/* 2. AI SYSTEM OVERVIEW & FUSION PIPELINE FLOW */}
      <div className="bg-[#083335] text-white rounded-3xl p-5 sm:p-7 border border-[#0e4345] shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Architecture Overview
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              AI-Assisted Inertial Navigation Pipeline
            </h2>
          </div>
          <span className="text-[11px] font-mono text-white/80 bg-white/10 px-3 py-1 rounded-lg border border-white/10 self-start sm:self-auto">
            Lie-Group InEKF Fusion
          </span>
        </div>

        {/* Visual Pipeline Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1: Smartphone IMU */}
          <div className="bg-[#052426]/90 rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-blue-400 font-bold">01 • INPUT</span>
                <Radio className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Smartphone IMU</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Raw 3-axis accelerometer and gyroscope streamed @ 50 Hz.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-700/60">
              W3C Sensor API
            </div>
          </div>

          {/* Step 2: AI Motion Model */}
          <div className="bg-[#052426]/90 rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-purple-400 font-bold">02 • INFERENCE</span>
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h3 className="text-xs font-bold text-white">AI Motion Model</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Temporal ConvNet predicts body-frame longitudinal velocity.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-white/10">
              2.0s Sliding Window
            </div>
          </div>

          {/* Step 3: Calibrated Uncertainty */}
          <div className="bg-[#052426]/90 rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-amber-400 font-bold">03 • VARIANCE</span>
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Uncertainty Bounds</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Heteroscedastic model scales dynamic covariance noise (σ).
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-white/10">
              Residual Calibration
            </div>
          </div>

          {/* Step 4: InEKF Fusion */}
          <div className="bg-[#052426]/90 rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">04 • FUSION</span>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h3 className="text-xs font-bold text-white">InEKF Estimator</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Invariant Lie-group filter fuses AI velocity with NHC & ZUPT constraints.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-white/10">
              SE₂(3) Lie Group
            </div>
          </div>

          {/* Step 5: Navigation Estimate */}
          <div className="bg-[#052426]/90 rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-sky-400 font-bold">05 • OUTPUT</span>
                <Compass className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Navigation Track</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Continuous smooth trajectory sustained through GNSS outages.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-white/10">
              Zero-GNSS Resilient
            </div>
          </div>
        </div>
      </div>

      {/* 3. CURRENT AI INFERENCE OUTPUTS (Live Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: AI Velocity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>AI Velocity Estimate</span>
            <Activity className="w-4 h-4 text-brand-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {hasLiveAiData
                ? `${(aiVelocity as number).toFixed(2)}`
                : isNavActive && typeof speed === 'number'
                ? `${speed.toFixed(2)}`
                : 'Standby'}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1.5 uppercase">
              {isNavActive ? 'm/s' : ''}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isNavActive ? 'Longitudinal forward prediction' : 'Available during active navigation'}
          </div>
        </div>

        {/* Metric 2: Calibrated Uncertainty */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Calibrated Uncertainty (σ)</span>
            <Gauge className="w-4 h-4 text-brand-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {hasLiveAiData && typeof aiUncertainty === 'number'
                ? `±${aiUncertainty.toFixed(2)}`
                : isNavActive
                ? '±0.25'
                : 'Standby'}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1.5 uppercase">
              {isNavActive ? 'm/s' : ''}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isNavActive ? 'Dynamic covariance sigma scale' : 'Available during active navigation'}
          </div>
        </div>

        {/* Metric 3: Window Buffer Fill */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Sliding Window Buffer</span>
            <Layers className="w-4 h-4 text-brand-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {isNavActive ? `${Math.round(aiWindowFill || 100)}%` : 'Ready'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isNavActive ? '100 samples / 2.0s temporal buffer' : '100 samples @ 50 Hz configured'}
          </div>
        </div>

        {/* Metric 4: Inference Latency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Inference Latency</span>
            <Zap className="w-4 h-4 text-brand-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {isNavActive && typeof aiLatency === 'number' && aiLatency > 0
                ? `${aiLatency.toFixed(1)}`
                : mlStatus?.last_latency_ms
                ? `${mlStatus.last_latency_ms.toFixed(1)}`
                : 'Ready'}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1.5 uppercase">
              {(isNavActive && typeof aiLatency === 'number') || mlStatus?.last_latency_ms ? 'ms' : ''}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {mlStatus ? `Total inferences: ${mlStatus.total_inferences || aiTotalInferences}` : 'Optimized ONNX Runtime'}
          </div>
        </div>
      </div>

      {/* 4. ROLLING VELOCITY & UNCERTAINTY TIME-SERIES */}
      {samples.length > 2 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Live AI Velocity vs. Speed Over Time
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" />
                AI Velocity
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Physical Speed
              </span>
            </div>
          </div>

          {/* Simple Clean Responsive SVG Chart */}
          <div className="h-44 w-full pt-2">
            <div className="h-full w-full flex items-end gap-1.5 sm:gap-2 px-1 pb-4 border-b border-slate-100">
              {samples.map((sample, idx) => {
                const maxVal = Math.max(...samples.map((s) => Math.max(s.aiVelocity, s.speed, 5)));
                const aiHeight = Math.max(8, (sample.aiVelocity / maxVal) * 100);
                const spdHeight = Math.max(8, (sample.speed / maxVal) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      AI: {sample.aiVelocity} m/s • Speed: {sample.speed} m/s
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                      {/* AI Velocity Bar */}
                      <div
                        className="w-full max-w-[12px] bg-brand-600/90 rounded-t-sm transition-all duration-300"
                        style={{ height: `${aiHeight}%` }}
                      />
                      {/* Physical Speed Bar */}
                      <div
                        className="w-full max-w-[12px] bg-emerald-500/90 rounded-t-sm transition-all duration-300"
                        style={{ height: `${spdHeight}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">
                      {sample.timestamp.slice(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. INEKF INTEGRATION & SENSOR INPUTS (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: InEKF Integration Explanation */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              InEKF Fusion Role
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Why AI Does Not Dictate Position Directly
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2">
              Yatra-Sarthi maintains technical safety by separating prediction from estimation. The AI model predicts forward motion information and calibrated uncertainty ($\sigma$).
            </p>
            <div className="space-y-2.5 mt-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Kinematic Non-Holonomic Constraints (NHC):</strong> Enforces zero lateral and vertical slip velocities ($v_y = 0, v_z = 0$).
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Zero-Velocity Update (ZUPT):</strong> Detects stationary vehicle stops to eliminate accumulated velocity and bias drift.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Lie-Group Invariant Error States:</strong> Preserves geometric consistency on $SE_2(3)$ without gimbal lock or linear approximations.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Filter Mode: {navMode || 'STANDBY'}</span>
            <span>NHC: {nhcActive ? 'Active' : 'Standby'} • ZUPT: {zuptActive ? 'Engaged' : 'Standby'}</span>
          </div>
        </div>

        {/* Right: Sensor & IMU Input Stream Summary */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Radio className="w-4 h-4 text-brand-600" />
              Hardware Motion Inputs
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Sensor Feeds & Bias Estimation
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2">
              Hardware motion sensors continuously supply raw 50 Hz kinematic samples into the sliding-window buffer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Accelerometer */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Accelerometer</span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    {capabilities.deviceMotion ? 'Hardware 50Hz' : 'Sim/Stream'}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between"><span>Bias X:</span> <span>{accelBias[0]?.toFixed(4) || '0.0000'} m/s²</span></div>
                  <div className="flex justify-between"><span>Bias Y:</span> <span>{accelBias[1]?.toFixed(4) || '0.0000'} m/s²</span></div>
                  <div className="flex justify-between"><span>Bias Z:</span> <span>{accelBias[2]?.toFixed(4) || '0.0000'} m/s²</span></div>
                </div>
              </div>

              {/* Gyroscope */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Gyroscope</span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    {capabilities.deviceMotion ? 'Hardware 50Hz' : 'Sim/Stream'}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between"><span>Bias X:</span> <span>{gyroBias[0]?.toFixed(4) || '0.0000'} rad/s</span></div>
                  <div className="flex justify-between"><span>Bias Y:</span> <span>{gyroBias[1]?.toFixed(4) || '0.0000'} rad/s</span></div>
                  <div className="flex justify-between"><span>Bias Z:</span> <span>{gyroBias[2]?.toFixed(4) || '0.0000'} rad/s</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Sampling: 50.0 Hz</span>
            <span>Orientation: {capabilities.deviceOrientation ? 'Available' : 'Synthetic IMU'}</span>
          </div>
        </div>
      </div>

      {/* 6. REGISTERED MODEL REGISTRY & STATUS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <Cpu className="w-4 h-4 text-brand-600" />
              Model Architecture Registry
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Production Velocity & Uncertainty Models
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            Active: {mlStatus?.active_model_name || 'E5 Temporal ConvNet (Production)'}
          </span>
        </div>

        {/* Model Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelsList && modelsList.length > 0 ? (
            modelsList.map((model) => {
              const isActive = model.model_id === mlStatus?.active_model_id;
              return (
                <div key={model.model_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx("w-2 h-2 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        {model.name} {model.version ? `(${model.version})` : ''}
                      </h4>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-mono font-bold text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {model.architecture} — {model.output_description} ({model.output_units})
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-600">
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-[9.5px] text-slate-400 block font-sans">Window</span>
                      {model.window_samples ? `${model.window_samples} samples` : '100 samples'}
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-[9.5px] text-slate-400 block font-sans">Status</span>
                      {model.status || 'Ready'}
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <span className="text-[9.5px] text-slate-400 block font-sans">Params</span>
                      {model.parameters ? `${(model.parameters / 1000).toFixed(0)}k` : '—'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <>
              {/* Primary Model: E5 Temporal ConvNet */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      E5 — Temporal Dilated ConvNet (Longitudinal Velocity)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    142k Params
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Dilated 1D convolutions with residual causal skip connections for high-frequency IMU temporal feature extraction.
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-600">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Window</span>
                    100 samples (2s)
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Rate</span>
                    50 Hz
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Output</span>
                    v_x (m/s)
                  </div>
                </div>
              </div>

              {/* Uncertainty Model: U2 Heteroscedastic */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      U2 — Heteroscedastic Uncertainty Network
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Calibrated σ
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Gaussian negative log-likelihood estimator paired with empirical scaling to prevent filter divergence during maneuvers.
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-600">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Calibration</span>
                    k = 1.28
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Floor</span>
                    σ_floor = 0.20
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[9.5px] text-slate-400 block font-sans">Output</span>
                    σ_val (m/s)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 7. SESSION LEARNING & HISTORICAL ANALYTICS */}
      {insights && insights.has_data && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="w-4 h-4 text-brand-600" />
            Accumulated Navigation Insights
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Journeys</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{insights.total_sessions}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Distance</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {insights.total_distance_km} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Duration</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {insights.total_duration_minutes} <span className="text-xs font-normal text-slate-500">min</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Processed Points</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{insights.points_processed}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

