import type { ColorRecordInterface } from '@studnicky/iridis';

/**
 * Serialise a Display-P3 channel triple into CSS Color 4
 * `color(display-p3 r g b)` syntax at 4 decimal places of precision —
 * tight enough to survive an OKLCH → P3 → OKLCH round-trip (~1e-8 drift
 * per channel) without flapping golden fixtures, loose enough to keep
 * the emitted CSS compact.
 *
 * Returns an empty string when `p3` is `undefined` so call sites can
 * fall back to the sRGB hex without an extra branch.
 */
export function serializeP3(p3: ColorRecordInterface['displayP3']): string {
  if (!p3) return '';
  const r = p3.r.toFixed(4);
  const g = p3.g.toFixed(4);
  const b = p3.b.toFixed(4);
  return `color(display-p3 ${r} ${g} ${b})`;
}
