/** Maps a sample index (0-based, oldest-first) to a canvas X coordinate — oldest at the left edge, newest at the right edge. Used by ColorStreamCard.vue's per-role seismograph canvases. */
export function sampleIndexToX(index: number, sampleCount: number, canvasWidth: number): number {
  if (sampleCount <= 1) { return canvasWidth; }
  return (index / (sampleCount - 1)) * canvasWidth;
}
