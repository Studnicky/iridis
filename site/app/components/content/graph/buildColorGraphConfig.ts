import type { GraphConfig } from '@cosmos.gl/graph';

import { buildColorGraphViewModel } from './buildColorGraphViewModel.ts';

/** Builds the cosmos construction configuration for the role graph from the theme colour and the component callbacks. */
export const buildColorGraphConfig = class ColorGraphConfigBuilder {
  public static build(
    backgroundColor: GraphConfig['backgroundColor'],
    onSimulationTick: () => void,
    onZoom: () => void,
    onZoomEnd: () => void
  ): GraphConfig {
    const result: GraphConfig = {
      'backgroundColor': backgroundColor,
      'enableDrag': true,
      'enableRightClickRepulsion': true,
      // The component runs its own fit sequence; the library's delayed init fit would override a restored view.
      'fitViewOnInit': false,
      'onSimulationTick': onSimulationTick,
      'onZoom': onZoom,
      'onZoomEnd': onZoomEnd,
      'simulationCollision': 1,
      'simulationCollisionPadding': 10,
      'simulationDecay': 12000,
      'simulationGravity': 0.02,
      // Tuned to the scale buildBuffers seeds (hub ring radius 900, leaf
      // satellite radius 260): repulsion dominates the weak link spring so
      // nodes push apart and only the ring/derivation edges hold structure.
      'simulationLinkDistance': 260,
      'simulationLinkSpring': 0.15,
      'simulationRepulsion': 8,
      'simulationRepulsionFromMouse': 3,
      'simulationRepulsionTheta': 1.4,
      'spaceSize': buildColorGraphViewModel.spaceSize
    };

    return result;
  }
};
