import type { PinRun } from './PinRun.ts';

/** Formats the timing and measured ratios of a PinRun for test-runner diagnostics. */
export class PinDiagnostics {
  public static emit(context: { readonly 'diagnostic': (message: string) => void }, label: string, run: PinRun): void {
    const ratios: string[] = [];
    for (let index = 0; index < run.report.pairs.length; index += 1) {
      const pair = run.report.pairs[index];
      if (pair !== undefined) {
        const measured = run.measure(pair.foreground, pair.background);
        const failure = pair.passed ? '' : ' FAIL';
        ratios.push(`${pair.foreground}/${pair.background}=${measured.toFixed(2)}/${pair.required.toFixed(2)}${failure}`);
      }
    }
    context.diagnostic(`${label}: ${run.elapsedMs.toFixed(0)}ms compliant=${String(run.report.compliant)} disposition=${run.report.disposition} ${ratios.join(' ')}`);
  }
}
