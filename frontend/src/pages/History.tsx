import { useEffect, useState } from 'react';
import { Map, Clock, Navigation, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface SessionSummary {
  session_id: string;
  start_time: string;
  end_time: string | null;
  distance_meters: number;
  duration_seconds: number;
  vehicle_type: string;
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
}

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/history/sessions')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session history');
        return res.json();
      })
      .then((data) => {
        setSessions(data);
        if (data.length > 0) setSelectedSessionId(data[0].session_id);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Journey History</h1>
          <p className="text-xs text-gray-500 mt-1">Recorded navigation sessions from SQLite persistence</p>
        </div>
        <div className="bg-brand-50 text-brand-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-100">
          {sessions.length} Recorded Journeys
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-50 text-gray-400">
          Loading recorded journeys...
        </div>
      ) : error ? (
        <div className="bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex items-center gap-3 text-status-danger text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error loading journey history: {error}</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-50 space-y-4">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-400">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-brand-navy text-lg">No Recorded Journeys Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Start a live navigation session on the Dashboard to record telemetry, track dead-reckoning state estimates, and store session logs.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {sessions.map((trip) => (
              <div
                key={trip.session_id}
                onClick={() => setSelectedSessionId(trip.session_id)}
                className={clsx(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                  selectedSessionId === trip.session_id
                    ? "bg-brand-50 border-brand-500 shadow-sm"
                    : "bg-white border-brand-50 hover:border-brand-200"
                )}
              >
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-brand-navy text-sm truncate">
                    Session {trip.session_id.substring(0, 8)}...
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{(trip.distance_meters / 1000).toFixed(2)} km</span> •{' '}
                    <span>{(trip.duration_seconds / 60).toFixed(1)} min</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(trip.start_time).toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                    {trip.vehicle_type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-50 flex flex-col justify-between min-h-[400px]">
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
                      <span className="text-gray-500">Start Coordinates:</span>
                      <span className="font-mono text-gray-700">{selectedSession.start_lat.toFixed(5)}, {selectedSession.start_lon?.toFixed(5)}</span>
                    </div>
                    {selectedSession.end_lat && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-500">End Coordinates:</span>
                        <span className="font-mono text-gray-700">{selectedSession.end_lat.toFixed(5)}, {selectedSession.end_lon?.toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-gray-400">
                <Map className="w-12 h-12 mb-2 text-gray-300" />
                <p className="text-sm">Select a journey from the list to view telemetry details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

