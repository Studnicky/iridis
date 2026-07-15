/**
 * Semantic hue targets, applied as a BOUNDED nudge (the engine rotates each
 * role toward the target by at most SEMANTIC_HUE_CLAMP degrees). This keeps
 * success/warning/error/info rooted in the actual palette — a red-dominant
 * image yields warm-leaning semantics rather than pure green/blue that
 * appear nowhere in it.
 */
export const SEMANTIC_HUE: Record<string, number> = { 'error': 25, 'info': 230, 'success': 160, 'warning': 60 };
