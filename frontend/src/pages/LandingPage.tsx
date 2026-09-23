import { Link } from 'react-router-dom';
import { Play, Shield, Activity, BrainCircuit, Map } from 'lucide-react';
import { YatraSaarthiLogo } from '../components/branding/YatraSaarthiLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans select-none">
      <header className="container mx-auto px-6 py-4 flex items-center justify-between border-b border-border-clean">
        <Link to="/" className="flex items-center">
          <YatraSaarthiLogo variant="compact" height={38} />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="btn-secondary text-xs py-2 px-4">
            Sign in
          </Link>
          <Link to="/app" className="btn-primary text-xs py-2 px-5">
            Navigate
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-tight tracking-tight">
              Beyond GPS. <br/> Always with you.
            </h1>
            <p className="text-base sm:text-lg text-ink-body max-w-md leading-relaxed">
              Intelligent vehicle navigation engineered with invariant extended Kalman filtering, non-holonomic constraints, and inertial dead reckoning.
            </p>
            
            <div className="flex items-center gap-3 pt-2">
              <Link to="/app" className="btn-primary py-3.5 px-7 text-sm">
                Get started
              </Link>
              <Link to="/app/tunnel" className="btn-secondary py-3.5 px-6 text-sm flex items-center gap-2">
                <Play className="w-4 h-4 fill-ink" />
                <span>Outage demo</span>
              </Link>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl bg-canvas-soft border border-border-clean shadow-nav-floating overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white rounded-2xl p-4 shadow-2xs border border-border-clean">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs mb-1">
                    <Activity className="w-4 h-4" />
                    High accuracy
                  </div>
                  <div className="text-2xl font-bold font-mono text-ink">± 2.5 m</div>
                  <div className="text-xs text-ink-mute mt-0.5">Fused GNSS + InEKF</div>
                </div>
              </div>
              
              <div className="self-end bg-[#083335] text-white rounded-2xl p-4 shadow-nav-floating">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-full bg-[#052426] flex items-center justify-center">
                     <Map className="w-4.5 h-4.5 text-white" />
                   </div>
                   <div>
                     <div className="text-sm font-semibold">GNSS-denied navigation</div>
                     <div className="text-xs text-neutral-400">Zero-velocity constrained dead reckoning</div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            { title: 'GNSS + InEKF fusion', desc: 'Seamless positioning continuity when satellite signals drop.', icon: Activity },
            { title: 'Kinematic intelligence', desc: 'Learns from vehicle motion constraints to eliminate lateral slip.', icon: BrainCircuit },
            { title: 'Outage resilience', desc: 'Dead reckoning keeps you accurately on the road through tunnels.', icon: Shield },
          ].map((feature) => (
            <div key={feature.title} className="bg-white p-6 rounded-2xl border border-border-clean shadow-2xs">
              <div className="w-10 h-10 bg-canvas-soft rounded-full flex items-center justify-center text-ink mb-4">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-1.5">{feature.title}</h3>
              <p className="text-ink-body text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
