import type { ParticleElementInterface } from './interfaces/particleElementInterface.ts';
import type { ParticleRendererInterface } from './interfaces/particleRendererInterface.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Startup particle — a soft translucent circle (rising SaaS-bubble energy),
 * real element so each one can rise independently rather than moving as one
 * rigid box-shadow group. The rise/sway itself is the theme's own CSS
 * override — this renderer only places, sizes, and desyncs the particles.
 */
class RenderBubbleOperation {
  static readonly render: ParticleRendererInterface['render'] = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementInterface[] = [];
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
    return { 'rendering': { 'elements': elements, 'surface': 'elements' } };
  };
}

export const renderBubble: ParticleRendererInterface = { 'render': RenderBubbleOperation.render };
