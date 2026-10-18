class LegendItem {
  public readonly activeResolver?: () => boolean | undefined;
  public readonly color: string;
  public readonly key: string;
  public readonly label: string;
  public readonly swatch: string;

  public constructor(
    active: () => boolean | undefined,
    color: string,
    key: string,
    label: string,
    swatch: string
  ) {
    this.activeResolver = active;
    this.color = color;
    this.key = key;
    this.label = label;
    this.swatch = swatch;
  }

  public get active(): boolean | undefined {
    const resolveActive = this.activeResolver;
    if (resolveActive === undefined) {
      return undefined;
    }
    const result = resolveActive();
    return result;
  }
}

class LegendSection {
  public readonly entries: readonly LegendItem[];
  public readonly key: string;
  public readonly label: string;

  public constructor(entries: readonly LegendItem[], key: string, label: string) {
    this.entries = entries;
    this.key = key;
    this.label = label;
  }
}

class LegendState {
  public readonly sections: readonly LegendSection[];

  public constructor(sections: readonly LegendSection[]) {
    this.sections = sections;
  }
}

interface LegendHooksInterface {
  getSections(): readonly LegendSection[];
  readonly 'toggle'?: (key: string) => void;
}

export const LegendMachine = class LegendMachine {
  readonly #hooks: LegendHooksInterface;

  public constructor(hooks: LegendHooksInterface) {
    this.#hooks = hooks;
  }

  public state(): LegendState {
    const result = new LegendState(this.#hooks.getSections());
    return result;
  }

  public isToggleable(item: LegendItem): boolean {
    const result = item.active !== undefined && this.#hooks.toggle !== undefined;
    return result;
  }

  public toggle(key: string): void {
    this.#hooks.toggle?.(key);
  }
};
