/** Pure axis-mapping helpers for ColorStreamCard.vue's per-role seismograph canvases. */

/** Maps a chroma value to a canvas Y coordinate, auto-scaled to the buffer's own min/max with padding, and flipped so higher chroma draws nearer the top. */
export function scaleChromaToY(value: number, min: number, max: number, canvasHeight: number): number {
  const range = max - min;
  if (range <= 0) { return canvasHeight / 2; }
  const padding = range * 0.15;
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  const t = (value - paddedMin) / (paddedMax - paddedMin);
  return canvasHeight - t * canvasHeight;
}

/** Maps a sample index (0-based, oldest-first) to a canvas X coordinate — oldest at the left edge, newest at the right edge. */
export function sampleIndexToX(index: number, sampleCount: number, canvasWidth: number): number {
  if (sampleCount <= 1) { return canvasWidth; }
  return (index / (sampleCount - 1)) * canvasWidth;
}
