import type { ParticleElementType } from './types/particleElement.ts';
import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Pixel-art particle — a small axis-aligned square, real element (a
 * box-shadow can't carry its own shape). Direction/style (arcade's stepped
 * chase-blink vs. backroads' slow diagonal drift) is each theme's own CSS
 * override — this renderer only places and desyncs the particles.
 */
class RenderSquareOperation {
  static readonly run: ParticleRendererType.Type = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementType.Type[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      elements.push({
        'glyph': undefined,
        'id': `square-${i}`,
        'style': {
          'animationDelay': `${randomDelay(16)}, ${randomDelay(20)}`,
          'background': colorVar, 'height': `${sizePx}px`, 'left': `${x}vw`, 'top': `${y}vh`, 'width': `${sizePx}px`
        }
      });
    }
    return { 'elements': elements, 'kind': 'elements' };
  };
}

export const renderSquare: ParticleRendererType.Type = RenderSquareOperation.run;
