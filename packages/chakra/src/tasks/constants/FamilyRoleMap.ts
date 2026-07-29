/**
 * Chakra color-family name → resolved-role mapping, with an optional
 * fallback role consulted when the primary role never resolves. Order
 * mirrors Chakra's semantic palette conventions (brand first, neutral
 * last).
 */
export const FAMILY_ROLE_MAP: readonly { 'fallback'?: string; 'family': string; 'role': string }[] = [
  { 'family': 'brand', 'role': 'brand' },
  { 'fallback': 'brand', 'family': 'accent', 'role': 'accent-alt' },
  { 'fallback': 'brand', 'family': 'success', 'role': 'success' },
  { 'fallback': 'brand', 'family': 'warning', 'role': 'warning' },
  { 'family': 'error', 'role': 'error' },
  { 'fallback': 'brand', 'family': 'info', 'role': 'info' },
  { 'fallback': 'text', 'family': 'neutral', 'role': 'muted' }
];
