import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import { ImageExtractionResultEntity } from '../../app/composables/entities/ImageExtractionResultEntity.ts';

/** Extraction outcomes and candidate palettes for image-intake tests. */
export class PaletteSessionImageFixture {
  public static defaultSeeds(): { 'hex': string }[] {
    const result = [{ 'hex': '#000000' }, { 'hex': '#ffffff' }];
    return result;
  }

  public static candidate(label: string, weighted: readonly { 'hex': string; 'weight': number }[]): GalleryCandidateOutputEntity.Type {
    const result = GalleryCandidateOutputEntity.intake({
      'algorithm': 'k-means',
      'colors': weighted.map((color) => {
        const record = {
          'alpha': 1,
          'hex': color.hex,
          'hints': { 'weight': color.weight },
          'oklch': { 'c': 0.1, 'h': 30, 'l': 0.5 },
          'rgb': { 'b': 0, 'g': 0, 'r': 0 },
          'sourceFormat': 'imagePixel'
        };
        return record;
      }),
      'k': weighted.length,
      'label': label
    });
    return result;
  }

  public static lopsided(): { 'hex': string; 'weight': number }[] {
    const result = [{ 'hex': '#aa0000', 'weight': 3 }, { 'hex': '#00aa00', 'weight': 1 }];
    return result;
  }

  public static extraction(
    records: readonly { 'hex': string; 'weight': number }[],
    candidates: GalleryCandidateOutputEntity.Type[]
  ): ImageExtractionResultEntity.Type {
    const result = ImageExtractionResultEntity.intake({
      'candidates': candidates,
      'dominantColorRecords': [...records],
      'histogram': [...records]
    });
    return result;
  }
}
