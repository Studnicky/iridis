export const buildUploadedImageHeaderModel = class UploadedImageHeaderModel {
  public readonly countLabel: string;
  public readonly inlineHeaderVisibilityClass: string;
  public readonly overlayButtonVisibilityClass: string;
  public readonly removeAriaLabel: string;

  private constructor(
    countLabel: string,
    inlineHeaderVisibilityClass: string,
    overlayButtonVisibilityClass: string,
    removeAriaLabel: string
  ) {
    this.countLabel = countLabel;
    this.inlineHeaderVisibilityClass = inlineHeaderVisibilityClass;
    this.overlayButtonVisibilityClass = overlayButtonVisibilityClass;
    this.removeAriaLabel = removeAriaLabel;
  }

  public static inline(name: string, dominantColorCount: number): UploadedImageHeaderModel {
    const model = new UploadedImageHeaderModel(
      `${dominantColorCount} dominant color${dominantColorCount === 1 ? '' : 's'}`,
      '',
      'hidden',
      `Remove ${name}`
    );
    return model;
  }

  public static overlay(name: string, dominantColorCount: number): UploadedImageHeaderModel {
    const model = new UploadedImageHeaderModel(
      `${dominantColorCount} dominant color${dominantColorCount === 1 ? '' : 's'}`,
      'hidden',
      '',
      `Remove ${name}`
    );
    return model;
  }
};
