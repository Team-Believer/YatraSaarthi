import { useEffect, useState } from 'react';
import { Clock, Navigation, AlertCircle, ChevronRight, Calendar, Route } from 'lucide-react';
import { clsx } from 'clsx';
import { historyService, type SessionSummary } from '../services/api/historyService';

type Tab = 'trips' | 'statistics';

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('trips');

  useEffect(() => {
    historyService
      .getSessions()
      .then((data) => {
        setSessions(data || []);
        if (data && data.length > 0) setSelectedSessionId(data[0].session_id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('History API error:', err);
        setError(err.message || 'Error loading journey history');
        setLoading(false);
      });
  }, []);

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId);

  // Compute aggregate statistics
  const totalDistance = sessions.reduce((a, s) => a + (s.distance_meters || 0), 0);
  const totalDuration = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Journey History
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Recorded navigation sessions & inertial dead reckoning logs
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 self-start sm:self-auto font-mono">
          {sessions.length} Recorded Journeys
        </div>
      </div>

      {/* Top Aggregate Stats Ribbon (Desktop & Tablet) */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Trips</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">{sessions.length}</div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Distance</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {(totalDistance / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-500">km</span>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Time</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {(totalDuration / 60).toFixed(0)} <span className="text-xs font-normal text-slate-500">min</span>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Speed</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {totalDuration > 0 ? ((totalDistance / totalDuration) * 3.6).toFixed(1) : '0'} <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Toggle */}
      <div className="md:hidden flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
        {(['trips', 'statistics'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all',
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {tab === 'trips' ? 'Trip Records' : 'Aggregate Stats'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 text-slate-400 text-sm space-y-2">
          <Clock className="w-6 h-6 animate-spin mx-auto text-brand-600" />
          <p>Loading journey database...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center gap-3 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/90 space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">No Recorded Journeys Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Start a live navigation session on the Navigation Cockpit to record and persist trips into the local database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trip List */}
          <div className={clsx(
            "md:col-span-6 lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1",
            activeTab === 'statistics' ? 'hidden md:block' : 'block'
          )}>
            {sessions.map((trip) => {
              const isSelected = selectedSessionId === trip.session_id;
              return (
                <div
                  key={trip.session_id}
                  onClick={() => setSelectedSessionId(trip.session_id)}
                  className={clsx(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 press-scale shadow-2xs",
                    isSelected
                      ? "bg-brand-50/80 border-brand-500 text-slate-900 ring-1 ring-brand-500"
                      : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isSelected ? "bg-brand-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"
                  )}>
                    <Navigation className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate font-mono">
                      Session {trip.session_id.substring(0, 8)}...
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{(trip.distance_meters / 1000).toFixed(2)} km</span>
                      <span>•</span>
                      <span>{(trip.duration_seconds / 60).toFixed(1)} min</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(trip.start_time).toLocaleString()}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {trip.vehicle_type || 'CAR'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Trip Details Panel */}
          <div className={clsx(
            "md:col-span-6 lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6",
            activeTab === 'statistics' ? 'hidden md:block' : 'hidden md:block'
          )}>
            {selectedSession ? (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] text-brand-700 font-bold uppercase tracking-wider bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                    Journey Telemetry Summary
                  </span>
                  <h3 className="font-bold font-mono text-slate-900 text-lg sm:text-xl mt-2.5">
                    Session {selectedSession.session_id}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Started on {new Date(selectedSession.start_time).toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Distance</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                      {(selectedSession.distance_meters / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-500">km</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                      {(selectedSession.duration_seconds / 60).toFixed(1)} <span className="text-xs font-normal text-slate-500">min</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Mode</span>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                      {selectedSession.vehicle_type || 'CAR'}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Session State</span>
                    <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Completed
                    </div>
                  </div>
                </div>

                {selectedSession.start_lat && (
                  <div className="space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Geographic Bounds
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500">Origin Fix:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {selectedSession.start_lat.toFixed(5)}, {selectedSession.start_lon?.toFixed(5)}
                      </span>
                    </div>
                    {selectedSession.end_lat && (
                      <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500">Destination Fix:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {selectedSession.end_lat.toFixed(5)}, {selectedSession.end_lon?.toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400 space-y-2">
                <Route className="w-10 h-10 text-slate-300" />
                <p className="text-xs">Select a journey on the left to inspect detailed metrics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

