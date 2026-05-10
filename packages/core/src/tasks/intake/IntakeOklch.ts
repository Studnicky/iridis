import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

interface OklchInput {
  'l': number;
  'c': number;
  'h': number;
  'a'?: number;
}

function isOklchInput(v: unknown): v is OklchInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['l'] === 'number'
    && typeof o['c'] === 'number'
    && typeof o['h'] === 'number'
    && typeof o['r'] !== 'number'
    && typeof o['s'] !== 'number';
}

export class IntakeOklch implements TaskInterface {
  readonly 'name' = 'intake:oklch';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'intake:oklch',
    'reads':       ['input.colors'],
    'writes':      ['colors'],
    'description': 'Parses {l,c,h,a?} OKLCH (l: 0..1, c: 0..0.5, h: 0..360) into ColorRecord entries.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (const raw of state.input.colors) {
      if (!isOklchInput(raw)) {
        continue;
      }

      const { l, c, h } = raw;
      const a = typeof raw['a'] === 'number' ? raw['a'] : 1;

      const record = colorRecordFactory.fromOklch(
        Math.max(0, Math.min(1, l)),
        Math.max(0, Math.min(0.5, c)),
        ((h % 360) + 360) % 360,
        Math.max(0, Math.min(1, a)),
      );

      state.colors.push(record);
      ctx.logger.debug('IntakeOklch', 'run', `Parsed oklch(${l},${c},${h}) → ${record.hex}`);
    }
  }
}

export const intakeOklch = new IntakeOklch();
