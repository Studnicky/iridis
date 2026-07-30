import type { ParticleElementType } from './types/particleElement.ts';
import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Startup particle — a soft translucent circle (rising SaaS-bubble energy),
 * real element so each one can rise independently rather than moving as one
 * rigid box-shadow group. The rise/sway itself is the theme's own CSS
 * override — this renderer only places, sizes, and desyncs the particles.
 */
class RenderBubbleOperation {
  static readonly run: ParticleRendererType.Type = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementType.Type[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      elements.push({
        'glyph': undefined,
        'id': `bubble-${i}`,
        'style': {
          'animationDelay': `${randomDelay(14)}, ${randomDelay(5)}`,
          'background': colorVar,
          'borderRadius': '50%',
          'height': `${sizePx}px`,
          'left': `${x}vw`,
          'top': `${y}vh`,
          'width': `${sizePx}px`
        }
      });
    }
    return { 'elements': elements, 'kind': 'elements' };
  };
}

export const renderBubble: ParticleRendererType.Type = RenderBubbleOperation.run;
