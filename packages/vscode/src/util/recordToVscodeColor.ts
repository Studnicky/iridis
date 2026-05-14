import type { ColorRecordInterface } from '@studnicky/iridis';

/**
 * Serialises a {@link ColorRecordInterface} to the VS Code colour string
 * form: `color(display-p3 r g b)` at 4 decimal places when the record
 * carries `displayP3` (out-of-sRGB OKLCH input or `intake:p3` origin);
 * the canonical sRGB hex otherwise.
 *
 * VS Code 1.85+ accepts CSS Color 4 `color()` functional notation in any
 * theme colour slot (`workbench.colorCustomizations`, `tokenColors[].settings.foreground`,
 * `semanticTokenColors`). Older VS Code falls back to its hex parser
 * which silently rejects `color(...)`; consumers targeting < 1.85 ship
 * the sRGB-only hex string by using `record.hex` directly.
 *
 * 4dp precision matches the stylesheet plugin's `serializeP3` helper so
 * a record emitted through `EmitCssVars`'s P3 cascade renders identical
 * pixels to the same record routed through VS Code's theme JSON on a
 * P3-capable browser/editor.
 */
export function recordToVscodeColor(record: ColorRecordInterface): string {
  const p3 = record.displayP3;
  if (!p3) return record.hex;
  const r = p3.r.toFixed(4);
  const g = p3.g.toFixed(4);
  const b = p3.b.toFixed(4);
  return `color(display-p3 ${r} ${g} ${b})`;
}
