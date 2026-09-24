import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Play,
  Layers,
  ChevronDown,
  Activity,
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Production
        </span>
      );
    }
    if (status.includes('REFERENCE') || status.includes('BASELINE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <CheckCircle2 className="w-3 h-3 text-blue-600" />
          Baseline
        </span>
      );
    }
    if (status.includes('ROBUSTNESS')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Activity className="w-3 h-3 text-amber-600" />
          Robustness
        </span>
      );
    }
    if (status.includes('ABLATION')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <Layers className="w-3 h-3 text-purple-600" />
          Ablation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        Degraded
      </span>
    );
  };

  const activeModel = models.find((m) => m.model_id.toUpperCase() === activeModelId.toUpperCase());

  const filteredModels = models.filter((m) => {
    if (selectedFilter === 'PRODUCTION') return m.status.includes('PRODUCTION');
    if (selectedFilter === 'BASELINES') return m.status.includes('BASELINE') || m.status.includes('ROBUSTNESS');
    if (selectedFilter === 'ABLATIONS') return m.status.includes('FAILED') || m.status.includes('ABLATION');
    return true;
  });

  return (
    <div className="space-y-3.5 text-xs font-body">
      {/* 1. Compact Active Model Summary */}
      <div className="bg-white rounded-xl p-3.5 border border-[#E5E7EB] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#083335] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
              {activeModelId}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CA5A6] block font-heading">
                Active Navigation Model
              </span>
              <div className="font-heading font-bold text-sm text-[#083335] flex items-center gap-2">
                <span>{activeModel?.name || 'E5 Physics-Aware Gravity Velocity Model'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 font-mono">
              PRODUCTION / VALIDATED
            </span>
            {activeModelId !== 'E5' && (
              <button
                type="button"
                onClick={() => handleSelectModel('E5')}
                disabled={switching}
                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#083335] text-white hover:bg-[#052426] transition-colors cursor-pointer"
              >
                Reset to E5
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#F0F2F2] text-[11.5px] font-mono text-ink">
          <div>
            <span className="text-[10px] text-[#8CA5A6] block font-sans">Models Loaded</span>
            <span className="font-semibold text-[#083335]">E5 · U2</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8CA5A6] block font-sans">Runtime</span>
            <span className="font-semibold text-ink">WASM + SIMD</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8CA5A6] block font-sans">Window</span>
            <span className="font-semibold text-ink">50 samples @ 10 Hz</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8CA5A6] block font-sans">Total Variants</span>
            <span className="font-semibold text-ink">{models.length} registered</span>
          </div>
        </div>
      </div>

      {/* Action / Benchmark Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PRODUCTION', 'BASELINES', 'ABLATIONS'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                selectedFilter === filter
                  ? 'bg-[#083335] text-white shadow-2xs'
                  : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#F0F4F4]'
              )}
            >
              {filter === 'ALL'
                ? `All (${models.length})`
                : filter === 'PRODUCTION'
                ? 'Production'
                : filter === 'BASELINES'
                ? 'Baselines'
                : 'Ablations'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={benchmarking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-[#083335] border border-[#E5E7EB] transition-colors cursor-pointer disabled:opacity-50"
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
            aria-label="Refresh Registry"
            className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#5E5E5E] border border-[#E5E7EB] transition-colors cursor-pointer"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Expandable Model Rows (Only ONE model detail row open at a time) */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F0F2F2] overflow-hidden">
        {filteredModels.map((m) => {
          const isActive = m.model_id.toUpperCase() === activeModelId.toUpperCase();
          const isExpanded = expandedModelId === m.model_id;

          return (
            <div
              key={m.model_id}
              className={clsx(
                'transition-colors',
                isActive && 'bg-[#083335]/[0.03]'
              )}
            >
              <div
                onClick={() => setExpandedModelId(isExpanded ? null : m.model_id)}
                className="p-3 sm:px-3.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/70 select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs text-[#083335] w-6 shrink-0">
                    {m.model_id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-semibold text-xs sm:text-sm text-ink truncate">
                      {m.name}
                    </div>
                    <div className="text-[11px] text-[#5E5E5E] font-body truncate">
                      {m.output_description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:block text-right font-mono text-[11px] text-[#5E5E5E]">
                    {m.primary_rmse_mps !== null ? `${m.primary_rmse_mps.toFixed(2)} m/s` : '—'}
                  </div>
                  <div>
                    {getStatusBadge(m.status)}
                  </div>
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#083335] text-white shrink-0">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectModel(m.model_id);
                      }}
                      disabled={switching}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F0F4F4] hover:bg-[#E2EBEB] text-[#083335] transition-colors cursor-pointer shrink-0"
                    >
                      Activate
                    </button>
                  )}
                  <ChevronDown
                    className={clsx(
                      'w-3.5 h-3.5 text-[#8CA5A6] transition-transform duration-200',
                      isExpanded && 'transform rotate-180'
                    )}
                  />
                </div>
              </div>

              {/* Single Model Expanded Drawer */}
              {isExpanded && (
                <div className="px-4 py-3 bg-[#F9FBFA] border-t border-[#F0F2F2] space-y-2 text-[11.5px] font-body animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[#8CA5A6] block font-sans">Architecture</span>
                      <span className="text-ink font-semibold">{m.architecture}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8CA5A6] block font-sans">Input Format</span>
                      <span className="text-ink font-semibold">{m.input_description} ({m.input_channels} ch, {m.window_samples} samples)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8CA5A6] block font-sans">Parameters</span>
                      <span className="text-ink font-semibold">{m.parameters ? m.parameters.toLocaleString() : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8CA5A6] block font-sans">Weights File</span>
                      <span className="text-ink font-semibold">{m.weights_file}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Benchmark Results Drawer */}
      {benchmarkData && (
        <div className="bg-white rounded-xl p-3.5 border border-[#E5E7EB] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#F0F2F2] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#083335]" />
              <h4 className="text-xs font-bold text-[#083335] font-heading">Benchmark Evaluation Results</h4>
            </div>
            <button
              type="button"
              onClick={() => setBenchmarkData(null)}
              className="text-[11px] text-[#5E5E5E] hover:text-ink cursor-pointer px-2 py-0.5 rounded bg-[#F0F4F4]"
            >
              Close
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {benchmarkData.results.map((r) => (
              <div
                key={r.model_id}
                className={clsx(
                  'p-2 rounded-lg flex items-center justify-between gap-2',
                  r.model_id.toUpperCase() === activeModelId.toUpperCase()
                    ? 'bg-[#083335]/[0.06] font-bold text-[#083335]'
                    : 'bg-[#F9FBFA] text-ink'
                )}
              >
                <span>{r.model_id} ({r.name.split(' ')[0]})</span>
                <div className="flex items-center gap-3">
                  <span>{r.velocity_mps.toFixed(2)} m/s</span>
                  <span>±{r.calibrated_sigma_mps.toFixed(2)}</span>
                  <span className="text-emerald-700">{r.latency_ms.toFixed(1)} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
