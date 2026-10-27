import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine } from '@studnicky/fsm/browser';

import type { PresentationControlCommandEntity } from './entities/PresentationControlCommandEntity.ts';
import type { PresentationControlIntentEntity } from './entities/PresentationControlIntentEntity.ts';

import { THEME_PRESET_CONSTANTS } from '../constants/ThemePresetConstants.ts';
import { PresentationControlsEffectEntity } from './entities/PresentationControlsEffectEntity.ts';
import { PresentationControlsEventEntity } from './entities/PresentationControlsEventEntity.ts';
import { PresentationControlsReadModelEntity } from './entities/PresentationControlsReadModelEntity.ts';

/** Reduces admitted display commands into the presentation read model; it never reads palette state. */
export class PresentationControlsMachine extends StateMachine<
  PresentationControlsReadModelEntity.Type,
  PresentationControlsEventEntity.Type,
  PresentationControlsEffectEntity.Type
> {
  static readonly #reducers = new Map<
    PresentationControlCommandEntity.Type['interaction'],
    (
      state: PresentationControlsReadModelEntity.Type,
      command: PresentationControlCommandEntity.Type
    ) => FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type>
  >([
    ['cvd-preview.clear', PresentationControlsMachine.#cvdClear],
    ['cvd-preview.toggle', PresentationControlsMachine.#cvdToggle],
    ['diagram-view.set', PresentationControlsMachine.#diagramViewSet],
    ['navigation-target.set', PresentationControlsMachine.#navigationTargetSet],
    ['role-sort.replace', PresentationControlsMachine.#roleSortReplace],
    ['theme.select', PresentationControlsMachine.#themeSelect]
  ]);

  public static create(): PresentationControlsMachine {
    const result = new PresentationControlsMachine();
    return result;
  }

  public static eventFor(intent: PresentationControlIntentEntity.Type): PresentationControlsEventEntity.Type {
    const result = PresentationControlsEventEntity.create({ 'intent': intent, 'type': 'PRESENTATION_CONTROL_INTENT' });
    return result;
  }

  static #advance(state: PresentationControlsReadModelEntity.Type, change: object): PresentationControlsReadModelEntity.Type {
    const result = PresentationControlsReadModelEntity.intake({ ...state, ...change, 'revision': state.revision + 1 });
    return result;
  }

  static #cvdClear(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'cvd-preview.clear') {
      const empty = state.cvdPreviewTypes.length === 0;
      const result = { 'effects': [], 'state': empty ? state : PresentationControlsMachine.#advance(state, { 'cvdPreviewTypes': [] }) };
      return result;
    }
    throw new RangeError('cvd-preview.clear reducer received a different interaction');
  }

  static #cvdToggle(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'cvd-preview.toggle') {
      const type = command.cvdPreviewType;
      const remaining = state.cvdPreviewTypes.filter((entry) => {
        const retained = entry !== type;
        return retained;
      });
      const cvdPreviewTypes = state.cvdPreviewTypes.includes(type) ? remaining : [...state.cvdPreviewTypes, type];
      const result = { 'effects': [], 'state': PresentationControlsMachine.#advance(state, { 'cvdPreviewTypes': cvdPreviewTypes }) };
      return result;
    }
    throw new RangeError('cvd-preview.toggle reducer received a different interaction');
  }

  static #diagramViewSet(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'diagram-view.set') {
      const unchanged = state.diagramExpanded === command.diagramExpanded;
      const next = unchanged ? state : PresentationControlsMachine.#advance(state, { 'diagramExpanded': command.diagramExpanded });
      const result = { 'effects': [], 'state': next };
      return result;
    }
    throw new RangeError('diagram-view.set reducer received a different interaction');
  }

  static #navigationTargetSet(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'navigation-target.set') {
      const target = command.navigationTarget;
      const effect = PresentationControlsEffectEntity.create({ 'navigationTarget': target, 'variant': 'navigation-target-selected' });
      const result = { 'effects': [effect], 'state': PresentationControlsMachine.#advance(state, { 'navigationTarget': target }) };
      return result;
    }
    throw new RangeError('navigation-target.set reducer received a different interaction');
  }

  static #roleSortReplace(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'role-sort.replace') {
      const result = { 'effects': [], 'state': PresentationControlsMachine.#advance(state, { 'roleSortKeys': command.roleSortKeys }) };
      return result;
    }
    throw new RangeError('role-sort.replace reducer received a different interaction');
  }

  static #themeSelect(
    state: PresentationControlsReadModelEntity.Type,
    command: PresentationControlCommandEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    if (command.interaction === 'theme.select') {
      const unchanged = state.themeKey === command.themeKey;
      const next = unchanged ? state : PresentationControlsMachine.#advance(state, { 'themeKey': command.themeKey });
      const result = { 'effects': [], 'state': next };
      return result;
    }
    throw new RangeError('theme.select reducer received a different interaction');
  }

  public getInitialState(): PresentationControlsReadModelEntity.Type {
    const result = PresentationControlsReadModelEntity.intake({
      'cvdPreviewTypes': [],
      'diagramExpanded': false,
      'revision': 0,
      'roleSortKeys': [
        { 'direction': 'descending', 'field': 'compliance' },
        { 'direction': 'descending', 'field': 'ratio' }
      ],
      'themeKey': THEME_PRESET_CONSTANTS.DEFAULT_THEME_KEY,
      'variant': 'ready'
    });
    return result;
  }

  public reduce(
    state: PresentationControlsReadModelEntity.Type,
    event: PresentationControlsEventEntity.Type
  ): FsmStepInterface<PresentationControlsReadModelEntity.Type, PresentationControlsEffectEntity.Type> {
    const command = event.intent.command;
    const reducer = PresentationControlsMachine.#reducers.get(command.interaction);
    if (reducer === undefined) {
      throw new RangeError(`Unsupported presentation interaction: ${command.interaction}`);
    }
    const result = reducer(state, command);
    return result;
  }
}
