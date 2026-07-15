import type { ParticleRendererType } from './types/particleRenderer.ts';

/**
 * Composition root — every particle-shape adapter registers here, dispatched
 * by shape key. Add a shape by writing its own renderer module (this shape)
 * and listing it here; AmbientBackground.vue looks it up via this map, never
 * an if/else chain.
 */
import { renderBubble } from './renderBubble.ts';
import { renderDot } from './renderDot.ts';
import { renderHeart } from './renderHeart.ts';
import { renderSquare } from './renderSquare.ts';
import { renderStar } from './renderStar.ts';
import { renderStreak } from './renderStreak.ts';

export const PARTICLE_RENDERERS: Record<string, ParticleRendererType> = {
  'bubble': renderBubble,
  'dot':    renderDot,
  'heart':  renderHeart,
  'square': renderSquare,
  'star':   renderStar,
  'streak': renderStreak
};

export type { ParticleRenderOutputType } from './types/particleRenderOutput.ts';
