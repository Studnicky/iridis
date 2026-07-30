/** Maps a chroma value to a canvas Y coordinate, auto-scaled to the buffer's own min/max with padding, and flipped so higher chroma draws nearer the top. Used by ColorStreamCard.vue's per-role seismograph canvases. */
class ScaleChromaToYOperation {
  static run(value: number, minimum: number, maximum: number, canvasHeight: number): number {
    const range = maximum - minimum;
    if (range <= 0) { return canvasHeight / 2; }
    const padding = range * 0.15;
    const paddedMinimum = minimum - padding;
    const paddedMaximum = maximum + padding;
    const t = (value - paddedMinimum) / (paddedMaximum - paddedMinimum);
    return canvasHeight - t * canvasHeight;
  }
}

export const scaleChromaToY = ScaleChromaToYOperation.run;
