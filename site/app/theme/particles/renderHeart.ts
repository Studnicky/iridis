import type { ParticleElementType } from './types/particleElement.ts';
import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Girlypop/romance particle — a colored Unicode heart glyph, real element
 * (trivially recognizable at small sizes without clip-path polygon math).
 * Direction/style (girlypop's rising bubble-wobble vs. romance's falling
 * flutter) is each theme's own CSS override — this renderer only places and
 * desyncs the particles.
 */
class RenderHeartOperation {
  static readonly run: ParticleRendererType.Type = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementType.Type[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      elements.push({
        'glyph': '❤',
        'id': `heart-${i}`,
        'style': {
          'animationDelay': `${randomDelay(12)}, ${randomDelay(6)}`,
          'color': colorVar, 'fontSize': `${sizePx}px`, 'left': `${x}vw`, 'top': `${y}vh`
        }
      });
    }
    return { 'elements': elements, 'kind': 'elements' };
  };
}

export const renderHeart: ParticleRendererType.Type = RenderHeartOperation.run;
