import { ViewerActionIdentifierEntity } from './ViewerActionIdentifierEntity.ts';
import { ViewerActionOverridesEntity } from './ViewerActionOverridesEntity.ts';

class ViewerActionDefinition {
  readonly #overrides: ViewerActionOverridesEntity.Type;
  public readonly label: string;
  public readonly title: string;

  public constructor(
    label: string,
    title: string,
    overrides: ViewerActionOverridesEntity.Type
  ) {
    this.#overrides = overrides;
    this.label = label;
    this.title = title;
  }


  public get ariaLabel(): string | undefined {
    const result = this.#overrides.ariaLabel;
    return result;
  }

  public get shortcut(): string | undefined {
    const result = this.#overrides.shortcut;
    return result;
  }

  public get tone(): ViewerActionOverridesEntity.Type['tone'] {
    const result = this.#overrides.tone;
    return result;
  }
}

class ViewerAction {
  readonly #definition: ViewerActionDefinition;
  readonly #overrides: ViewerActionOverridesEntity.Type;
  readonly #id: string;

  public constructor(
    definition: ViewerActionDefinition,
    id: string,
    overrides: ViewerActionOverridesEntity.Type
  ) {
    this.#definition = definition;
    this.#overrides = overrides;
    this.#id = id;
  }

  public get ariaLabel(): string | undefined {
    const result = this.#overrides.ariaLabel ?? this.#definition.ariaLabel;
    return result;
  }

  public get disabled(): boolean | undefined {
    const result = this.#overrides.disabled;
    return result;
  }

  public get id(): ViewerActionIdentifierEntity.Type {
    const result = ViewerActionIdentifierEntity.intake(this.#id);
    return result;
  }

  public get label(): string {
    const result = this.#overrides.label ?? this.#definition.label;
    return result;
  }

  public get pressed(): boolean | undefined {
    const result = this.#overrides.pressed;
    return result;
  }

  public get shortcut(): string | undefined {
    const result = this.#overrides.shortcut ?? this.#definition.shortcut;
    return result;
  }

  public get title(): string {
    const result = this.#overrides.title ?? this.#definition.title;
    return result;
  }

  public get tone(): ViewerActionOverridesEntity.Type['tone'] {
    const result = this.#overrides.tone ?? this.#definition.tone;
    return result;
  }
}

export const viewerActionsModel = class ViewerActionsModel {
  static readonly #definitions = new Map<string, ViewerActionDefinition>([
    ['centre', new ViewerActionDefinition('⊙', 'Centre view', ViewerActionOverridesEntity.create({}))],
    ['clear', new ViewerActionDefinition('🗑 clear', 'Clear', ViewerActionOverridesEntity.create({ 'tone': 'danger' }))],
    ['close', new ViewerActionDefinition('✕', 'Close', ViewerActionOverridesEntity.create({ 'shortcut': 'Esc' }))],
    ['expand', new ViewerActionDefinition('⤢', 'Expand', ViewerActionOverridesEntity.create({}))],
    ['fit', new ViewerActionDefinition('⤢', 'Fit to view', ViewerActionOverridesEntity.create({}))],
    ['fullscreen', new ViewerActionDefinition('⛶', 'Fullscreen', ViewerActionOverridesEntity.create({}))],
    ['zoom-in', new ViewerActionDefinition('＋', 'Zoom in', ViewerActionOverridesEntity.create({}))],
    ['zoom-out', new ViewerActionDefinition('－', 'Zoom out', ViewerActionOverridesEntity.create({}))]
  ]);

  public static create(
    id: string,
    overrides: ViewerActionOverridesEntity.Type = ViewerActionOverridesEntity.create({})
  ): ViewerAction {
    const resolvedIdentifier = ViewerActionIdentifierEntity.intake(id);
    const definition = viewerActionsModel.#definitions.get(resolvedIdentifier);
    if (definition === undefined) {
      throw new Error(`Unknown viewer action: ${id}`);
    }
    const normalized = ViewerActionOverridesEntity.intake(overrides);
    const result = new ViewerAction(definition, resolvedIdentifier, normalized);
    return result;
  }
};
