import { useEffect, useState } from 'react';
import { BrainCircuit, TrendingUp, ShieldCheck, Activity, Layers, Compass, AlertCircle } from 'lucide-react';

interface InsightData {
  total_sessions: number;
  total_distance_km: number;
  total_duration_minutes: number;
  points_processed: number;
  mode_distribution: Record<string, number>;
  has_data: boolean;
}

export default function LearningInsights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/history/insights')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load learning insights');
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
         <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
           <BrainCircuit className="w-6 h-6 text-white" />
         </div>
         <div>
           <h1 className="text-2xl font-bold text-brand-navy">Learning Insights & Telemetry Analytics</h1>
           <p className="text-gray-500 text-sm">Adaptive baseline & state estimation diagnostics derived from stored journey logs.</p>
         </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-50 text-gray-400">
          Loading learning insights...
        </div>
      ) : error ? (
        <div className="bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex items-center gap-3 text-status-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error loading insights: {error}</span>
        </div>
      ) : !data || !data.has_data ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-50 space-y-4">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-500">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-brand-navy text-lg">No Learning Insights Available Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            System requires logged navigation sessions to compute empirical covariance bounds, state transition frequencies, and road matching efficiency.
          </p>
          <div className="pt-2">
            <span className="inline-block text-xs bg-brand-50 text-brand-700 font-semibold px-4 py-2 rounded-full border border-brand-100">
              Run navigation sessions on Dashboard to accumulate insights
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                <Activity className="w-4 h-4 text-brand-600" /> Total Journeys
              </div>
              <div className="text-2xl font-bold text-brand-navy">{data.total_sessions}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                <Compass className="w-4 h-4 text-brand-600" /> Total Distance
              </div>
              <div className="text-2xl font-bold text-brand-navy">{data.total_distance_km} <span className="text-xs font-medium text-gray-500">km</span></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4 text-brand-600" /> Total Duration
              </div>
              <div className="text-2xl font-bold text-brand-navy">{data.total_duration_minutes} <span className="text-xs font-medium text-gray-500">min</span></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-brand-50 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                <Layers className="w-4 h-4 text-brand-600" /> Telemetry Samples
              </div>
              <div className="text-2xl font-bold text-brand-navy">{data.points_processed}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-50">
              <h3 className="font-bold text-brand-navy mb-4">Navigation Mode Distribution</h3>
              <div className="space-y-3">
                {Object.entries(data.mode_distribution).map(([mode, count]) => {
                  const pct = data.points_processed > 0 ? ((count / data.points_processed) * 100).toFixed(1) : '0';
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-brand-navy">{mode}</span>
                        <span className="text-gray-500">{count} points ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-brand-navy rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-100 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-4 h-4 text-status-success" /> Baseline Model Operational
                </div>
                <h3 className="text-xl font-bold mb-2">Physics-Informed InEKF Mechanics</h3>
                <p className="text-xs text-brand-100 leading-relaxed">
                  YatraSaarthi uses an invariant error-state Lie-group Kalman filter with zero-velocity updates (ZUPT) and non-holonomic constraints (NHC). Machine learning residual updates continuously refine process noise covariance estimates during sensor outages.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-brand-100">
                Data sources: SQLite `yatrasaarthi.db` • Standard Lie algebra (SO(3) x R^3 x R^3)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

