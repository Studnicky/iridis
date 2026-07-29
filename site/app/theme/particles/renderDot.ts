import type { ParticleRendererType } from './types/particleRenderer.ts';

import { randomPlacement } from './randomPlacement.ts';

/** The default starfield particle — one `box-shadow` entry per dot, all painted in a single CSS property. */
class RenderDotOperation {
  static readonly run: ParticleRendererType.Type = ({ blur, colorVar, count }) => {
    const dots: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const { x, y } = randomPlacement();
      dots.push(`${x}vw ${y}vh ${blur} ${colorVar}`);
    }
    return { 'boxShadow': dots.join(','), 'kind': 'boxShadow' };
  };
}

export const renderDot: ParticleRendererType.Type = RenderDotOperation.run;
