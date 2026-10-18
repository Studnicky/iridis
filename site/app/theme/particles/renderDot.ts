import type { ParticleRendererInterface } from './interfaces/particleRendererInterface.ts';

import { randomPlacement } from './randomPlacement.ts';

/** The default starfield particle — one `box-shadow` entry per dot, all painted in a single CSS property. */
class RenderDotOperation {
  static readonly render: ParticleRendererInterface['render'] = ({ blur, colorVar, count }) => {
    const dots: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      dots.push(`${x}vw ${y}vh ${blur} ${colorVar}`);
    }
    return { 'rendering': { 'boxShadow': dots.join(','), 'surface': 'box-shadow' } };
  };
}

export const renderDot: ParticleRendererInterface = { 'render': RenderDotOperation.render };
