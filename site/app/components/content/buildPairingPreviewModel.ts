import type { ThemeDefinitionInterfaceType } from '~/theme/ThemeDefinitionInterfaceType.ts';

import { selectDataCardLayout } from './selectDataCardLayout.ts';

class PairingCardLayout {
  public readonly class: string;
  public readonly compact: boolean;

  public constructor(className: string, compact: boolean) {
    this.class = className;
    this.compact = compact;
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
    'grid': new PairingCardLayout('grid grid-cols-1 gap-3 sm:grid-cols-3', false),
    'list': new PairingCardLayout('grid grid-cols-1 gap-3', false),
    'pixel': new PairingCardLayout('grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6', true)
  } satisfies Record<Exclude<ThemeDefinitionInterfaceType['dataLayout'], 'table'>, PairingCardLayout>;

  public static build(
    dataLayout: ThemeDefinitionInterfaceType['dataLayout'],
    pairingCount: number
  ): PairingPreviewModel {
    const activeCardLayout = selectDataCardLayout.select(
      dataLayout,
      PairingPreviewModelBuilder.cardLayouts
    );
    return new PairingPreviewModel(
      activeCardLayout,
      `${pairingCount} pairing${pairingCount === 1 ? '' : 's'}`
    );
  }
};
