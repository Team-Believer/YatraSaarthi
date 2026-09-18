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
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      
      <div className="flex items-center gap-2 mb-2 md:mb-4">
        <Link to="/app" className="text-gray-500 hover:text-brand-900 transition-colors text-xs md:text-sm">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
        <span className="font-semibold text-brand-navy text-xs md:text-sm">Tunnel & Outage Mode</span>
      </div>

      {isTunnelOrDR ? (
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Main tunnel visualization */}
          <div className="md:col-span-2 bg-brand-navy rounded-2xl md:rounded-3xl p-5 md:p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10">
               <MountainSnow className="w-32 h-32 md:w-48 md:h-48" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 flex-wrap">
                <div className="bg-brand-600 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 shadow-lg">
                  <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 text-status-warning" /> DR Active
                </div>
                <span className="text-brand-100 text-[10px] md:text-sm">GNSS Degraded • InEKF + INS</span>
              </div>

              {/* Confidence circle */}
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="relative w-36 h-36 md:w-48 md:h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="44%" className="stroke-white/10" strokeWidth="10" fill="none" />
                    <circle 
                      cx="50%" 
                      cy="50%" 
                      r="44%" 
                      className="stroke-status-warning transition-all duration-500" 
                      strokeWidth="10" 
                      fill="none" 
                      strokeDasharray="276.46" 
                      strokeDashoffset={276.46 * (1 - Math.max(0, Math.min(1, confidence)))} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl md:text-4xl font-bold text-white">{(confidence * 100).toFixed(0)}%</span>
                    <span className="text-[10px] md:text-xs text-brand-100 font-medium">Confidence</span>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-md">
                <div>
                  <div className="text-brand-100 text-[10px] md:text-xs font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">Speed</div>
                  <div className="text-lg md:text-xl font-bold">{speed.toFixed(1)} <span className="text-xs md:text-sm font-medium opacity-70">km/h</span></div>
                </div>
                <div>
                  <div className="text-brand-100 text-[10px] md:text-xs font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">Mode</div>
                  <div className="text-xs md:text-sm font-bold text-status-warning truncate">{navigationMode}</div>
                </div>
                <div>
                  <div className="text-brand-100 text-[10px] md:text-xs font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">Heading</div>
                  <div className="text-lg md:text-xl font-bold">{heading ? `${heading.toFixed(0)}°` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-brand-100 text-[10px] md:text-xs font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">Error</div>
                  <div className="text-lg md:text-xl font-bold text-status-warning">± {accuracy.toFixed(1)} <span className="text-xs md:text-sm font-medium opacity-70">m</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-brand-50">
              <h3 className="font-bold text-brand-navy text-sm md:text-base mb-3 md:mb-4">Dead Reckoning Status</h3>
              
              <div className="space-y-3 md:space-y-4">
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5 md:mb-1">Road Match</div>
                  <div className="font-semibold text-brand-navy text-sm">Active Segment</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5 md:mb-1">IMU Stream</div>
                  <div className="font-semibold text-brand-navy text-sm">{imu_available ? 'Active 6-DoF' : capabilities.deviceMotion ? 'Ready' : 'Unavailable'}</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5 md:mb-1">NHC</div>
                  <div className="font-semibold text-status-success text-sm">ACTIVE</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5 md:mb-1">Session</div>
                  <div className="font-mono text-[10px] md:text-xs text-gray-600 truncate">{activeSessionId}</div>
                </div>
              </div>
            </div>
             
            <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-status-warning/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 text-status-warning" />
              </div>
              <p className="text-[10px] md:text-xs font-semibold text-status-warning leading-relaxed">
                GNSS lost. Inertial dead reckoning and road constraints active.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-brand-50 space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
              <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-status-success" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-brand-navy">Open-Sky Active</h2>
              <p className="text-xs md:text-sm text-gray-500">Nominal GNSS conditions.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-brand-50/50 rounded-xl md:rounded-2xl border border-brand-100">
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 font-medium">Mode</div>
              <div className="font-bold text-brand-navy text-xs md:text-sm mt-0.5">{navigationMode}</div>
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 font-medium">Speed</div>
              <div className="font-bold text-brand-navy text-xs md:text-sm mt-0.5">{speed.toFixed(1)} km/h</div>
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 font-medium">Accuracy</div>
              <div className="font-bold text-status-success text-xs md:text-sm mt-0.5">± {accuracy.toFixed(1)} m</div>
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 font-medium">Confidence</div>
              <div className="font-bold text-brand-600 text-xs md:text-sm mt-0.5">{(confidence * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 text-[10px] md:text-xs text-gray-600 leading-relaxed">
            <span className="font-bold text-brand-navy">Automatic Tunnel Detection:</span> YatraSaarthi evaluates GNSS quality continuously. When satellite updates cease, it automatically engages InEKF strapdown dead reckoning.
          </div>
        </div>
      )}

    </div>
  );
}
