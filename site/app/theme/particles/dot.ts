import type { ParticleRendererType } from './ParticleRendererInterfaceType.ts';

import { randomPlacement } from './ParticleRendererInterfaceType.ts';

/** The default starfield particle — one `box-shadow` entry per dot, all painted in a single CSS property. */
export const renderDot: ParticleRendererType = ({ blur, colorVar, count }) => {
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const { x, y } = randomPlacement();
    dots.push(`${x}vw ${y}vh ${blur} ${colorVar}`);
  }
  return { 'boxShadow': dots.join(','), 'kind': 'boxShadow' };
};
