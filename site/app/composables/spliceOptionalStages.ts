import { OPTIONAL_STAGE_NAMES } from './optionalStageNames.ts';

/**
 * Inserts admitted optional contrast stages immediately after enforce:contrast
 * while retaining their declared order. The PaletteSession adapter supplies the
 * resulting canonical stage sequence to the engine.
 */
class SpliceOptionalStagesOperation {
  static run(required: readonly string[], enabled: ReadonlySet<string>): string[] {
    const index = required.indexOf('enforce:contrast');
    const optional = OPTIONAL_STAGE_NAMES.filter((n) => {const result = enabled.has(n);
      return result;});
    const result = [...required];
    result.splice(index + 1, 0, ...optional);
    return result;
  }
}

export const spliceOptionalStages = SpliceOptionalStagesOperation.run;
