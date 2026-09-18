import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  Wifi,
  Compass,
  Map,
  Camera,
  Cpu,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const slides = [
  {
    title: 'Your Journey, Our Priority',
    description:
      'YatraSaarthi uses your phone\'s sensors, AI and real-world context to keep you on track — even when GPS is lost.',
    icons: [
      { Icon: Wifi, label: 'GPS' },
      { Icon: Cpu, label: 'IMU' },
      { Icon: Compass, label: 'Magnetometer' },
      { Icon: Camera, label: 'Camera' },
      { Icon: Map, label: 'Map' },
    ],
  },
  {
    title: 'Works Even When GPS Fails',
    description:
      'Our system predicts GNSS outages, uses your environment, and learns from past journeys to keep you moving accurately.',
    highlight: 'GNSS Lost? No Problem!',
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-brand-600">
          <Navigation className="w-6 h-6 fill-brand-600" />
          <span className="text-lg font-bold text-brand-navy">YatraSaarthi</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-brand-600 font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="text-3xl font-bold text-brand-navy leading-tight">
            {current.title}
          </h1>

          <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>

          {/* Step 1: Sensor Icons */}
          {step === 0 && current.icons && (
            <div className="py-8">
              <div className="relative w-64 h-64 mx-auto">
                {/* Central icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/30 z-10">
                  <Navigation className="w-8 h-8 text-white fill-white" />
                </div>

                {/* Orbiting icons */}
                {current.icons.map((item, i) => {
                  const angle = (i * 72 - 90) * (Math.PI / 180);
                  const radius = 100;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div
                      key={item.label}
                      className="absolute flex flex-col items-center gap-1"
                      style={{
                        left: `calc(50% + ${x}px - 24px)`,
                        top: `calc(50% + ${y}px - 24px)`,
                        animation: `fadeInUp 0.4s ease ${i * 100}ms forwards`,
                        opacity: 0,
                      }}
                    >
                      <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shadow-sm">
                        <item.Icon className="w-5 h-5 text-brand-600" />
                      </div>
                      <span className="text-[10px] font-semibold text-brand-navy">
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
                    r="80"
                    stroke="currentColor"
                    className="text-brand-100"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="6 6"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Step 2: Feature highlight */}
          {step === 1 && (
            <div className="py-8 space-y-6">
              <div className="relative bg-gradient-to-br from-brand-50 to-blue-50 rounded-3xl p-6 border border-brand-100 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-md mx-auto">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-brand-100">
                    <div className="flex items-center gap-2 text-brand-600 font-bold text-sm mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      {current.highlight}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Intelligent dead reckoning keeps you positioned even in tunnels,
                      underground parking, and dense urban canyons.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 space-y-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-brand-600' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20"
        >
          {step < slides.length - 1 ? 'Next' : 'Get Started'}
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
