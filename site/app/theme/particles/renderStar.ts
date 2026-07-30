import type { ParticleElementType } from './types/particleElement.ts';
import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomDelay } from './randomDelay.ts';
import { randomPlacement } from './randomPlacement.ts';

/**
 * Streamer particle — a colored Unicode star glyph, real element (trivially
 * recognizable at small sizes without clip-path polygon math). The rhythmic
 * scale/fade firework-burst pacing is the theme's own CSS override — this
 * renderer only places and desyncs the particles.
 */
class RenderStarOperation {
  static readonly run: ParticleRendererType.Type = ({ colorVar, count, sizePx }) => {
    const elements: ParticleElementType.Type[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      elements.push({
        'glyph': '★',
        'id': `star-${i}`,
        'style': { 'animationDelay': randomDelay(3), 'color': colorVar, 'fontSize': `${sizePx}px`, 'left': `${x}vw`, 'top': `${y}vh` }
      });
    }
    return { 'elements': elements, 'kind': 'elements' };
  };
}

export const renderStar: ParticleRendererType.Type = RenderStarOperation.run;
