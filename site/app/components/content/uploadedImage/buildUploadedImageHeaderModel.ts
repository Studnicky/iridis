export type UploadedImageHeaderModel = {
  readonly countLabel: string;
  readonly removeAriaLabel: string;
  readonly showInlineHeader: boolean;
};

export function buildUploadedImageHeaderModel(
  name: string,
  dominantColorCount: number,
  showHeader: boolean
): UploadedImageHeaderModel {
  return {
    countLabel: `${dominantColorCount} dominant color${dominantColorCount === 1 ? '' : 's'}`,
    removeAriaLabel: `Remove ${name}`,
    showInlineHeader: showHeader
  };
}
