import { Link } from 'react-router-dom';
import { Navigation, Play, Shield, Activity, BrainCircuit, Map } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-50 font-sans">
      <header className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-600">
          <Navigation className="w-8 h-8 fill-brand-600" />
          <span className="text-xl font-bold text-brand-navy">YatraSaarthi</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/app" className="text-brand-900 font-medium hover:text-brand-600 transition-colors">Login</Link>
          <Link to="/app" className="bg-brand-600 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-700 transition-colors shadow-md">
            Get Started
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold text-brand-navy leading-tight">
              Beyond GPS. <br/> Always With You.
            </h1>
            <p className="text-lg text-gray-600 max-w-md">
              Smart navigation for a safer journey. AI-powered, sensor-fused, and built for real-world roads.
            </p>
            
            <div className="flex items-center gap-4">
              <Link to="/app" className="bg-brand-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">
                Get Started
              </Link>
              <button className="flex items-center gap-2 bg-white text-brand-900 px-8 py-3.5 rounded-full font-semibold hover:bg-gray-50 transition-colors shadow-sm border border-gray-100">
                <Play className="w-5 h-5 fill-brand-600 text-brand-600" />
                Watch Demo
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-brand-100 to-white border border-white shadow-2xl overflow-hidden p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white">
                  <div className="flex items-center gap-2 text-status-success font-semibold text-sm mb-1">
                    <Activity className="w-4 h-4" />
                    High Accuracy
                  </div>
                  <div className="text-2xl font-bold text-brand-navy">± 2.5 m</div>
                  <div className="text-xs text-gray-500">Fused GNSS + INS</div>
                </div>
              </div>
              
              <div className="self-end bg-brand-navy text-white rounded-2xl p-4 shadow-xl">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center">
                     <Map className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <div className="text-sm font-medium">Entering Tunnel</div>
                     <div className="text-xs text-brand-100">Switching to Dead Reckoning</div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          {[
            { title: 'GNSS + INS Fusion', desc: 'Seamless positioning even when satellite signals are lost.', icon: Activity },
            { title: 'AI Route Correction', desc: 'Learns from your journeys to improve accuracy over time.', icon: BrainCircuit },
            { title: 'Tunnel Mode', desc: 'Predictive dead reckoning keeps you on the map underground.', icon: Shield },
          ].map((feature) => (
            <div key={feature.title} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-50 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-brand-navy mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
