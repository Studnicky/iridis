import { randomDelay, randomPlacement } from './ParticleRendererInterfaceType.ts';

import type { ParticleRendererType } from './ParticleRendererInterfaceType.ts';

/**
 * Startup particle — a soft translucent circle (rising SaaS-bubble energy),
 * real element so each one can rise independently rather than moving as one
 * rigid box-shadow group. The rise/sway itself is the theme's own CSS
 * override — this renderer only places, sizes, and desyncs the particles.
 */
export const renderBubble: ParticleRendererType = ({ count, colorVar, sizePx }) => {
  const elements = Array.from({ 'length': count }, (_, i) => {
    const { x, y } = randomPlacement();
    return {
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
    };
  });
  return { 'elements': elements, 'kind': 'elements' };
};
