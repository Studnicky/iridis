import type { ClusterStrategyInterface } from '@studnicky/iridis-image';

import type { UploadedImage } from '~/composables/types/index.ts';

export const buildUploadedImagePatchModel = class UploadedImagePatchModelBuilder {
  public static buildStrategy(
    image: UploadedImage,
    strategy: ClusterStrategyInterface
  ): UploadedImage {
    const result: UploadedImage = {
      'candidates':            image.candidates,
      'chromaRange':            image.chromaRange,
      'deltaECap':              image.deltaECap,
      'dominantColorRecords':   image.dominantColorRecords,
      'harmonizeThreshold':     image.harmonizeThreshold,
      'histogram':              image.histogram,
      'histogramBits':          image.histogramBits,
      'id':                     image.id,
      'k':                      image.k,
      'lightnessRange':         image.lightnessRange,
      'name':                   image.name,
      'selectedCandidateLabel': image.selectedCandidateLabel,
      'source':                 image.source,
      'strategy':               strategy
    };
    return result;
  }

  public static buildChromaRange(
    image: UploadedImage,
    chromaRange: UploadedImage['chromaRange']
  ): UploadedImage {
    return { ...image, 'chromaRange': chromaRange };
  }

  public static buildDeltaECap(
    image: UploadedImage,
    deltaECap: UploadedImage['deltaECap']
  ): UploadedImage {
    return { ...image, 'deltaECap': deltaECap };
  }

  public static buildHarmonizeThreshold(
    image: UploadedImage,
    harmonizeThreshold: UploadedImage['harmonizeThreshold']
  ): UploadedImage {
    return { ...image, 'harmonizeThreshold': harmonizeThreshold };
  }

  public static buildHistogramBits(
    image: UploadedImage,
    histogramBits: UploadedImage['histogramBits']
  ): UploadedImage {
    return { ...image, 'histogramBits': histogramBits };
  }

  public static buildK(
    image: UploadedImage,
    k: UploadedImage['k']
  ): UploadedImage {
    return { ...image, 'k': k };
  }

  public static buildLightnessRange(
    image: UploadedImage,
    lightnessRange: UploadedImage['lightnessRange']
  ): UploadedImage {
    return { ...image, 'lightnessRange': lightnessRange };
  }
};
