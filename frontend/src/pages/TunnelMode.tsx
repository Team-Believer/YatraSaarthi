import { ShieldAlert, MountainSnow, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { Link } from 'react-router-dom';

export default function TunnelMode() {
  const { 
    speed, 
    horizontal_accuracy: accuracy, 
    heading_deg: heading, 
    position_confidence: confidence, 
    navigation_mode: navigationMode, 
    session_id: activeSessionId,
    imu_available
  } = useNavigationStore((s) => s.state);

  const { capabilities } = useSensorStore();

  const isTunnelOrDR = 
    activeSessionId !== null && 
    ['TUNNEL', 'DEAD_RECKONING', 'MAP_AIDED_DEAD_RECKONING', 'GNSS_LOST', 'GNSS_DEGRADING'].includes(navigationMode);


  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-2 mb-4">
        <Link to="/app" className="text-gray-500 hover:text-brand-900 transition-colors text-sm">Home</Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-brand-navy text-sm">Tunnel & Outage Mode</span>
      </div>

      {isTunnelOrDR ? (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-brand-navy rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <MountainSnow className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-brand-600 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                  <ShieldAlert className="w-4 h-4 text-status-warning" /> Tunnel / DR Mode Active
                </div>
                <span className="text-brand-100 text-sm">GNSS Degraded • InEKF + INS Strapdown</span>
              </div>

              <div className="aspect-video bg-black/40 rounded-2xl border border-white/10 mb-8 overflow-hidden relative flex items-center justify-center">
                <div className="relative w-48 h-48">
                   <svg className="w-full h-full transform -rotate-90">
                     <circle cx="96" cy="96" r="88" className="stroke-white/10" strokeWidth="12" fill="none" />
                     <circle 
                       cx="96" 
                       cy="96" 
                       r="88" 
                       className="stroke-status-warning transition-all duration-500" 
                       strokeWidth="12" 
                       fill="none" 
                       strokeDasharray="552.92" 
                       strokeDashoffset={552.92 * (1 - Math.max(0, Math.min(1, confidence)))} 
                       strokeLinecap="round" 
                     />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-bold text-white">{(confidence * 100).toFixed(0)}%</span>
                     <span className="text-xs text-brand-100 font-medium">Position Confidence</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                 <div>
                   <div className="text-brand-100 text-xs font-semibold mb-1 uppercase tracking-wider">Speed</div>
                   <div className="text-xl font-bold">{speed.toFixed(1)} <span className="text-sm font-medium opacity-70">km/h</span></div>
                 </div>
                 <div>
                   <div className="text-brand-100 text-xs font-semibold mb-1 uppercase tracking-wider">Mode</div>
                   <div className="text-sm font-bold text-status-warning">{navigationMode}</div>
                 </div>
                 <div>
                   <div className="text-brand-100 text-xs font-semibold mb-1 uppercase tracking-wider">Heading</div>
                   <div className="text-xl font-bold">{heading ? `${heading.toFixed(0)}°` : 'N/A'}</div>
                 </div>
                 <div>
                   <div className="text-brand-100 text-xs font-semibold mb-1 uppercase tracking-wider">Error Bounds</div>
                   <div className="text-xl font-bold text-status-warning">± {accuracy.toFixed(1)} <span className="text-sm font-medium opacity-70">m</span></div>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-50">
               <h3 className="font-bold text-brand-navy mb-4">Dead Reckoning Status</h3>
               
               <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Road Match</div>
                    <div className="font-semibold text-brand-navy">Active Segment</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">IMU Stream Status</div>
                    <div className="font-semibold text-brand-navy">{imu_available ? 'Active 6-DoF Stream' : capabilities.deviceMotion ? 'Hardware Ready' : 'Unavailable on this device'}</div>
                  </div>
                 <div>
                   <div className="text-xs font-medium text-gray-500 mb-1">Non-Holonomic Constraints</div>
                   <div className="font-semibold text-status-success">ACTIVE (Kinematic Zero-Lateral)</div>
                 </div>
                 <div>
                   <div className="text-xs font-medium text-gray-500 mb-1">Session ID</div>
                   <div className="font-mono text-xs text-gray-600 truncate">{activeSessionId}</div>
                 </div>
               </div>
             </div>
             
             <div className="bg-status-warning/10 border border-status-warning/20 rounded-2xl p-4 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-status-warning/20 flex items-center justify-center shrink-0">
                 <ShieldAlert className="w-4 h-4 text-status-warning" />
               </div>
               <p className="text-xs font-semibold text-status-warning leading-relaxed">
                 GNSS signal lost/degraded. Relying on InEKF strapdown inertial dead reckoning and road constraints.
               </p>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-50 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
              <CheckCircle2 className="w-8 h-8 text-status-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-navy">Open-Sky Environment Active</h2>
              <p className="text-sm text-gray-500">Current navigation mode is operating under nominal conditions.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 p-4 bg-brand-50/50 rounded-2xl border border-brand-100">
            <div>
              <div className="text-xs text-gray-500 font-medium">Navigation Mode</div>
              <div className="font-bold text-brand-navy text-sm mt-0.5">{navigationMode}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Speed</div>
              <div className="font-bold text-brand-navy text-sm mt-0.5">{speed.toFixed(1)} km/h</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Position Accuracy</div>
              <div className="font-bold text-status-success text-sm mt-0.5">± {accuracy.toFixed(1)} m</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">InEKF Confidence</div>
              <div className="font-bold text-brand-600 text-sm mt-0.5">{(confidence * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
            <span className="font-bold text-brand-navy">Automatic Tunnel Detection:</span> YatraSaarthi constantly evaluates GNSS dilusion of precision, HDOP, and signal loss. When satellite updates cease (e.g. entering a tunnel or parking structure), the system automatically triggers Tunnel Mode and seamlessly engages InEKF strapdown dead reckoning without requiring user input.
          </div>
        </div>
      )}

    </div>
  );
}
