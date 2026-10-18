class CodeBlockPreviewState {
  public readonly collapsedHeightClass: string;
  public readonly disclosureLabel: string;
  public readonly expandedHeightClass: string;
  public readonly initialHeightClass: string;
  public readonly totalLines: number;

  public constructor(
    collapsedHeightClass: string,
    disclosureLabel: string,
    expandedHeightClass: string,
    initialHeightClass: string,
    totalLines: number
  ) {
    this.collapsedHeightClass = collapsedHeightClass;
    this.disclosureLabel = disclosureLabel;
    this.expandedHeightClass = expandedHeightClass;
    this.initialHeightClass = initialHeightClass;
    this.totalLines = totalLines;
  }
}

export const buildCodeBlockViewModel = class CodeBlockViewModelBuilder {
  public static readonly copyResetDelayMs = 1500;
  private static readonly expandedHeightClass = 'max-h-[28rem]';

  public static previewState(
    code: string,
    previewLines: number | undefined
  ): CodeBlockPreviewState {
    const totalLines = code.length === 0 ? 0 : code.split('\n').length;
    const collapsedHeightClass = 'max-h-40';
    const hasDisclosure = previewLines !== undefined && totalLines > previewLines;
    const disclosureLabel = hasDisclosure ? `Show full file (${totalLines} lines)` : '';
    const initialHeightClass = hasDisclosure
      ? collapsedHeightClass
      : CodeBlockViewModelBuilder.expandedHeightClass;
    return new CodeBlockPreviewState(
      collapsedHeightClass,
      disclosureLabel,
      CodeBlockViewModelBuilder.expandedHeightClass,
      initialHeightClass,
      totalLines
    );
  }
};
