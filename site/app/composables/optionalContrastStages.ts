/**
 * Which optional contrast-standard stage(s) (enforce:wcagAA/AAA/apca) the
 * given strictness enables — index matches contrastStrictness's three UI
 * tiers (0=AA, 1=AAA, 2=APCA/Lc); any other value enables none. Shared by
 * useIridis's live pipeline (both the reactive `enabledOptionalStages` it
 * exposes and its own pipeline builder) and useMultiOutput's export pipeline.
 */
export function optionalContrastStages(strictness: number): Set<string> {
  if (strictness === 0) {return new Set(['enforce:wcagAA']);}
  if (strictness === 1) {return new Set(['enforce:wcagAAA']);}
  if (strictness === 2) {return new Set(['enforce:apca']);}
  return new Set();
}
