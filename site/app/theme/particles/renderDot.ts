import type { ParticleDotInterface } from './interfaces/particleDotInterface.ts';
import type { ParticleRendererInterface } from './interfaces/particleRendererInterface.ts';

import { randomPlacement } from './randomPlacement.ts';

/** The default starfield particle — viewport-unit dot placements the ambient canvas paints. */
class RenderDotOperation {
  static readonly render: ParticleRendererInterface['render'] = ({
    blur, colorVar, count
  }) => {
    const dots: ParticleDotInterface[] = [];

    for (let i = 0; i < count; i += 1) {
      const {
        x, y
      } = randomPlacement();

      dots.push({
        'x': Number(x),
        'y': Number(y)
      });
    }

    return {
      'rendering': {
        'blurPx': Number.parseFloat(blur),
        'colorVar': colorVar,
        'dots': dots,
        'surface': 'dots'
      }
    };
  };
}

export const renderDot: ParticleRendererInterface = { 'render': RenderDotOperation.render };
