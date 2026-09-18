import { useEffect, useState } from 'react';
import { BrainCircuit, TrendingUp, ShieldCheck, Activity, Layers, Compass, AlertCircle } from 'lucide-react';
import { historyService, type TelemetryInsights } from '../services/api/historyService';

export default function LearningInsights() {
  const [data, setData] = useState<TelemetryInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    historyService.getInsights()
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load learning insights');
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
          <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-brand-navy">Learning Insights</h1>
          <p className="text-gray-500 text-[10px] md:text-sm">Adaptive telemetry analytics</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-brand-50 text-gray-400 text-sm">
          Loading learning insights...
        </div>
      ) : error ? (
        <div className="bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex items-center gap-3 text-status-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error: {error}</span>
        </div>
      ) : !data || !data.has_data ? (
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-brand-50 space-y-3 md:space-y-4">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-500">
            <BrainCircuit className="w-7 h-7 md:w-8 md:h-8" />
          </div>
          <h3 className="font-bold text-brand-navy text-base md:text-lg">Your System is Learning</h3>
          <p className="text-xs md:text-sm text-gray-500 max-w-md mx-auto">
            Run navigation sessions to help YatraSaarthi learn your environment and improve accuracy over time.
          </p>
          <div className="pt-2">
            <span className="inline-block text-[10px] md:text-xs bg-brand-50 text-brand-700 font-semibold px-4 py-2 rounded-full border border-brand-100">
              Start navigation to accumulate insights
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-gray-500 mb-1">
                <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600" /> Journeys
              </div>
              <div className="text-xl md:text-2xl font-bold text-brand-navy">{data.total_sessions}</div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-gray-500 mb-1">
                <Compass className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600" /> Distance
              </div>
              <div className="text-xl md:text-2xl font-bold text-brand-navy">{data.total_distance_km} <span className="text-[10px] md:text-xs font-medium text-gray-500">km</span></div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-gray-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600" /> Duration
              </div>
              <div className="text-xl md:text-2xl font-bold text-brand-navy">{data.total_duration_minutes} <span className="text-[10px] md:text-xs font-medium text-gray-500">min</span></div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-gray-500 mb-1">
                <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-600" /> Samples
              </div>
              <div className="text-xl md:text-2xl font-bold text-brand-navy">{data.points_processed}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Mode Distribution */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-brand-50">
              <h3 className="font-bold text-brand-navy text-sm md:text-base mb-3 md:mb-4">Navigation Mode Distribution</h3>
              <div className="space-y-2.5 md:space-y-3">
                {Object.entries(data.mode_distribution).map(([mode, count]) => {
                  const pct = data.points_processed > 0 ? ((count / data.points_processed) * 100).toFixed(1) : '0';
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between text-[10px] md:text-xs font-semibold">
                        <span className="text-brand-navy truncate">{mode}</span>
                        <span className="text-gray-500 shrink-0 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* InEKF Info Card */}
            <div className="bg-brand-navy rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-100 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-status-success" /> Baseline Model
                </div>
                <h3 className="text-base md:text-xl font-bold mb-2">Physics-Informed InEKF</h3>
                <p className="text-[10px] md:text-xs text-brand-100 leading-relaxed">
                  Invariant error-state Lie-group Kalman filter with ZUPT and NHC. ML residual updates refine process noise during outages.
                </p>
              </div>

              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-white/10 text-[10px] md:text-[11px] text-brand-100">
                Data: SQLite • SO(3) × R³ × R³
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
