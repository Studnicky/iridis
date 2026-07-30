class ViewerActionDefinition {
  public readonly ariaLabel: string | undefined;
  public readonly label: string;
  public readonly shortcut: string | undefined;
  public readonly title: string;
  public readonly tone: 'default' | 'danger' | undefined;

  public constructor(
    label: string,
    title: string,
    ariaLabel: string | undefined,
    shortcut: string | undefined,
    tone: 'default' | 'danger' | undefined
  ) {
    this.ariaLabel = ariaLabel;
    this.label = label;
    this.shortcut = shortcut;
    this.title = title;
    this.tone = tone;
  }
}

class ViewerAction {
  public readonly ariaLabel: string | undefined;
  public readonly disabled: boolean | undefined;
  public readonly id:
    | 'zoom-in'
    | 'zoom-out'
    | 'centre'
    | 'fit'
    | 'close'
    | 'expand'
    | 'fullscreen'
    | 'clear';
  public readonly label: string;
  public readonly pressed: boolean | undefined;
  public readonly shortcut: string | undefined;
  public readonly title: string;
  public readonly tone: 'default' | 'danger' | undefined;

  public constructor(
    id: ViewerAction['id'],
    label: string,
    title: string,
    ariaLabel: string | undefined,
    disabled: boolean | undefined,
    pressed: boolean | undefined,
    shortcut: string | undefined,
    tone: 'default' | 'danger' | undefined
  ) {
    this.ariaLabel = ariaLabel;
    this.disabled = disabled;
    this.id = id;
    this.label = label;
    this.pressed = pressed;
    this.shortcut = shortcut;
    this.title = title;
    this.tone = tone;
  }
}

export const viewerActionsModel = class ViewerActionsModel {
  static readonly #definitions = new Map<ViewerAction['id'], ViewerActionDefinition>([
    ['centre', new ViewerActionDefinition('⊙', 'Centre view', undefined, undefined, undefined)],
    ['clear', new ViewerActionDefinition('🗑 clear', 'Clear', undefined, undefined, 'danger')],
    ['close', new ViewerActionDefinition('✕', 'Close', undefined, 'Esc', undefined)],
    ['expand', new ViewerActionDefinition('⤢', 'Expand', undefined, undefined, undefined)],
    ['fit', new ViewerActionDefinition('⤢', 'Fit to view', undefined, undefined, undefined)],
    ['fullscreen', new ViewerActionDefinition('⛶', 'Fullscreen', undefined, undefined, undefined)],
    ['zoom-in', new ViewerActionDefinition('＋', 'Zoom in', undefined, undefined, undefined)],
    ['zoom-out', new ViewerActionDefinition('－', 'Zoom out', undefined, undefined, undefined)]
  ]);

  public static create(
    id: ViewerAction['id'],
    overrides: {
      readonly 'ariaLabel'?: string;
      readonly 'disabled'?: boolean;
      readonly 'label'?: string;
      readonly 'pressed'?: boolean;
      readonly 'shortcut'?: string;
      readonly 'title'?: string;
      readonly 'tone'?: 'default' | 'danger';
    } = {}
  ): ViewerAction {
    const definition = viewerActionsModel.#definitions.get(id);
    if (definition === undefined) {
      throw new Error(`Unknown viewer action: ${id}`);
    }
    return new ViewerAction(
      id,
      overrides.label ?? definition.label,
      overrides.title ?? definition.title,
      overrides.ariaLabel ?? definition.ariaLabel,
      overrides.disabled,
      overrides.pressed,
      overrides.shortcut ?? definition.shortcut,
      overrides.tone ?? definition.tone
    );
  }
};
