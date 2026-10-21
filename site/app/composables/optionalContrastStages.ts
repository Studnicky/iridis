/**
 * Maps a contrast strictness value to optional engine stages. useIridis and
 * useMultiOutput use this mapping when constructing palette-resolution
 * pipelines; unsupported values select no optional standard.
 */
class OptionalContrastStagesOperation {
  static run(strictness: number): Set<string> {
    if (strictness === 0) {return new Set(['enforce:wcagAA']);}
    if (strictness === 1) {return new Set(['enforce:wcagAAA']);}
    if (strictness === 2) {return new Set(['enforce:apca']);}
    return new Set();
  }
}

export const optionalContrastStages = OptionalContrastStagesOperation.run;
