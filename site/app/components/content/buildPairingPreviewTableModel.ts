import type { ContrastPairingType } from '~/composables/types/contrastPairing.ts';

export type PairingPreviewTableRowModel = {
  readonly backgroundHex: string;
  readonly complianceLabel: string;
  readonly foregroundHex: string;
  readonly key: ContrastPairingType['key'];
  readonly label: string;
  readonly previewStyle: {
    readonly backgroundColor: string;
    readonly color: string;
  };
};

export function buildPairingPreviewTableModel(
  pairings: readonly ContrastPairingType[]
): readonly PairingPreviewTableRowModel[] {
  return pairings.map((pairing) => {
    return {
      backgroundHex: pairing.background.hex,
      complianceLabel: pairing.complianceLabel,
      foregroundHex: pairing.foreground.hex,
      key: pairing.key,
      label: pairing.label,
      previewStyle: {
        backgroundColor: pairing.background.hex,
        color: pairing.foreground.hex
      }
    };
  });
}
