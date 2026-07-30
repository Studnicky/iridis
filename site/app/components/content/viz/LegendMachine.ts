class LegendItem {
  public readonly active: boolean | undefined;
  public readonly color: string;
  public readonly key: string;
  public readonly label: string;
  public readonly swatch: 'solid' | 'dashed' | 'square' | 'circle';

  public constructor(
    active: boolean | undefined,
    color: string,
    key: string,
    label: string,
    swatch: 'solid' | 'dashed' | 'square' | 'circle'
  ) {
    this.active = active;
    this.color = color;
    this.key = key;
    this.label = label;
    this.swatch = swatch;
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
    return new LegendState(this.#hooks.getSections());
  }

  public isToggleable(item: LegendItem): boolean {
    return item.active !== undefined && this.#hooks.toggle !== undefined;
  }

  public toggle(key: string): void {
    this.#hooks.toggle?.(key);
  }
};
