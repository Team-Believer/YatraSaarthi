import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Wifi, Compass, Map, Camera, Cpu } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex flex-col items-center justify-between p-6 text-white relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[50vw] h-[50vw] rounded-full bg-white/5 pointer-events-none" />

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Logo + Branding */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="w-20 h-20 bg-white/15 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
          <Navigation className="w-10 h-10 text-white fill-white/90" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-2">YatraSaarthi</h1>
        <p className="text-white/70 text-sm font-medium tracking-wide">
          Beyond GPS. Always With You.
        </p>

        {/* Sensor orbit icons */}
        <div className="flex items-center gap-4 mt-8 mb-4">
          {[Wifi, Compass, Cpu, Map, Camera].map((Icon, i) => (
            <div
              key={i}
              className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10"
              style={{
                animationDelay: `${i * 150}ms`,
                animation: animateIn ? 'fadeInUp 0.5s ease forwards' : 'none',
                opacity: 0,
              }}
            >
              <Icon className="w-5 h-5 text-white/80" />
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
        <p className="text-center text-white/60 text-xs">
          Smarter Navigation • Safer Journeys
          <br />
          Powered by Sensors, AI & Your Phone
        </p>

        <button
          onClick={handleGetStarted}
          className="w-full bg-white text-brand-700 font-bold py-4 rounded-2xl text-sm shadow-xl shadow-black/20 hover:bg-white/95 active:scale-[0.98] transition-all"
        >
          Get Started
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
