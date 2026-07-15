/** Human-readable label for one of an algorithm's candidate hue slots, e.g. "Base (0°)" / "+30°" / "-30°". */
export function hueVariantLabel(offsetDeg: number): string {
  if (offsetDeg === 0) {return 'Base (0°)';}
  // Fold into the shortest signed angle (-180, 180] so a counter-clockwise
  // rotation — which the wrap-into-[0,360) algorithms above return as e.g.
  // 330 for a -30° analogous slot — reads as "-30°" instead of "+330°".
  let folded = offsetDeg;
  if (folded > 180) {folded -= 360;}
  else if (folded <= -180) {folded += 360;}
  const rounded = Math.round(folded);
  if (rounded === 0) {return 'Base (0°)';}
  return `${rounded > 0 ? '+' : ''}${rounded}°`;
}
