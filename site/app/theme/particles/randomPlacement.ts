/** Shared placement helper every renderer uses — a viewport-relative (vw/vh) position so the field scales with the window instead of clipping on a fixed px canvas. */
export function randomPlacement(): { 'x': string; 'y': string } {
  return { 'x': (Math.random() * 100).toFixed(2), 'y': (Math.random() * 100).toFixed(2) };
}
