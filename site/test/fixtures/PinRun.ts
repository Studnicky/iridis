import type { PaletteStateInterface } from '@studnicky/iridis';

import { contrastApca, contrastWcag21, InputEntity } from '@studnicky/iridis';
import { ComplianceReportEntity } from '@studnicky/iridis-contrast';

import type { PinRequest } from './PinRequest.ts';

import { COLOR_PIPELINE } from '../../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../../app/composables/createColorEngine.ts';
import { VARIANT_CONFIG } from '../../app/composables/variantConfig.ts';
import { SeedInputEntity } from '../../app/theme/types/SeedInputEntity.ts';
import { CvdBudgetDiagnostics } from './CvdBudgetDiagnostics.ts';

/** The pipeline outcome of one PinRequest with its terminal compliance report and measured ratios. */
export class PinRun {
  private static readonly measures: ReadonlyMap<string, (foreground: PaletteStateInterface['roles'][string], background: PaletteStateInterface['roles'][string]) => number> = new Map([
    ['apca', (foreground, background) => {
      const measured = Math.abs(contrastApca.apply(foreground, background));
      return measured;
    }],
    ['wcag21', (foreground, background) => {
      const measured = contrastWcag21.apply(foreground, background);
      return measured;
    }]
  ]);

  public readonly budgetUsage: { readonly 'candidateScores': number; readonly 'weightedUnits': number };
  public readonly elapsedMs: number;
  public readonly report: ComplianceReportEntity.Type;
  public readonly request: PinRequest;
  public readonly state: PaletteStateInterface;

  public constructor(
    request: PinRequest,
    state: PaletteStateInterface,
    elapsedMs: number,
    budgetUsage: { readonly 'candidateScores': number; readonly 'weightedUnits': number }
  ) {
    this.budgetUsage = budgetUsage;
    this.elapsedMs = elapsedMs;
    this.report = ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
    this.request = request;
    this.state = state;
  }

  public static execute(request: PinRequest): PinRun {
    const colors = request.seeds.map((seed) => {
      const color = SeedInputEntity.intake(seed);
      return color;
    });
    const roleNames = Array.from(request.pins.keys());
    for (let index = 0; index < roleNames.length; index += 1) {
      const role = roleNames[index] ?? '';
      colors.push(SeedInputEntity.intake({ 'hex': request.pins.get(role) ?? '', 'role': role }));
    }
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const started = performance.now();
    const observed = CvdBudgetDiagnostics.observe(() => {
      const result = engine.run(InputEntity.create({
        'colors': colors,
        'contrast': ContrastConfigFor.forOptions(request.options),
        'metadata': {
          'core:variantConfig': VARIANT_CONFIG
        },
        'roles': request.roles,
        'runtime': request.runtime
      }));
      return result;
    });
    const result = new PinRun(
      request,
      observed.result,
      performance.now() - started,
      observed.usage
    );

    return result;
  }

  public measure(foreground: string, background: string): number {
    const foregroundRole = this.state.roles[foreground];
    const backgroundRole = this.state.roles[background];
    const measure = PinRun.measures.get(this.report.selected.algorithm);
    if (foregroundRole === undefined || backgroundRole === undefined || measure === undefined) {
      throw new RangeError(`Pair ${foreground}/${background} cannot be measured.`);
    }
    const measured = measure(foregroundRole, backgroundRole);
    return measured;
  }
}
