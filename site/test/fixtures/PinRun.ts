import type { PaletteStateInterface } from '@studnicky/iridis';

import { contrastApca, contrastWcag21, InputEntity } from '@studnicky/iridis';
import { ComplianceReportEntity } from '@studnicky/iridis-contrast';
import { JsonValue } from '@studnicky/types/node';

import type { PinRequest } from './PinRequest.ts';

import { COLOR_PIPELINE } from '../../app/composables/colorPipeline.ts';
import { ContrastConfigFor } from '../../app/composables/contrastConfigFor.ts';
import { createColorEngine } from '../../app/composables/createColorEngine.ts';
import { DerivationConfigEntity } from '../../app/composables/entities/DerivationConfigEntity.ts';
import { VARIANT_CONFIG } from '../../app/composables/variantConfig.ts';
import { SeedInputEntity } from '../../app/theme/types/SeedInputEntity.ts';

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

  public readonly elapsedMs: number;
  public readonly report: ComplianceReportEntity.Type;
  public readonly request: PinRequest;
  public readonly state: PaletteStateInterface;

  public constructor(request: PinRequest, state: PaletteStateInterface, elapsedMs: number) {
    this.elapsedMs = elapsedMs;
    this.report = ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
    this.request = request;
    this.state = state;
  }

  public static execute(request: PinRequest): PinRun {
    const colors = [SeedInputEntity.intake('#000000'), SeedInputEntity.intake('#ffffff')];
    const roleNames = Array.from(request.pins.keys());
    for (let index = 0; index < roleNames.length; index += 1) {
      const role = roleNames[index] ?? '';
      colors.push(SeedInputEntity.intake({ 'hex': request.pins.get(role) ?? '', 'role': role }));
    }
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const started = performance.now();
    const state = engine.run(InputEntity.create({
      'colors': colors,
      'contrast': ContrastConfigFor.forStrictness(request.strictness),
      'metadata': {
        'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
        'derivation:config': JsonValue.from(DerivationConfigEntity.defaultValue),
        'derivation:semanticHuesEnabled': true
      },
      'roles': request.roles,
      'runtime': request.runtime
    }));
    const result = new PinRun(request, state, performance.now() - started);
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
