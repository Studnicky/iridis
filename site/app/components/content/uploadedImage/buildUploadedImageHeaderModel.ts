export const buildUploadedImageHeaderModel = class UploadedImageHeaderModel {
  public readonly countLabel: string;
  public readonly removeAriaLabel: string;
  public readonly showInlineHeader: boolean;

  private constructor(countLabel: string, removeAriaLabel: string, showInlineHeader: boolean) {
    this.countLabel = countLabel;
    this.removeAriaLabel = removeAriaLabel;
    this.showInlineHeader = showInlineHeader;
  }

  public static build(
    name: string,
    dominantColorCount: number,
    showHeader: boolean
  ): UploadedImageHeaderModel {
    return new UploadedImageHeaderModel(
      `${dominantColorCount} dominant color${dominantColorCount === 1 ? '' : 's'}`,
      `Remove ${name}`,
      showHeader
    );
  }
};
