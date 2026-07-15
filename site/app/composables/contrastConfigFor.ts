/** Contrast level per strictness tier — index matches contrastStrictness's three UI values (0=AA, 1=AAA, 2=APCA/Lc); any other value falls back to Lc. */
const CONTRAST_LEVEL_BY_STRICTNESS: Record<number, 'AA' | 'AAA' | 'Lc'> = { '0': 'AA', '1': 'AAA' };

/**
 * Maps contrastStrictness + cvdCorrect to the engine's `input.contrast` config
 * — shared by the live palette pipeline (useIridis's run() and
 * combineNowRun()) and the export pipeline (useMultiOutput) so all three
 * enforce the identical contrast standard and CVD auto-correction.
 */
export function contrastConfigFor(strictness: number, cvdCorrect: boolean): { 'algorithm': 'apca' | 'wcag21'; 'cvdCorrect': boolean; 'extra': undefined; 'level': 'AA' | 'AAA' | 'Lc' } {
  return {
    'algorithm':  strictness === 2 ? 'apca' : 'wcag21',
    'cvdCorrect': cvdCorrect,
    'extra':      undefined,
    'level':      CONTRAST_LEVEL_BY_STRICTNESS[strictness] ?? 'Lc'
  };
}
