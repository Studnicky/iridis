class ContrastStrictnessOption {
  public readonly interactionClass: string;
  public readonly labelText: string;
  public readonly value: number;

  public constructor(interactionClass: string, labelText: string, value: number) {
    this.interactionClass = interactionClass;
    this.labelText = labelText;
    this.value = value;
  }
}

export const buildContrastStrictnessModel = class ContrastStrictnessModel {
  private static readonly activeInteractionClass = 'text-primary';
  private static readonly inactiveInteractionClass = 'cursor-pointer hover:text-muted';
  private static readonly options = [
    { 'label': 'AA', 'value': 0 },
    { 'label': 'AAA', 'value': 1 },
    { 'label': 'APCA', 'value': 2 }
  ] as const;

  public readonly body: string;
  public readonly options: ContrastStrictnessOption[];
  public readonly selectedLabelText: string;

  private constructor(body: string, options: ContrastStrictnessOption[], selectedLabelText: string) {
    this.body = body;
    this.options = options;
    this.selectedLabelText = selectedLabelText;
  }

  private static body(strictness: number): string {
    if (strictness === 0) {
      return 'AA is the WCAG 2.1 minimum: 4.5:1 (3:1 for large text).';
    }
    if (strictness === 1) {
      return 'AAA is the enhanced WCAG 2.1 level: 7:1 (4.5:1 for large text).';
    }
    return 'APCA is the modern perceptual contrast algorithm (target Lc).';
  }

  public static build(strictness: number): ContrastStrictnessModel {
    const options: ContrastStrictnessOption[] = [];
    let selectedLabelText = '';
    for (let index = 0; index < ContrastStrictnessModel.options.length; index += 1) {
      const option = ContrastStrictnessModel.options[index];
      if (option === undefined) {
        continue;
      }
      const interactionClass = option.value === strictness
        ? ContrastStrictnessModel.activeInteractionClass
        : ContrastStrictnessModel.inactiveInteractionClass;
      if (option.value === strictness) {
        selectedLabelText = option.label;
      }
      options.push(new ContrastStrictnessOption(interactionClass, option.label, option.value));
    }
    return new ContrastStrictnessModel(ContrastStrictnessModel.body(strictness), options, selectedLabelText);
  }
};
