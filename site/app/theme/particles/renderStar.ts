import type { ParticleElementInterface } from './interfaces/particleElementInterface.ts';
import type { ParticleRendererInterface } from './interfaces/particleRendererInterface.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Streamer particle — a colored Unicode star glyph, real element (trivially
 * recognizable at small sizes without clip-path polygon math). The rhythmic
 * scale/fade firework-burst pacing is the theme's own CSS override — this
 * renderer only places and desyncs the particles.
 */
class RenderStarOperation {
  static readonly render: ParticleRendererInterface['render'] = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementInterface[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      elements.push({
        'glyph': '★',
        'id': `star-${i}`,
        'style': { 'animationDelay': randomDelay(3), 'color': colorVar, 'fontSize': `${sizePx}px`, 'left': `${x}vw`, 'top': `${y}vh` }
      });
    }
    return { 'rendering': { 'elements': elements, 'surface': 'elements' } };
  };
}

export const renderStar: ParticleRendererInterface = { 'render': RenderStarOperation.render };
