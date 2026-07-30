class ContrastStrictnessOption {
  public readonly active: boolean;
  public readonly label: 'AA' | 'AAA' | 'APCA';
  public readonly value: number;

  public constructor(label: 'AA' | 'AAA' | 'APCA', value: number, active: boolean) {
    this.active = active;
    this.label = label;
    this.value = value;
  }
}

export const buildContrastStrictnessModel = class ContrastStrictnessModel {
  private static readonly options = [
    { 'label': 'AA', 'value': 0 },
    { 'label': 'AAA', 'value': 1 },
    { 'label': 'APCA', 'value': 2 }
  ] as const;

  public readonly body: string;
  public readonly options: ContrastStrictnessOption[];

  private constructor(body: string, options: ContrastStrictnessOption[]) {
    this.body = body;
    this.options = options;
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
    for (const option of ContrastStrictnessModel.options) {
      options.push(new ContrastStrictnessOption(
        option.label,
        option.value,
        option.value === strictness
      ));
    }
    return new ContrastStrictnessModel(ContrastStrictnessModel.body(strictness), options);
  }
};
