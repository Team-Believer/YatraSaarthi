import React, { useState } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useNavigationWebSocket } from '../hooks/useNavigationWebSocket';
import { Play, Square, Activity, Map, Navigation, ShieldAlert, Cpu } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state, setSessionId } = useNavigationStore();
  const [isStarting, setIsStarting] = useState(false);
  
  // Real WebSocket connection tied to session
  useNavigationWebSocket(state.session_id);

  const startSession = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/navigation/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_type: 'CAR' })
      });
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (e) {
      console.error('Failed to start session', e);
    } finally {
      setIsStarting(false);
    }
  };

  const stopSession = async () => {
    if (!state.session_id) return;
    try {
      await fetch('http://localhost:8000/api/v1/navigation/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: state.session_id })
      });
    } catch (e) {
      console.error('Failed to stop session', e);
    }
    setSessionId(null);
  };

  if (!state.session_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <Navigation className="w-20 h-20 text-gray-300" />
        <h2 className="text-2xl font-semibold text-gray-700">No Active Navigation Session</h2>
        <p className="text-gray-500 max-w-md text-center">
          Start a new session to begin collecting real sensor data and running the IDR engine.
        </p>
        <button
          onClick={startSession}
          disabled={isStarting}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          <Play className="w-5 h-5 mr-2" />
          {isStarting ? 'Starting...' : 'Start Navigation Session'}
        </button>
      </div>
    );
  }

  // Active Session View
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Live Navigation State</h1>
          <p className="text-sm text-slate-500">Session ID: <span className="font-mono text-xs">{state.session_id}</span></p>
        </div>
        <button
          onClick={stopSession}
          className="flex items-center px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* State Card: Mode */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Navigation Mode</h3>
            <Activity className={`w-5 h-5 ${state.navigation_mode.includes('DEAD_RECKONING') ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 break-words">{state.navigation_mode.replace(/_/g, ' ')}</p>
            <p className="text-xs text-slate-500 mt-1">
              Environment: {state.environment_state.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* State Card: Position */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Current Position</h3>
            <Map className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 font-mono tracking-tight">
              {state.latitude.toFixed(6)}° N
            </p>
            <p className="text-lg font-bold text-slate-800 font-mono tracking-tight">
              {state.longitude.toFixed(6)}° E
            </p>
          </div>
        </div>

        {/* State Card: Telemetry */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Telemetry</h3>
            <Navigation className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Speed</p>
              <p className="text-xl font-bold text-slate-800">{(state.speed * 3.6).toFixed(1)} <span className="text-sm font-normal text-slate-500">km/h</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Heading</p>
              <p className="text-xl font-bold text-slate-800">{state.heading_deg.toFixed(0)}°</p>
            </div>
          </div>
        </div>

        {/* State Card: Confidence */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Filter Confidence</h3>
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Position</span>
              <span className="font-mono font-medium">{(state.position_confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${state.position_confidence * 100}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-600">Heading</span>
              <span className="font-mono font-medium">{(state.heading_confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${state.heading_confidence * 100}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Sensor Raw Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-slate-400" />
          Actual Sensor Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(state.sensor_states).map(([sensor, status]) => (
            <div key={sensor} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{sensor}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
                status === 'UNAVAILABLE' ? 'bg-slate-200 text-slate-600' :
                'bg-amber-100 text-amber-700'
              }`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
