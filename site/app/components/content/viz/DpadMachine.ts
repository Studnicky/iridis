import { DpadActionInterfaceTypeEntity } from './DpadActionInterfaceTypeEntity.ts';
import { VisualizationModeInterfaceTypeEntity } from './VisualizationModeInterfaceTypeEntity.ts';

interface DpadHooksInterface {
  can(action: string): boolean;
  readonly 'getHint': (() => string | null) | undefined;
  readonly 'getZoomLevel': (() => number | null) | undefined;
  readonly 'getZoomText': (() => string | null) | undefined;
  run(action: string): void | Promise<void>;
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
  readonly #action: string;
  readonly #canRun: () => boolean;
  public readonly label: string;
  public readonly title: string;

  public constructor(action: string, canRun: () => boolean, label: string, title: string) {
    this.#action = action;
    this.#canRun = canRun;
    this.label = label;
    this.title = title;
  }

  public get action(): DpadActionInterfaceTypeEntity.Type {
    const result = DpadActionInterfaceTypeEntity.intake(this.#action);
    return result;
  }

  public get disabled(): boolean {
    const result = !this.#canRun();
    return result;
  }
}

class DpadState {
  public readonly hint: string | null;
  public readonly items: readonly DpadItem[];
  readonly #mode: string;
  public readonly zoomLevel: number | null;
  public readonly zoomText: string | null;

  public constructor(
    hint: string | null,
    items: readonly DpadItem[],
    mode: string,
    zoomLevel: number | null,
    zoomText: string | null
  ) {
    this.hint = hint;
    this.items = items;
    this.#mode = mode;
    this.zoomLevel = zoomLevel;
    this.zoomText = zoomText;
  }

  public get mode(): VisualizationModeInterfaceTypeEntity.Type {
    const result = VisualizationModeInterfaceTypeEntity.intake(this.#mode);
    return result;
  }
}

/**
 * Package-owned D-pad state machine.
 *
 * The machine resolves the active grid at its mode boundary, and owns canonical
 * button ordering, disabled-state evaluation, and zoom HUD state.
 */
export const DpadMachine = class DpadMachine {
  static readonly #inlineGrid: readonly string[] = [
    'zoom-in', 'pan-up', 'zoom-out',
    'pan-left', 'centre', 'pan-right',
    'expand', 'pan-down', 'fit'
  ];

  static readonly #metadataByAction = new Map<string, DpadMetadata>([
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

  static readonly #modalGrid: readonly string[] = [
    'zoom-in', 'pan-up', 'zoom-out',
    'pan-left', 'centre', 'pan-right',
    'close', 'pan-down', 'fit'
  ];

  readonly #hooks: DpadHooksInterface;
  #mode: string;

  public constructor(hooks: DpadHooksInterface, mode = 'inline') {
    this.#hooks = hooks;
    this.#mode = VisualizationModeInterfaceTypeEntity.intake(mode);
  }

  public setMode(mode: string): void {
    this.#mode = VisualizationModeInterfaceTypeEntity.intake(mode);
  }

  public state(): DpadState {
    const actions = this.#mode === 'modal' ? DpadMachine.#modalGrid : DpadMachine.#inlineGrid;
    const items = actions.map((action) => {
      const metadata = DpadMachine.#metadataByAction.get(action);
      if (metadata === undefined) {
        throw new Error(`Unknown D-pad action: ${action}`);
      }
      const canRun = (): boolean => {
        const result = this.#hooks.can(action);
        return result;
      };
      const item = new DpadItem(action, canRun, metadata.label, metadata.title);
      return item;
    });
    const zoomLevel = this.#hooks.getZoomLevel?.() ?? null;
    const zoomText = this.#hooks.getZoomText?.()
      ?? (zoomLevel === null ? null : `${zoomLevel.toFixed(2)}×`);
    const result = new DpadState(
      this.#hooks.getHint?.() ?? 'drag · wheel',
      items,
      this.#mode,
      zoomLevel,
      zoomText
    );
    return result;
  }

  public async press(action: string): Promise<void> {
    const resolvedAction = DpadActionInterfaceTypeEntity.intake(action);
    if (!this.#hooks.can(resolvedAction)) {return;}
    await this.#hooks.run(resolvedAction);
  }
};
