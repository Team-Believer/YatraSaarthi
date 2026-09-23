import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  Compass,
  Map,
  Camera,
  Cpu,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { YatraSaarthiLogo } from '../components/branding/YatraSaarthiLogo';

const slides = [
  {
    title: 'Your journey, our priority',
    description:
      'Yatra-Sarthi uses smartphone inertial sensors, neural motion estimation, and vehicle kinematics to maintain pinpoint navigation — even during GNSS signal dropouts.',
    icons: [
      { Icon: Wifi, label: 'GNSS' },
      { Icon: Cpu, label: 'IMU' },
      { Icon: Compass, label: 'Magnetometer' },
      { Icon: Camera, label: 'Vision' },
      { Icon: Map, label: 'Map match' },
    ],
  },
  {
    title: 'Works even when GPS fails',
    description:
      'Continuous dead reckoning keeps you moving through tunnels, underpasses, underground garages, and dense urban canyons without drifting.',
    highlight: 'Continuous dead reckoning',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const finishOnboarding = () => {
    localStorage.setItem('ys_onboarded', 'true');
    navigate('/app', { replace: true });
  };

  const current = slides[step];

  return (
    <div className="min-h-screen bg-white flex flex-col select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-clean">
        <YatraSaarthiLogo variant="compact" height={36} />
        <button
          onClick={handleSkip}
          className="btn-subtle text-xs py-1.5 px-3.5"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {current.title}
          </h1>

          <p className="text-sm text-ink-body leading-relaxed">{current.description}</p>

          {/* Step 1: Sensor Icons */}
          {step === 0 && current.icons && (
            <div className="py-6">
              <div className="relative w-64 h-64 mx-auto">
                {/* Central icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#083335] rounded-full flex items-center justify-center shadow-xs z-10">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>

                {/* Orbiting icons */}
                {current.icons.map((item, i) => {
                  const angle = (i * 72 - 90) * (Math.PI / 180);
                  const radius = 95;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div
                      key={item.label}
                      className="absolute flex flex-col items-center gap-1"
                      style={{
                        left: `calc(50% + ${x}px - 22px)`,
                        top: `calc(50% + ${y}px - 22px)`,
                        animation: `fadeInUp 0.4s ease ${i * 100}ms forwards`,
                        opacity: 0,
                      }}
                    >
                      <div className="w-11 h-11 bg-canvas-soft rounded-full flex items-center justify-center border border-border-clean">
                        <item.Icon className="w-5 h-5 text-ink" />
                      </div>
                      <span className="text-[10px] font-medium text-ink-body">
                        {item.label}
                      </span>
                    </div>
                  );
                })}

                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <circle
                    cx="128"
                    cy="128"
                    r="95"
                    stroke="currentColor"
                    className="text-border-clean"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Step 2: Feature highlight */}
          {step === 1 && (
            <div className="py-6 space-y-4">
              <div className="bg-canvas-soft rounded-2xl p-6 border border-border-clean text-left space-y-3">
                <div className="w-10 h-10 bg-[#083335] rounded-full flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-ink text-sm sm:text-base">
                  {current.highlight}
                </h3>
                <p className="text-xs text-ink-body leading-relaxed">
                  Invariant Extended Kalman Filter (InEKF) fusion and Zero-velocity updates (ZUPT) guarantee continuous vehicle trajectory tracking.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 max-w-sm w-full mx-auto space-y-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-[#083335]' : 'w-1.5 bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm"
        >
          <span>{step < slides.length - 1 ? 'Continue' : 'Get started'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
