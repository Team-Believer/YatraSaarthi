import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Compass, Map, Camera, Cpu } from 'lucide-react';
import { YatraSaarthiLogo } from '../components/branding/YatraSaarthiLogo';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasOnboarded = localStorage.getItem('ys_onboarded');
    if (hasOnboarded) {
      navigate('/app', { replace: true });
      return;
    }
    // Trigger entrance animation
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, [navigate]);

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6 text-ink select-none relative overflow-hidden">
      {/* Decorative background subtle circle */}
      <div className="absolute top-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-canvas-softer pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[50vw] h-[50vw] rounded-full bg-canvas-softer pointer-events-none" />

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Logo + Branding */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="mb-6 flex items-center justify-center">
          <YatraSaarthiLogo variant="auth" height={130} />
        </div>

        {/* Sensor orbit icons */}
        <div className="flex items-center gap-3 mt-4 mb-4">
          {[Wifi, Compass, Cpu, Map, Camera].map((Icon, i) => (
            <div
              key={i}
              className="w-10 h-10 bg-canvas-soft rounded-full flex items-center justify-center border border-border-clean"
              style={{
                animationDelay: `${i * 150}ms`,
                animation: animateIn ? 'fadeInUp 0.5s ease forwards' : 'none',
                opacity: 0,
              }}
            >
              <Icon className="w-4.5 h-4.5 text-ink" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Bottom section */}
      <div
        className={`w-full max-w-sm space-y-4 transition-all duration-700 delay-300 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <p className="text-center text-ink-body text-xs leading-relaxed">
          Intelligent navigation with inertial dead reckoning
          <br />
          Continuous positioning even during complete GNSS outages
        </p>

        <button
          onClick={handleGetStarted}
          className="btn-primary w-full py-4 text-base"
        >
          Get started
        </button>
      </div>

      {/* Inline keyframes for fadeInUp */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
