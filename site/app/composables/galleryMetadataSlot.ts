import type { PaletteStateInterface } from '@studnicky/iridis';

import { ColorRecordInterfaceTypeEntity } from '@studnicky/iridis';
import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import { GalleryHistogramSlotEntity } from './entities/GalleryHistogramSlotEntity.ts';

/** Reads the gallery metadata slots an engine run leaves, rejecting any slot that does not match its schema. */
export class GalleryMetadataSlot {
  public static candidates(metadata: PaletteStateInterface['metadata']): GalleryCandidateOutputEntity.Type[] {
    const value = metadata['gallery:candidates'];
    let result: GalleryCandidateOutputEntity.Type[] = [];
    if (Array.isArray(value)) {
      result = value.map(GalleryCandidateOutputEntity.intake);
    } else if (value !== undefined) {
      throw new TypeError('Metadata slot gallery:candidates does not match the candidate palette schema');
    }
    return result;
  }

  public static dominantColors(metadata: PaletteStateInterface['metadata']): ColorRecordInterfaceTypeEntity.Type[] {
    const value = metadata['gallery:dominantColors'];
    let result: ColorRecordInterfaceTypeEntity.Type[] = [];
    if (Array.isArray(value)) {
      result = value.map(ColorRecordInterfaceTypeEntity.intake);
    } else if (value !== undefined) {
      throw new TypeError('Metadata slot gallery:dominantColors does not match the color-record schema');
    }
    return result;
  }

  public static histogram(metadata: PaletteStateInterface['metadata']): GalleryHistogramSlotEntity.Type['bins'] {
    const value = metadata['gallery:histogram'];
    let result: GalleryHistogramSlotEntity.Type['bins'] = [];
    if (value !== undefined) {
      result = GalleryHistogramSlotEntity.intake(value).bins;
    }
    return result;
  }
}
