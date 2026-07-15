import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Vertical-bar particle — a thin elongated column, real element. Both its
 * consumers want a vertical orientation (hackerman's matrix-rain columns fall
 * straight down; restaurant's steam wisps rise straight up with a waver), so
 * the base shape is tall-and-thin with no rotation; each theme's own CSS
 * override supplies the direction/style/sway.
 */
export const renderStreak: ParticleRendererType = ({ colorVar, count, sizePx }) => {
  const elements = Array.from({ 'length': count }, (_, i) => {
    const { x, y } = randomPlacement();
    return {
      'glyph': undefined,
      'id': `streak-${i}`,
      'style': {
        'animationDelay': `${randomDelay(6)}, ${randomDelay(4)}`,
        'background': colorVar,
        'height': `${sizePx * 3}px`,
        'left': `${x}vw`,
        'top': `${y}vh`,
        'width': `${Math.max(1, sizePx / 4)}px`
      }
    };
  });
  return { 'elements': elements, 'kind': 'elements' };
};
