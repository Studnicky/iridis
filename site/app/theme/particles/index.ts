import { renderBubble } from './renderBubble.ts';
import { renderDot } from './renderDot.ts';
import { renderHeart } from './renderHeart.ts';
import { renderSquare } from './renderSquare.ts';
import { renderStar } from './renderStar.ts';
import { renderStreak } from './renderStreak.ts';

/** Composition root for selected particle renderer implementations. */
export const PARTICLE_RENDERERS = new Map([
  ['bubble', renderBubble],
  ['dot', renderDot],
  ['heart', renderHeart],
  ['square', renderSquare],
  ['star', renderStar],
  ['streak', renderStreak]
]);

export type { ParticleRendererInterface } from './interfaces/particleRendererInterface.ts';
export type { ParticleRenderOutputInterface } from './interfaces/particleRenderOutputInterface.ts';
