import { useEffect, useState } from 'react';
import { Map, Clock, Navigation, AlertCircle, ChevronRight } from 'lucide-react';
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
    historyService.getSessions()
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

  // Compute stats
  const totalDistance = sessions.reduce((a, s) => a + s.distance_meters, 0);
  const totalDuration = sessions.reduce((a, s) => a + s.duration_seconds, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-brand-navy">Journey History</h1>
          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Recorded navigation sessions</p>
        </div>
        <div className="bg-brand-50 text-brand-600 text-[10px] md:text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-100">
          {sessions.length} Journeys
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden flex bg-brand-50 rounded-2xl p-1 border border-brand-100">
        {(['trips', 'statistics'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all',
              activeTab === tab
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-brand-600'
            )}
          >
            {tab === 'trips' ? 'Past Trips' : 'Statistics'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-brand-50 text-gray-400 text-sm">
          Loading recorded journeys...
        </div>
      ) : error ? (
        <div className="bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex items-center gap-3 text-status-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error: {error}</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-brand-50 space-y-3 md:space-y-4">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-400">
            <Clock className="w-7 h-7 md:w-8 md:h-8" />
          </div>
          <h3 className="font-bold text-brand-navy text-base md:text-lg">No Recorded Journeys Yet</h3>
          <p className="text-xs md:text-sm text-gray-500 max-w-sm mx-auto">
            Start a live navigation session on the Dashboard to record your first journey.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Past Trips tab content */}
          {(activeTab === 'trips' || window.innerWidth >= 768) && (
            <div className={clsx('grid gap-4 md:gap-6', activeTab === 'trips' ? 'block md:grid md:grid-cols-2' : 'hidden md:grid md:grid-cols-2')}>
              {/* Trip list */}
              <div className="space-y-2 md:space-y-3 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-1 md:pr-2">
                {sessions.map((trip) => (
                  <div
                    key={trip.session_id}
                    onClick={() => setSelectedSessionId(trip.session_id)}
                    className={clsx(
                      "p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer flex items-center gap-3 md:gap-4 press-scale",
                      selectedSessionId === trip.session_id
                        ? "bg-brand-50 border-brand-500 shadow-sm"
                        : "bg-white border-brand-50 hover:border-brand-200"
                    )}
                  >
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4 md:w-5 md:h-5 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-brand-navy text-xs md:text-sm truncate">
                        Session {trip.session_id.substring(0, 8)}...
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                        <span>{(trip.distance_meters / 1000).toFixed(2)} km</span> •{' '}
                        <span>{(trip.duration_seconds / 60).toFixed(1)} min</span>
                      </div>
                      <div className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">
                        {new Date(trip.start_time).toLocaleString()}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {trip.vehicle_type}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 hidden md:block" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail panel - hidden on mobile in trips tab, shown in desktop */}
              <div className="hidden md:flex bg-white rounded-3xl p-6 shadow-sm border border-brand-50 flex-col justify-between min-h-[400px]">
                {selectedSession ? (
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs text-brand-600 font-semibold uppercase tracking-wider">Journey Details</span>
                      <h3 className="font-bold text-brand-navy text-lg mt-1">Session {selectedSession.session_id}</h3>
                      <p className="text-xs text-gray-400">Started {new Date(selectedSession.start_time).toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-brand-50/40 rounded-2xl border border-brand-100">
                      <div>
                        <div className="text-xs text-gray-500">Total Distance</div>
                        <div className="font-bold text-brand-navy text-base">{(selectedSession.distance_meters / 1000).toFixed(2)} km</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Duration</div>
                        <div className="font-bold text-brand-navy text-base">{(selectedSession.duration_seconds / 60).toFixed(1)} min</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Vehicle Type</div>
                        <div className="font-bold text-brand-navy text-base">{selectedSession.vehicle_type}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="font-bold text-status-success text-base">Completed</div>
                      </div>
                    </div>

                    {selectedSession.start_lat && (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-gray-500">Start:</span>
                          <span className="font-mono text-gray-700">{selectedSession.start_lat.toFixed(5)}, {selectedSession.start_lon?.toFixed(5)}</span>
                        </div>
                        {selectedSession.end_lat && (
                          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-500">End:</span>
                            <span className="font-mono text-gray-700">{selectedSession.end_lat.toFixed(5)}, {selectedSession.end_lon?.toFixed(5)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full text-gray-400">
                    <Map className="w-12 h-12 mb-2 text-gray-300" />
                    <p className="text-sm">Select a journey to view details.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile: Statistics tab content */}
          {activeTab === 'statistics' && (
            <div className="md:hidden space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-brand-50 shadow-sm">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Total Trips</div>
                  <div className="text-2xl font-bold text-brand-navy">{sessions.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-brand-50 shadow-sm">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Total Distance</div>
                  <div className="text-2xl font-bold text-brand-navy">{(totalDistance / 1000).toFixed(1)} <span className="text-xs font-medium text-gray-500">km</span></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-brand-50 shadow-sm">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Total Time</div>
                  <div className="text-2xl font-bold text-brand-navy">{(totalDuration / 60).toFixed(0)} <span className="text-xs font-medium text-gray-500">min</span></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-brand-50 shadow-sm">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Avg Speed</div>
                  <div className="text-2xl font-bold text-brand-navy">
                    {totalDuration > 0 ? ((totalDistance / totalDuration) * 3.6).toFixed(1) : '0'} <span className="text-xs font-medium text-gray-500">km/h</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
