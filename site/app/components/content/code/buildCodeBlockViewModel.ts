class CodeBlockPreviewState {
  public readonly collapsedHeightClass: string;
  public readonly disclosureLabel: string;
  public readonly expandedHeightClass: string;
  public readonly totalLines: number;

  public constructor(
    collapsedHeightClass: string,
    disclosureLabel: string,
    expandedHeightClass: string,
    totalLines: number
  ) {
    this.collapsedHeightClass = collapsedHeightClass;
    this.disclosureLabel = disclosureLabel;
    this.expandedHeightClass = expandedHeightClass;
    this.totalLines = totalLines;
  }
}

export const buildCodeBlockViewModel = class CodeBlockViewModelBuilder {
  public static readonly copyResetDelayMs = 1500;
  private static readonly expandedHeightClass = 'max-h-[28rem]';

  public static clampedCode(
    code: string,
    lineLimit: number | undefined
  ): string {
    const lines = code.split('\n');
    const isClamped = lineLimit !== undefined && lines.length > lineLimit;
    const result = isClamped ? lines.slice(0, lineLimit).join('\n') : code;
    return result;
  }

  public static previewState(
    code: string,
    previewLines: number | undefined
  ): CodeBlockPreviewState {
    const totalLines = code.length === 0 ? 0 : code.split('\n').length;
    const collapsedHeightClass = 'max-h-40';
    const hasDisclosure = previewLines !== undefined && totalLines > previewLines;
    const disclosureLabel = hasDisclosure ? `Show full file (${totalLines} lines)` : '';
    return new CodeBlockPreviewState(
      collapsedHeightClass,
      disclosureLabel,
      CodeBlockViewModelBuilder.expandedHeightClass,
      totalLines
    );
  }
};
