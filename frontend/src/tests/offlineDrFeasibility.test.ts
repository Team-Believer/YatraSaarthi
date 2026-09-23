/**
 * YatraSaarthi - Offline Dead-Reckoning Engine Feasibility Benchmark Test
 */

import { runClientEngineBenchmark } from '../services/offline/offlineDrEnginePoc';

export async function runOfflineFeasibilityTest() {
  console.log('--- 3. Client-Side InEKF & Feature Extraction Feasibility Benchmark ---');
  const metrics = await runClientEngineBenchmark();

  console.log(`- Feature Extraction Latency: ${metrics.featureExtractionLatencyMs.toFixed(4)} ms`);
  console.log(`- Filter Step Latency:        ${metrics.filterStepLatencyMs.toFixed(4)} ms`);
  console.log(`- Total Step Latency:         ${metrics.totalStepLatencyMs.toFixed(4)} ms`);
  console.log(`- Maximum Sustainable Rate:   ${metrics.maxSustainableHz} Hz (Target: >= 50 Hz)`);
  console.log(`- Covariance Symmetry:        ${metrics.covarianceSymmetric ? 'PRESERVED' : 'FAILED'}`);
  console.log(`- Position Displacement:      ${metrics.positionDriftMeters.toFixed(2)} m`);
  console.log(`- Feasibility Assessment:     ${metrics.passedFeasibility ? 'FEASIBLE & VERIFIED' : 'FAILED'}`);

  return metrics;
}

if (typeof window === 'undefined') {
  runOfflineFeasibilityTest();
}
