import {
  Layers,
  Cpu,
  Radio,
  BrainCircuit,
  Zap,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Car,
} from 'lucide-react';

export function ArchitectureOverview() {
  return (
    <div className="space-y-6 pt-2 select-none">
      {/* SECTION HEADER */}
      <div className="border-t border-slate-200/80 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full mb-2 border border-brand-100">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Technical Architecture & AI/ML Pipeline</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            How YatraSaarthi Achieves Beyond-GPS Precision
          </h2>
          <p className="text-xs md:text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            A physics-informed fusion engine pairing W3C Web Hardware Sensors with Lie-group Invariant Kalman Filtering (InEKF) and AI/ML residual displacement models.
          </p>
        </div>
      </div>

      {/* 1. VISUAL SYSTEM PIPELINE FLOW DIAGRAM */}
      <div className="bg-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BrainCircuit className="w-64 h-64 text-brand-300" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm md:text-base font-bold flex items-center gap-2 text-white tracking-tight">
            <Layers className="w-4 h-4 text-brand-400" />
            End-to-End Sensor-Fusion & Trajectory Pipeline
          </h3>
          <span className="text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10">
            Real-Time Lie-Group SO(3)
          </span>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3.5 relative z-10">
          {/* Step 1 */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mb-2.5 border border-blue-400/30">
                01
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">Hardware Layer</h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                Raw W3C Geolocation + 3-Axis IMU (Acc/Gyro/Mag) @ 50Hz.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-blue-300 font-mono">
              <Radio className="w-3 h-3 shrink-0" />
              <span>Sensor Sampling</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs mb-2.5 border border-amber-400/30">
                02
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">InEKF Mechanics</h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                Invariant Error-State Lie-group filter with ZUPT & zero-slip constraints.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-amber-300 font-mono">
              <Cpu className="w-3 h-3 shrink-0" />
              <span>Physics Core</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs mb-2.5 border border-purple-400/30">
                03
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">AI/ML Residuals</h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                Neural displacement model predicting step lengths & covariance bounds.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-purple-300 font-mono">
              <BrainCircuit className="w-3 h-3 shrink-0" />
              <span>Drift Compensation</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-2.5 border border-emerald-400/30">
                04
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">Map Alignment</h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                Probabilistic HMM road network matching for trajectory snapping.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Clean Position</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONCEPTUAL CARDS GRID */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-5">
        {/* Card 1: GNSS + INS Fusion */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Radio className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">GNSS + INS Fusion</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Combines satellite signals (GPS, NavIC, GLONASS) with smartphone accelerometer and gyroscope measurements. When satellite visibility vanishes, the system seamlessly transitions to inertial dead reckoning.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Tight Coupling</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Zero Interruption</span>
          </div>
        </div>

        {/* Card 2: Invariant Error-State EKF */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Invariant EKF (InEKF)</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Formulated directly on Lie groups (SO(3) x R³ x R³). By operating on matrix Lie algebra rather than Euler angles, InEKF guarantees mathematical stability without gimbal lock or linearization breakdown under aggressive turning.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Lie Group Algebra</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Gimbal-Lock Free</span>
          </div>
        </div>

        {/* Card 3: AI/ML Motion Estimation Engine */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <BrainCircuit className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">AI/ML Motion Engine</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Learns residual sensor bias and estimates instant step/wheel displacement. When standard IMU integration accumulates drift, neural models correct covariance matrices dynamically using historical velocity patterns.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Neural Residuals</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Drift Suppression</span>
          </div>
        </div>

        {/* Card 4: Adaptive Non-Holonomic Constraints (NHC) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Car className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Adaptive Vehicle Constraints</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Ground vehicles cannot slide sideways or jump vertically into the air under normal driving. NHC enforces strict lateral ($v_y = 0$) and vertical ($v_z = 0$) velocity constraints in the vehicle body frame.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Car / Truck / Auto</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">NHC Active</span>
          </div>
        </div>

        {/* Card 5: Phone Auto-Alignment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Phone Auto-Alignment</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Drivers mount phones at arbitrary angles on dashboards or windshields. YatraSaarthi dynamically estimates the rotational transform between the smartphone sensor coordinate frame and the vehicle moving frame.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Dynamic Calibration</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Auto Pitch/Roll</span>
          </div>
        </div>

        {/* Card 6: Indian Road & Sensor Conditions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Indian Road Optimization</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Engineered for real Indian driving environments: speed bumps, potholes, bumper-to-bumper urban traffic, flyovers, underpasses, and high magnetic disturbance near electric infrastructure.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
            <span>Ruggedized Filtering</span>
            <span className="text-[10px] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">Pothole Resistant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

