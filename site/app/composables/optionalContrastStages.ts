/**
 * Maps a contrast strictness value to optional engine stages. The PaletteSession
 * adapter uses this mapping while constructing the pipeline for an admitted
 * intent; unsupported values select no optional standard.
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
