import { OPTIONAL_STAGE_NAMES } from './optionalStageNames.ts';

/**
 * Slots whichever OPTIONAL_STAGE_NAMES are in `enabled` into `required` right
 * after enforce:contrast, preserving OPTIONAL_STAGE_NAMES' own order — shared
 * by useIridis's live pipeline (both the color and image stage lists) and
 * useMultiOutput's export pipeline.
 */
export function spliceOptionalStages(required: readonly string[], enabled: ReadonlySet<string>): string[] {
  const idx = required.indexOf('enforce:contrast');
  const optional = OPTIONAL_STAGE_NAMES.filter((n) => {const result = enabled.has(n);
    return result;});
  const result = [...required];
  result.splice(idx + 1, 0, ...optional);
  return result;
}
