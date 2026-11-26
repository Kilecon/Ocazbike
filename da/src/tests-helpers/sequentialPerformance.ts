export interface SequentialPerformanceResult {
  iterations: number;
  meanMs: number;
  p99Ms: number;
}

export async function measureSequentialBatches(
  action: (index: number) => Promise<unknown>,
  sampleCount: number,
  operationsPerSample: number,
): Promise<SequentialPerformanceResult> {
  const sampleMeans: number[] = [];

  const runSample = async (sample: number): Promise<void> => {
    if (sample >= sampleCount) return;

    const start = performance.now();
    const runOperation = async (offset: number): Promise<void> => {
      if (offset >= operationsPerSample) return;
      await action(sample * operationsPerSample + offset);
      await runOperation(offset + 1);
    };
    await runOperation(0);
    sampleMeans.push((performance.now() - start) / operationsPerSample);
    await runSample(sample + 1);
  };

  await runSample(0);
  sampleMeans.sort((left, right) => left - right);

  return {
    iterations: sampleCount * operationsPerSample,
    meanMs:
      sampleMeans.reduce((sum, sample) => sum + sample, 0) / sampleMeans.length,
    p99Ms: sampleMeans[Math.ceil(sampleMeans.length * 0.99) - 1],
  };
}
