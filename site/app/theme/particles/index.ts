import type { ParticleRendererType } from './ParticleRendererInterfaceType.ts';

/**
 * Composition root — every particle-shape adapter registers here, dispatched
 * by shape key. Add a shape by writing its own renderer module (this shape)
 * and listing it here; AmbientBackground.vue looks it up via this map, never
 * an if/else chain.
 */
import { renderBubble } from './bubble.ts';
import { renderDot } from './dot.ts';
import { renderHeart } from './heart.ts';
import { renderSquare } from './square.ts';
import { renderStar } from './star.ts';
import { renderStreak } from './streak.ts';

export const PARTICLE_RENDERERS: Record<string, ParticleRendererType> = {
  'bubble': renderBubble,
  'dot':    renderDot,
  'heart':  renderHeart,
  'square': renderSquare,
  'star':   renderStar,
  'streak': renderStreak
};

export type { ParticleRenderOutputType } from './ParticleRendererInterfaceType.ts';
