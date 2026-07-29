class CodeBlockPreviewState {
  public readonly expandedByDefault: boolean;
  public readonly isLong: boolean;
  public readonly totalLines: number;

  public constructor(isLong: boolean, totalLines: number) {
    this.expandedByDefault = !isLong;
    this.isLong = isLong;
    this.totalLines = totalLines;
  }
}

export const buildCodeBlockViewModel = class CodeBlockViewModelBuilder {
  public static readonly copyResetDelayMs = 1500;

  public static previewState(
    code: string,
    previewLines: number | undefined
  ): CodeBlockPreviewState {
    const totalLines = code.length === 0 ? 0 : code.split('\n').length;
    const isLong = previewLines !== undefined && totalLines > previewLines;
    return new CodeBlockPreviewState(isLong, totalLines);
  }
};
