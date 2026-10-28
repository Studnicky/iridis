import type { ClusterStrategyInterface } from '@studnicky/iridis-image';

import { ClusterDispatcher, GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import type { UploadedImage } from '../types/index.ts';
import type { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';

import { cloneRanges } from '../../utils/cloneRanges.ts';
import { PaletteSessionImage } from './PaletteSessionImage.ts';

/** Pure image-intake views over the session image state; no state. */
export class PaletteSessionImageViews {
  /** The plain hex list an entry contributes, for per-image summary swatches. */
  public static effectiveHexes(entry: PaletteSessionImageEntity.Type['entries'][number]): string[] {
    const result = PaletteSessionImage.contribution(entry).map((weighted) => {
      const hex = weighted.hex;
      return hex;
    });
    return result;
  }

  /** The cluster strategy object of an extraction settings block. */
  public static strategy(settings: PaletteSessionImageEntity.Type['entries'][number]['settings']): ClusterStrategyInterface {
    const result = ClusterDispatcher.resolve(settings.algorithm);
    return result;
  }

  public static uploadedImage(entry: PaletteSessionImageEntity.Type['entries'][number]): UploadedImage {
    const result: UploadedImage = {
      'candidates': entry.candidates.map((candidate) => {
        const branded = GalleryCandidateOutputEntity.intake(candidate);
        return branded;
      }),
      'chromaRange': cloneRanges(entry.settings.chromaRange),
      'deltaECap': entry.settings.deltaECap,
      'dominantColorRecords': entry.dominantColorRecords,
      'harmonizeThreshold': entry.settings.harmonizeThreshold,
      'histogram': entry.histogram,
      'histogramBits': entry.settings.histogramBits,
      'id': entry.id,
      'k': entry.settings.k,
      'lightnessRange': cloneRanges(entry.settings.lightnessRange),
      'name': entry.name,
      'selectedCandidateLabel': entry.selectedCandidateLabel ?? null,
      'source': entry.source,
      'strategy': PaletteSessionImageViews.strategy(entry.settings)
    };
    return result;
  }

  public static uploadedImages(image: PaletteSessionImageEntity.Type): UploadedImage[] {
    const result = image.entries.map((entry) => {
      const view = PaletteSessionImageViews.uploadedImage(entry);
      return view;
    });
    return result;
  }
}
