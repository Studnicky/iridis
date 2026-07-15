/** Maps a chroma value to a canvas Y coordinate, auto-scaled to the buffer's own min/max with padding, and flipped so higher chroma draws nearer the top. Used by ColorStreamCard.vue's per-role seismograph canvases. */
export function scaleChromaToY(value: number, min: number, max: number, canvasHeight: number): number {
  const range = max - min;
  if (range <= 0) { return canvasHeight / 2; }
  const padding = range * 0.15;
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  const t = (value - paddedMin) / (paddedMax - paddedMin);
  return canvasHeight - t * canvasHeight;
}
