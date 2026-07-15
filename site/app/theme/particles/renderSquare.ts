import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Pixel-art particle — a small axis-aligned square, real element (a
 * box-shadow can't carry its own shape). Direction/style (arcade's stepped
 * chase-blink vs. backroads' slow diagonal drift) is each theme's own CSS
 * override — this renderer only places and desyncs the particles.
 */
export const renderSquare: ParticleRendererType = ({ colorVar, count, sizePx }) => {
  const elements = Array.from({ 'length': count }, (_, i) => {
    const { x, y } = randomPlacement();
    return {
      'glyph': undefined,
      'id': `square-${i}`,
      'style': {
        'animationDelay': `${randomDelay(16)}, ${randomDelay(20)}`,
        'background': colorVar, 'height': `${sizePx}px`, 'left': `${x}vw`, 'top': `${y}vh`, 'width': `${sizePx}px`
      }
    };
  });
  return { 'elements': elements, 'kind': 'elements' };
};
