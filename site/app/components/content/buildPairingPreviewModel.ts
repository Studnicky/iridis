import type { ThemeDefinitionInterfaceType } from '~/theme/ThemeDefinitionInterfaceType.ts';
import { selectDataCardLayout } from './selectDataCardLayout.ts';

type PairingCardLayout = {
  readonly class: string;
  readonly compact: boolean;
};

export type PairingPreviewModel = {
  readonly activeCardLayout: PairingCardLayout | undefined;
  readonly countLabel: string;
};

const PAIRING_CARD_LAYOUTS = {
  'grid': {
    'class':   'grid grid-cols-1 gap-3 sm:grid-cols-3',
    'compact': false
  },
  'list': {
    'class':   'grid grid-cols-1 gap-3',
    'compact': false
  },
  'pixel': {
    'class':   'grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6',
    'compact': true
  }
} as const satisfies Record<Exclude<ThemeDefinitionInterfaceType['dataLayout'], 'table'>, PairingCardLayout>;

export function buildPairingPreviewModel(
  dataLayout: ThemeDefinitionInterfaceType['dataLayout'],
  pairingCount: number
): PairingPreviewModel {
  return {
    activeCardLayout: selectDataCardLayout(dataLayout, PAIRING_CARD_LAYOUTS),
    countLabel: `${pairingCount} pairing${pairingCount === 1 ? '' : 's'}`
  };
}
