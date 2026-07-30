import type { CSSProperties } from 'vue';

import type { ContrastPairingType } from '~/composables/types/contrastPairing.ts';

class PairingPreviewTableRowModel {
  public readonly backgroundHex: string;
  public readonly complianceLabel: string;
  public readonly foregroundHex: string;
  public readonly key: ContrastPairingType['key'];
  public readonly label: string;
  public readonly previewStyle: CSSProperties;

  public constructor(pairing: ContrastPairingType) {
    this.backgroundHex = pairing.background.hex;
    this.complianceLabel = pairing.complianceLabel;
    this.foregroundHex = pairing.foreground.hex;
    this.key = pairing.key;
    this.label = pairing.label;
    this.previewStyle = {
      'backgroundColor': pairing.background.hex,
      'color': pairing.foreground.hex
    };
  }
}

export const buildPairingPreviewTableModel = class PairingPreviewTableModelBuilder {
  public static build(
    pairings: readonly ContrastPairingType[]
  ): readonly PairingPreviewTableRowModel[] {
    const rows: PairingPreviewTableRowModel[] = [];
    for (const pairing of pairings) {
      rows.push(new PairingPreviewTableRowModel(pairing));
    }
    return rows;
  }
};
