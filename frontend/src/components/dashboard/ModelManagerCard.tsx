import { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
} from 'lucide-react';
import {
  fetchModels,
  selectActiveModel,
  runMLBenchmark,
  type RegisteredModel,
  type BenchmarkResponse
} from '../../services/api/mlService';

export function ModelManagerCard() {
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('E5');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PRODUCTION' | 'BASELINES' | 'ABLATIONS'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [switching, setSwitching] = useState<boolean>(false);
  const [benchmarking, setBenchmarking] = useState<boolean>(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResponse | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchModels();
      setModels(data.models);
      setActiveModelId(data.active_model_id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load model registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectModel = async (modelId: string) => {
    setSwitching(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await selectActiveModel(modelId);
      setActiveModelId(res.active_model_id);
      setSuccessMsg(`Switched active navigation model to ${modelId}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to activate model ${modelId}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchmarking(true);
    setErrorMsg(null);
    try {
      const res = await runMLBenchmark();
      setBenchmarkData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute multi-model benchmark');
    } finally {
      setBenchmarking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('PRODUCTION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          PRODUCTION / VALIDATED
        </span>
      );
    }
    if (status.includes('REFERENCE') || status.includes('BASELINE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          REFERENCE / BASELINE
        </span>
      );
    }
    if (status.includes('ROBUSTNESS')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Activity className="w-3.5 h-3.5 text-amber-600" />
          DIAGNOSTIC / ROBUSTNESS
        </span>
      );
    }
    if (status.includes('ABLATION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          EXPERIMENTAL / ABLATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        FAILED / DEGRADED
      </span>
    );
  };

  const filteredModels = models.filter((m) => {
    if (selectedFilter === 'PRODUCTION') return m.status.includes('PRODUCTION');
    if (selectedFilter === 'BASELINES') return m.status.includes('BASELINE') || m.status.includes('ROBUSTNESS');
    if (selectedFilter === 'ABLATIONS') return m.status.includes('FAILED') || m.status.includes('ABLATION');
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-brand-100 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-blue border border-brand-100">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-brand-navy">AI Model Registry & Diagnostics</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-navy text-white">
                12 Variants Integrated
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Select, benchmark, and inspect all neural and physics models (E0–E7, U0–U2, Calibration)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunBenchmark}
            disabled={benchmarking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-navy hover:bg-brand-navy/90 text-white transition-all shadow-sm disabled:opacity-50"
          >
            {benchmarking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Comparative Benchmark...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Run Multi-Model Benchmark</span>
              </>
            )}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Model Banner */}
      <div className="bg-gradient-to-r from-brand-50 to-blue-50/50 rounded-2xl p-4 border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {activeModelId}
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Currently Active Live Navigation Model:</div>
            <div className="text-sm font-bold text-brand-navy flex items-center gap-2">
              <span>{models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase())?.name || activeModelId}</span>
              {models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase()) &&
                getStatusBadge(models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase())!.status)}
            </div>
          </div>
        </div>
        {activeModelId !== 'E5' && (
          <button
            onClick={() => handleSelectModel('E5')}
            disabled={switching}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
          >
            Reset to Production Default (E5)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            selectedFilter === 'ALL'
              ? 'bg-brand-navy text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Models ({models.length})
        </button>
        <button
          onClick={() => setSelectedFilter('PRODUCTION')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            selectedFilter === 'PRODUCTION'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Production / Validated (3)
        </button>
        <button
          onClick={() => setSelectedFilter('BASELINES')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            selectedFilter === 'BASELINES'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Baselines & Robustness (3)
        </button>
        <button
          onClick={() => setSelectedFilter('ABLATIONS')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            selectedFilter === 'ABLATIONS'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Ablations & Failed (6)
        </button>
      </div>

      {/* Models Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredModels.map((m) => {
          const isActive = m.model_id.toUpperCase() === activeModelId.toUpperCase();
          const isExpanded = expandedModelId === m.model_id;
          const isDegraded = m.status.includes('FAILED') || m.status.includes('DEGRADED');

          return (
            <div
              key={m.model_id}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isActive
                  ? 'border-brand-blue bg-blue-50/20 shadow-md ring-1 ring-brand-blue/30'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-3">
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 text-brand-navy font-bold flex items-center justify-center text-xs border border-gray-200">
                      {m.model_id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-brand-navy">{m.name}</h3>
                      <div className="mt-1">{getStatusBadge(m.status)}</div>
                    </div>
                  </div>

                  {/* Activate Radio/Button */}
                  <div>
                    {isActive ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-blue text-white shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectModel(m.model_id)}
                        disabled={switching}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-brand-blue hover:text-white text-gray-700 transition-all border border-gray-200"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Architecture & Input spec */}
                <p className="text-xs text-gray-600 line-clamp-2">
                  {m.architecture}
                </p>

                {/* Metrics Table */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 text-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Primary RMSE</span>
                    <span className="font-bold text-gray-800">
                      {m.primary_rmse_mps !== null ? `${m.primary_rmse_mps} m/s` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Unseen RMSE</span>
                    <span className={`font-bold ${isDegraded ? 'text-rose-600' : 'text-gray-800'}`}>
                      {m.unseen_rmse_mps !== null ? `${m.unseen_rmse_mps} m/s` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Parameters</span>
                    <span className="font-bold text-gray-800">
                      {m.parameters.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Warning for degraded models */}
                {isDegraded && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Degraded Generalization:</strong> Exhibited negative R2 (-1.00+) on unseen drivers. Preserved strictly for diagnostics and ablation research.
                    </span>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs animate-in fade-in duration-200">
                    <div>
                      <strong className="text-gray-700 block">Input Format:</strong>
                      <span className="text-gray-600">{m.input_description} ({m.input_channels} channels)</span>
                    </div>
                    <div>
                      <strong className="text-gray-700 block">Artifact Path:</strong>
                      <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono">
                        {m.weights_file}
                      </code>
                    </div>
                    {m.capabilities && m.capabilities.length > 0 && (
                      <div>
                        <strong className="text-gray-700 block">Capabilities:</strong>
                        <ul className="list-disc list-inside text-gray-600 text-[11px] space-y-0.5">
                          {m.capabilities.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.limitations && m.limitations.length > 0 && (
                      <div>
                        <strong className="text-gray-700 block">Known Limitations:</strong>
                        <ul className="list-disc list-inside text-rose-700 text-[11px] space-y-0.5">
                          {m.limitations.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer toggle */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="text-[11px] font-mono">{m.runtime}</span>
                <button
                  onClick={() => setExpandedModelId(isExpanded ? null : m.model_id)}
                  className="flex items-center gap-1 text-brand-blue hover:text-brand-navy font-semibold transition-colors"
                >
                  <span>{isExpanded ? 'Less details' : 'More specifications'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Benchmark Results Drawer / Modal */}
      {benchmarkData && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 border border-slate-800 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent-cyan" />
              <h3 className="font-bold text-base">Live Multi-Model Benchmark Results</h3>
              <span className="text-xs text-slate-400">
                (Evaluated on same 5.0s 10Hz sequence)
              </span>
            </div>
            <button
              onClick={() => setBenchmarkData(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
            >
              Close Results
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Pred Velocity</th>
                  <th className="py-2 px-3 text-right">Sigma / Error</th>
                  <th className="py-2 px-3 text-right">Inference Latency</th>
                  <th className="py-2 px-3 text-right">Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {benchmarkData.results.map((r) => (
                  <tr
                    key={r.model_id}
                    className={`hover:bg-white/5 transition-colors ${
                      r.model_id.toUpperCase() === activeModelId.toUpperCase() ? 'bg-white/10 font-bold text-accent-cyan' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <span>{r.model_id}</span>
                      <span className="text-slate-400 font-sans text-[11px]">({r.name.split(' ')[1] || r.name})</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.status.includes('PRODUCTION')
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : r.status.includes('BASELINE')
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {r.status.split(' / ')[0]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">{r.velocity_mps.toFixed(2)} m/s</td>
                    <td className="py-2.5 px-3 text-right">{r.calibrated_sigma_mps.toFixed(2)} m/s</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{r.latency_ms.toFixed(2)} ms</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{r.parameters.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
