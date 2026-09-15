import React, { useEffect, useState } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { GlobalStatusBadge } from '../components/common/GlobalStatusBadge';
import { ShieldAlert, Cpu, Database, Network } from 'lucide-react';

const SensorDiagnostics: React.FC = () => {
  const { state } = useNavigationStore();
  const { capabilities, permissions } = useSensorStore();
  const [serverDiag, setServerDiag] = useState<any>(null);

  // Fetch server diagnostics periodically if session active
  useEffect(() => {
    if (!state.session_id) return;
    
    const fetchDiag = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/navigation/sessions/${state.session_id}/diagnostics`);
        if (res.ok) {
          const data = await res.json();
          setServerDiag(data);
        }
      } catch (e) {
        console.error('Failed to fetch diagnostics', e);
      }
    };

    fetchDiag();
    const interval = setInterval(fetchDiag, 2000);
    return () => clearInterval(interval);
  }, [state.session_id]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Diagnostics</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time hardware capabilities and IDR engine internals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Frontend Hardware Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-indigo-500" />
              Device Hardware Sensors
            </h2>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Sensor System</th>
                  <th className="pb-2 font-medium">Supported</th>
                  <th className="pb-2 font-medium">Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr>
                  <td className="py-3 text-slate-700">Geolocation (GNSS)</td>
                  <td className="py-3">
                    <GlobalStatusBadge status={capabilities.geolocation ? 'LIVE' : 'UNAVAILABLE'} />
                  </td>
                  <td className="py-3">
                    <GlobalStatusBadge status={permissions.geolocation || 'UNKNOWN'} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">Accelerometer / Gyroscope (IMU)</td>
                  <td className="py-3">
                    <GlobalStatusBadge status={capabilities.deviceMotion ? 'LIVE' : 'UNAVAILABLE'} />
                  </td>
                  <td className="py-3">
                    <GlobalStatusBadge status={permissions.deviceMotion || 'UNKNOWN'} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-700">Magnetometer (Compass)</td>
                  <td className="py-3">
                    <GlobalStatusBadge status={capabilities.deviceOrientation ? 'LIVE' : 'UNAVAILABLE'} />
                  </td>
                  <td className="py-3">
                    <GlobalStatusBadge status={permissions.deviceOrientation || 'UNKNOWN'} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* WebSocket & Engine Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center">
              <Network className="w-5 h-5 mr-2 text-blue-500" />
              IDR Engine Pipeline
            </h2>
            {state.session_id ? (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Connected</span>
            ) : (
              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Offline</span>
            )}
          </div>
          <div className="p-4 space-y-4 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-500">Session ID</span>
              <span className="font-mono text-slate-800">{state.session_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-500">Packets Received from Server</span>
              <span className="font-mono text-slate-800">{state.packets_received}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-slate-500">Filter Initialized</span>
              <span className="font-mono text-slate-800">{serverDiag?.filter_initialized ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Server Uptime</span>
              <span className="font-mono text-slate-800">{serverDiag ? `${serverDiag.uptime.toFixed(1)}s` : 'N/A'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Deep Filter State (if connected) */}
      {state.session_id && serverDiag && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 flex items-center mb-4">
            <Database className="w-5 h-5 mr-2 text-purple-500" />
            InEKF Internal State
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            
            <div className="space-y-3">
              <h3 className="font-medium text-slate-800 border-b pb-1">Biases</h3>
              <div className="flex justify-between">
                <span className="text-slate-500">Accel X/Y/Z</span>
                <span className="font-mono text-xs">{state.accel_bias.map(b => b.toFixed(4)).join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gyro X/Y/Z</span>
                <span className="font-mono text-xs">{state.gyro_bias.map(b => b.toFixed(4)).join(', ')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-slate-800 border-b pb-1">Statistics</h3>
              <div className="flex justify-between">
                <span className="text-slate-500">Covariance Trace</span>
                <span className="font-mono">{state.covariance_trace.toExponential(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Innovation Norm</span>
                <span className="font-mono">{state.innovation_norm.toFixed(3)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-slate-800 border-b pb-1">Subsystems</h3>
              <div className="flex justify-between">
                <span className="text-slate-500">ZUPT Confidence</span>
                <span className="font-mono">{(serverDiag.zupt.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Heading Var</span>
                <span className="font-mono">{serverDiag.heading.fused_variance.toFixed(4)} rad²</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Anomalies */}
      {serverDiag && serverDiag.anomalies.recent_anomalies.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
          <h2 className="font-semibold text-rose-700 flex items-center mb-4">
            <ShieldAlert className="w-5 h-5 mr-2" />
            Recent Sensor Anomalies
          </h2>
          <div className="space-y-3">
            {serverDiag.anomalies.recent_anomalies.map((anomaly: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm p-3 bg-rose-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="font-medium text-rose-800">{anomaly.sensor}: {anomaly.type}</span>
                  <span className="text-rose-600/80 text-xs">{anomaly.message}</span>
                </div>
                <span className="font-mono text-xs text-rose-400">
                  {new Date(anomaly.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default SensorDiagnostics;
