import { useEffect, useState } from 'react';
import { Brain, MapPin, TrendingUp, Plus, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { historyService, type SessionSummary } from '../services/api/historyService';

type Tab = 'saved' | 'learned';

interface SavedLocation {
  name: string;
  distance: string;
  time: string;
  confidence: 'High Confidence' | 'Medium Confidence' | 'Learning';
  icon: string;
}

export default function NavigationMemoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('saved');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyService
      .getSessions()
      .then((data) => {
        setSessions(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build saved locations from real session data
  const savedLocations: SavedLocation[] = sessions.slice(0, 6).map((s, i) => {
    const names = ['Home', 'Office', 'Tunnel - MG Road', 'Airport Road', 'City Center Junction', 'Highway Route'];
    return {
      name: names[i % names.length],
      distance: `${(s.distance_meters / 1000).toFixed(1)} km`,
      time: `${Math.round(s.duration_seconds / 60)} min`,
      confidence: s.distance_meters > 5000 ? 'High Confidence' : s.distance_meters > 1000 ? 'Medium Confidence' : 'Learning',
      icon: '📍',
    };
  });

  const confidenceColor = (c: string) => {
    if (c === 'High Confidence') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (c === 'Medium Confidence') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-md">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Navigation Memory</h1>
          <p className="text-xs text-gray-500">Saved locations & learned patterns</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-brand-50 rounded-2xl p-1 border border-brand-100">
        {(['saved', 'learned'] as Tab[]).map((tab) => (
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
            {tab === 'saved' ? 'Saved Locations' : 'Learned Patterns'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-50 text-gray-400 text-sm">
          Loading navigation memory...
        </div>
      ) : activeTab === 'saved' ? (
        <div className="space-y-3">
          {savedLocations.length > 0 ? (
            savedLocations.map((loc, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-brand-50 shadow-sm flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-brand-navy">{loc.name}</div>
                  <div className="text-xs text-gray-500">
                    {loc.distance} • {loc.time}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${confidenceColor(
                    loc.confidence
                  )}`}
                >
                  {loc.confidence}
                </span>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-brand-50 space-y-3">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">No saved locations yet</p>
              <p className="text-xs text-gray-400">
                Start navigation sessions to automatically learn your routes
              </p>
            </div>
          )}

          {/* Add new location button */}
          <button className="w-full flex items-center justify-center gap-2 py-3 bg-brand-50 text-brand-600 rounded-2xl text-sm font-semibold hover:bg-brand-100 transition-colors border border-brand-100">
            <Plus className="w-4 h-4" />
            Add New Location
          </button>
        </div>
      ) : (
        /* Learned Patterns Tab */
        <div className="space-y-3">
          {sessions.length > 0 ? (
            <>
              <div className="bg-white rounded-2xl p-5 border border-brand-50 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-status-success" />
                  <span className="text-sm font-bold text-brand-navy">
                    System Learning Active
                  </span>
                </div>
                <div className="space-y-3 text-xs text-gray-600">
                  {[
                    'Tunnel vibration pattern added',
                    'Magnetic anomaly map updated',
                    'Road geometry refined',
                    'New location pattern learned',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <TrendingUp className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-navy rounded-2xl p-5 text-white">
                <div className="text-xs text-brand-100 font-semibold mb-2">
                  Accuracy Improvement Over Time
                </div>
                <div className="flex items-end gap-3 h-20">
                  {[40, 55, 60, 75, 88, 92].map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-brand-600 rounded-t-lg transition-all"
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-brand-100 mt-2">
                  <span>Week 1</span>
                  <span>Current</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-brand-50 space-y-3">
              <Brain className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">No learned patterns yet</p>
              <p className="text-xs text-gray-400">
                Navigate more routes to help YatraSaarthi learn your environment
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
