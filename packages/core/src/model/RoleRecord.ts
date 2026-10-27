import type { ColorHintsEntity } from '../entities/ColorHintsEntity.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

/** Rebuilds canonical color records when a role changes their hints. */
export class RoleRecord {
  static withHints(
    record: ColorRecordEntity.Type,
    hints: ColorHintsEntity.Type | undefined
  ): ColorRecordEntity.Type {
    const result = ColorRecordEntity.create({
      'alpha': record.alpha,
      ...(record.displayP3 === undefined ? {} : { 'displayP3': record.displayP3 }),
      'hex': record.hex,
      ...(hints === undefined ? {} : { 'hints': hints }),
      'oklch': record.oklch,
      'rgb': record.rgb,
      'sourceFormat': record.sourceFormat
    });
    return result;
  }
}
