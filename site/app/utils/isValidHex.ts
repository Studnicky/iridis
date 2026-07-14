const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** True for a well-formed 6-digit `#rrggbb` hex string — the one validity check every engine-output filter in useIridis.ts shares. */
export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}
