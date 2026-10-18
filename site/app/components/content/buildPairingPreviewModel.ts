import type { DataLayoutStrategy } from '~/theme/DataLayoutStrategy.ts';

import { PairingCardPresentation } from './PairingCardPresentation.ts';
import { selectDataCardLayout } from './selectDataCardLayout.ts';

class PairingCardLayout {
  public readonly class: string;
  public readonly presentation: PairingCardPresentation;

  public constructor(className: string, presentation: PairingCardPresentation) {
    this.class = className;
    this.presentation = presentation;
  }
}

class PairingPreviewModel {
  public readonly activeCardLayout: PairingCardLayout | undefined;
  public readonly countLabel: string;

  public constructor(activeCardLayout: PairingCardLayout | undefined, countLabel: string) {
    this.activeCardLayout = activeCardLayout;
    this.countLabel = countLabel;
  }
}

export const buildPairingPreviewModel = class PairingPreviewModelBuilder {
  private static readonly cardLayouts = {
    'grid': new PairingCardLayout('grid grid-cols-1 gap-3 sm:grid-cols-3', PairingCardPresentation.expanded),
    'list': new PairingCardLayout('grid grid-cols-1 gap-3', PairingCardPresentation.expanded),
    'pixel': new PairingCardLayout('grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6', PairingCardPresentation.compact)
  };

  public static build(
    dataLayout: DataLayoutStrategy,
    pairingCount: number
  ): PairingPreviewModel {
    const activeCardLayout = selectDataCardLayout.select(
      dataLayout,
      PairingPreviewModelBuilder.cardLayouts.grid,
      PairingPreviewModelBuilder.cardLayouts.list,
      PairingPreviewModelBuilder.cardLayouts.pixel
    );
    return new PairingPreviewModel(
      activeCardLayout,
      `${pairingCount} pairing${pairingCount === 1 ? '' : 's'}`
    );
  }
};
