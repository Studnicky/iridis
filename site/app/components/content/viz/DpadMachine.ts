interface DpadHooksInterface {
  can(action: DpadItem['action']): boolean;
  readonly 'getHint': (() => string | null) | undefined;
  readonly 'getZoomLevel': (() => number | null) | undefined;
  readonly 'getZoomText': (() => string | null) | undefined;
  run(action: DpadItem['action']): void | Promise<void>;
}

class DpadMetadata {
  public readonly label: string;
  public readonly title: string;

  public constructor(label: string, title: string) {
    this.label = label;
    this.title = title;
  }
}

class DpadItem {
  public readonly action:
    | 'zoom-in'
    | 'pan-up'
    | 'zoom-out'
    | 'pan-left'
    | 'centre'
    | 'pan-right'
    | 'expand'
    | 'close'
    | 'pan-down'
    | 'fit';
  public readonly disabled: boolean;
  public readonly label: string;
  public readonly title: string;

  public constructor(
    action: DpadItem['action'],
    disabled: boolean,
    label: string,
    title: string
  ) {
    this.action = action;
    this.disabled = disabled;
    this.label = label;
    this.title = title;
  }
}

class DpadState {
  public readonly hint: string | null;
  public readonly items: readonly DpadItem[];
  public readonly mode: 'inline' | 'modal';
  public readonly zoomLevel: number | null;
  public readonly zoomText: string | null;

  public constructor(
    hint: string | null,
    items: readonly DpadItem[],
    mode: 'inline' | 'modal',
    zoomLevel: number | null,
    zoomText: string | null
  ) {
    this.hint = hint;
    this.items = items;
    this.mode = mode;
    this.zoomLevel = zoomLevel;
    this.zoomText = zoomText;
  }
}

/**
 * Package-owned D-pad state machine.
 *
 * The machine owns canonical button ordering and labels, inline versus modal
 * lower-left behavior, disabled-state evaluation, and zoom HUD state.
 */
export const DpadMachine = class DpadMachine {
  static readonly #inlineGrid: readonly DpadItem['action'][] = [
    'zoom-in', 'pan-up', 'zoom-out',
    'pan-left', 'centre', 'pan-right',
    'expand', 'pan-down', 'fit'
  ];

  static readonly #metadataByAction = new Map<DpadItem['action'], DpadMetadata>([
    ['centre', new DpadMetadata('⊙', 'Centre view')],
    ['close', new DpadMetadata('✕', 'Close (Esc)')],
    ['expand', new DpadMetadata('⛶', 'Expand fullscreen')],
    ['fit', new DpadMetadata('⤢', 'Fit to view')],
    ['pan-down', new DpadMetadata('▼', 'Pan down')],
    ['pan-left', new DpadMetadata('◀', 'Pan left')],
    ['pan-right', new DpadMetadata('▶', 'Pan right')],
    ['pan-up', new DpadMetadata('▲', 'Pan up')],
    ['zoom-in', new DpadMetadata('＋', 'Zoom in')],
    ['zoom-out', new DpadMetadata('－', 'Zoom out')]
  ]);

  static readonly #modalGrid: readonly DpadItem['action'][] = [
    'zoom-in', 'pan-up', 'zoom-out',
    'pan-left', 'centre', 'pan-right',
    'close', 'pan-down', 'fit'
  ];

  readonly #hooks: DpadHooksInterface;
  #mode: 'inline' | 'modal';

  public constructor(hooks: DpadHooksInterface, mode: 'inline' | 'modal' = 'inline') {
    this.#hooks = hooks;
    this.#mode = mode;
  }

  public setMode(mode: 'inline' | 'modal'): void {
    this.#mode = mode;
  }

  public state(): DpadState {
    const actions = this.#mode === 'modal' ? DpadMachine.#modalGrid : DpadMachine.#inlineGrid;
    const items = actions.map((action) => {
      const metadata = DpadMachine.#metadataByAction.get(action);
      if (metadata === undefined) {
        throw new Error(`Unknown D-pad action: ${action}`);
      }
      return new DpadItem(action, !this.#hooks.can(action), metadata.label, metadata.title);
    });
    const zoomLevel = this.#hooks.getZoomLevel?.() ?? null;
    const zoomText = this.#hooks.getZoomText?.()
      ?? (zoomLevel === null ? null : `${zoomLevel.toFixed(2)}×`);
    return new DpadState(
      this.#hooks.getHint?.() ?? 'drag · wheel',
      items,
      this.#mode,
      zoomLevel,
      zoomText
    );
  }

  public async press(action: DpadItem['action']): Promise<void> {
    if (!this.#hooks.can(action)) {return;}
    await this.#hooks.run(action);
  }
};
