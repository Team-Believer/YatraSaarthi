import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  BrainCircuit,
  Sparkles,
} from 'lucide-react';
import {
  fetchModels,
  selectActiveModel,
  runMLBenchmark,
  type RegisteredModel,
  type BenchmarkResponse,
} from '../../services/api/mlService';
import { clsx } from 'clsx';

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Production
        </span>
      );
    }
    if (status.includes('REFERENCE') || status.includes('BASELINE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
          <CheckCircle2 className="w-3 h-3 text-blue-600" />
          Baseline
        </span>
      );
    }
    if (status.includes('ROBUSTNESS')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
          <Activity className="w-3 h-3 text-amber-600" />
          Robustness
        </span>
      );
    }
    if (status.includes('ABLATION')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/80">
          <Layers className="w-3 h-3 text-purple-600" />
          Ablation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        Degraded
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
    <div className="space-y-4">
      {/* Registry Sub-header & Secondary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-clean/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-ink">
              Model Variant Registry & Benchmarking
            </h3>
            <p className="text-[11px] text-ink-mute">
              {models.length} model variants available for comparative analysis & ablation inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={benchmarking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-canvas-soft hover:bg-canvas-softer active:bg-[#E5E5E5] text-ink border border-border-clean transition-all cursor-pointer disabled:opacity-50"
          >
            {benchmarking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#083335]" />
                <span>Benchmarking...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#083335]" />
                <span>Run Benchmark</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-xl text-xs bg-canvas-soft hover:bg-canvas-softer text-ink-body border border-border-clean transition-all cursor-pointer"
            title="Refresh Registry"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Model Banner */}
      <div className="bg-canvas-soft/60 rounded-xl p-3 sm:p-3.5 border border-border-clean flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#083335] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
            {activeModelId}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-ink-mute block">Active Live Model</span>
            <div className="text-xs font-bold text-ink flex items-center gap-2 truncate">
              <span>{models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase())?.name || activeModelId}</span>
              {models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase()) &&
                getStatusBadge(models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase())!.status)}
            </div>
          </div>
        </div>

        {activeModelId !== 'E5' && (
          <button
            type="button"
            onClick={() => handleSelectModel('E5')}
            disabled={switching}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#083335] text-white hover:bg-[#052426] transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            Reset to Production Default (E5)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border-clean/60 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedFilter('ALL')}
          className={clsx(
            "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
            selectedFilter === 'ALL'
              ? 'bg-[#083335] text-white'
              : 'text-ink-body hover:bg-canvas-soft'
          )}
        >
          All Variants ({models.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('PRODUCTION')}
          className={clsx(
            "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
            selectedFilter === 'PRODUCTION'
              ? 'bg-[#083335] text-white'
              : 'text-ink-body hover:bg-canvas-soft'
          )}
        >
          Production (3)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('BASELINES')}
          className={clsx(
            "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
            selectedFilter === 'BASELINES'
              ? 'bg-[#083335] text-white'
              : 'text-ink-body hover:bg-canvas-soft'
          )}
        >
          Baselines (3)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('ABLATIONS')}
          className={clsx(
            "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
            selectedFilter === 'ABLATIONS'
              ? 'bg-[#083335] text-white'
              : 'text-ink-body hover:bg-canvas-soft'
          )}
        >
          Ablations (6)
        </button>
      </div>

      {/* Compact Models Table / List */}
      <div className="overflow-x-auto rounded-xl border border-border-clean bg-white divide-y divide-border-clean/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas-soft/60 text-ink-mute font-mono text-[10.5px] uppercase">
            <tr>
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">Role & Category</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Primary RMSE</th>
              <th className="py-2.5 px-3 text-right">Params</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-clean/60">
            {filteredModels.map((m) => {
              const isActive = m.model_id.toUpperCase() === activeModelId.toUpperCase();
              const isExpanded = expandedModelId === m.model_id;

              return (
                <tr
                  key={m.model_id}
                  className={clsx(
                    "hover:bg-canvas-soft/40 transition-colors",
                    isActive && "bg-[#083335]/5"
                  )}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-ink">{m.model_id}</span>
                      <button
                        type="button"
                        onClick={() => setExpandedModelId(isExpanded ? null : m.model_id)}
                        className="text-ink-mute hover:text-ink text-[11px] font-sans flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="font-medium text-ink truncate max-w-[140px] sm:max-w-[200px]">{m.name}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 p-2.5 bg-canvas-soft rounded-lg text-[11px] text-ink-body space-y-1">
                        <p><strong>Architecture:</strong> {m.architecture}</p>
                        <p><strong>Input:</strong> {m.input_description} ({m.input_channels} channels, {m.window_samples} samples)</p>
                        <p><strong>Artifact:</strong> <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-border-clean">{m.weights_file}</code></p>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-ink-body">
                    {m.output_description}
                  </td>
                  <td className="py-2.5 px-3">
                    {getStatusBadge(m.status)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                    {m.primary_rmse_mps !== null ? `${m.primary_rmse_mps.toFixed(2)} m/s` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-ink-mute">
                    {m.parameters ? `${(m.parameters / 1000).toFixed(0)}k` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#083335] text-white">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectModel(m.model_id)}
                        disabled={switching}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-canvas-soft hover:bg-canvas-softer text-ink border border-border-clean cursor-pointer transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Benchmark Results Modal / Box */}
      {benchmarkData && (
        <div className="bg-canvas-soft rounded-xl p-4 border border-border-clean space-y-3">
          <div className="flex items-center justify-between border-b border-border-clean/80 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#083335]" />
              <h4 className="text-xs font-bold text-ink">Multi-Model Benchmark Results</h4>
              <span className="text-[10.5px] text-ink-mute">(Evaluated across 5.0s temporal sequence)</span>
            </div>
            <button
              type="button"
              onClick={() => setBenchmarkData(null)}
              className="text-[11px] text-ink-mute hover:text-ink cursor-pointer px-2 py-0.5 rounded bg-white border border-border-clean"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-ink-mute uppercase border-b border-border-clean/80">
                <tr>
                  <th className="py-1.5 px-2">Model</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2 text-right">Pred Velocity</th>
                  <th className="py-1.5 px-2 text-right">Sigma (±σ)</th>
                  <th className="py-1.5 px-2 text-right">Latency</th>
                  <th className="py-1.5 px-2 text-right">Params</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-clean/60">
                {benchmarkData.results.map((r) => (
                  <tr
                    key={r.model_id}
                    className={clsx(
                      "hover:bg-white/60 transition-colors",
                      r.model_id.toUpperCase() === activeModelId.toUpperCase() && "bg-[#083335]/5 font-bold text-[#083335]"
                    )}
                  >
                    <td className="py-1.5 px-2 font-sans font-medium">{r.model_id} ({r.name.split(' ')[0]})</td>
                    <td className="py-1.5 px-2 font-sans text-[10.5px]">{getStatusBadge(r.status)}</td>
                    <td className="py-1.5 px-2 text-right">{r.velocity_mps.toFixed(2)} m/s</td>
                    <td className="py-1.5 px-2 text-right">{r.calibrated_sigma_mps.toFixed(2)} m/s</td>
                    <td className="py-1.5 px-2 text-right text-emerald-700">{r.latency_ms.toFixed(1)} ms</td>
                    <td className="py-1.5 px-2 text-right text-ink-mute">{r.parameters.toLocaleString()}</td>
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
