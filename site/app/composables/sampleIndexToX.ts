/** Maps a sample index (0-based, oldest-first) to a canvas X coordinate — oldest at the left edge, newest at the right edge. Used by ColorStreamCard.vue's per-role seismograph canvases. */
class SampleIndexToXOperation {
  static run(index: number, sampleCount: number, canvasWidth: number): number {
    if (sampleCount <= 1) { return canvasWidth; }
    const result = (index / (sampleCount - 1)) * canvasWidth;
    return result;
  }
}

export const sampleIndexToX = SampleIndexToXOperation.run;
