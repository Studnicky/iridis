import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';

export const buildUploadedImagePatchModel = class UploadedImagePatchModelBuilder {
  public static buildAlgorithm(
    image: UploadedImageInterfaceType,
    algorithm: UploadedImageInterfaceType['algorithm']
  ): UploadedImageInterfaceType {
    return { ...image, 'algorithm': algorithm };
  }

  public static buildChromaRange(
    image: UploadedImageInterfaceType,
    chromaRange: UploadedImageInterfaceType['chromaRange']
  ): UploadedImageInterfaceType {
    return { ...image, 'chromaRange': chromaRange };
  }

  public static buildDeltaECap(
    image: UploadedImageInterfaceType,
    deltaECap: UploadedImageInterfaceType['deltaECap']
  ): UploadedImageInterfaceType {
    return { ...image, 'deltaECap': deltaECap };
  }

  public static buildHarmonizeThreshold(
    image: UploadedImageInterfaceType,
    harmonizeThreshold: UploadedImageInterfaceType['harmonizeThreshold']
  ): UploadedImageInterfaceType {
    return { ...image, 'harmonizeThreshold': harmonizeThreshold };
  }

  public static buildHistogramBits(
    image: UploadedImageInterfaceType,
    histogramBits: UploadedImageInterfaceType['histogramBits']
  ): UploadedImageInterfaceType {
    return { ...image, 'histogramBits': histogramBits };
  }

  public static buildK(
    image: UploadedImageInterfaceType,
    k: UploadedImageInterfaceType['k']
  ): UploadedImageInterfaceType {
    return { ...image, 'k': k };
  }

  public static buildLightnessRange(
    image: UploadedImageInterfaceType,
    lightnessRange: UploadedImageInterfaceType['lightnessRange']
  ): UploadedImageInterfaceType {
    return { ...image, 'lightnessRange': lightnessRange };
  }
};
