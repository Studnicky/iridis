import type { FsmStepType } from '@studnicky/fsm';

import { StateMachine } from '@studnicky/fsm';

import type { IridisUiEffectType, IridisUiEventType, IridisUiStateType } from '../types/index.ts';

import { IridisUiActionType, IridisUiEffectVariant } from '../types/index.ts';
import { wrap } from './wrap.ts';

/**
 * Owns the carousel/mode UI state: which mode is active, which card the
 * carousel shows, and whether it is mid-drag. Pure reducer — `reduce()` is
 * total for every (state, event) pair reachable through the site's UI: the
 * 'dragging' variant accepts every event the 'idle' variant does (a
 * redundant DRAG_START is idempotent, SELECT_MODE settles the drag before
 * applying the mode, anything else is a safe no-op that defers to the
 * in-flight drag). `reduce()` still throws for the small set of pairs no UI
 * path can ever send (DRAG_MOVE/DRAG_END while 'idle' — CylinderCarousel
 * guards both), which `StateMachine.transition()` reports via
 * `onTransitionRejected` before rethrowing.
 */
export class IridisUiMachine extends StateMachine<IridisUiStateType, IridisUiEventType, IridisUiEffectType> {
  constructor() { super(); }

  getInitialState(): IridisUiStateType {
    return { 'activeIndex': 0, 'mode': 'picker', 'variant': 'idle' };
  }

  reduce(state: IridisUiStateType, event: IridisUiEventType): FsmStepType<IridisUiStateType, IridisUiEffectType> {
    // Palette-param, seed-mutation, and image-extraction events are
    // effect-only — they never touch activeIndex/mode/dragPx, so they're
    // valid regardless of which carousel sub-state (idle/dragging) is
    // currently active.
    switch (event.type) {
      case IridisUiActionType.ADD_SEED:
        return { 'effects': [{ 'hex': event.hex, 'op': 'add', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
      case IridisUiActionType.CVD_CLEAR_PREVIEWS:
        return { 'effects': [{ 'op': 'clear', 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }], 'state': state };
      case IridisUiActionType.CVD_TOGGLE_PREVIEW:
        return { 'effects': [{ 'cvdType': event.cvdType, 'op': 'toggle', 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_FIT:
        return { 'effects': [{ 'op': 'fit', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_PAN:
        return { 'effects': [{ 'dx': event.dx, 'dy': event.dy, 'op': 'pan', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_RESET:
        return { 'effects': [{ 'op': 'reset', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_TOGGLE_EXPAND:
        return { 'effects': [{ 'op': 'toggleExpand', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_ZOOM:
        return { 'effects': [{ 'factor': event.factor, 'op': 'zoom', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.EXTRACT_IMAGE:
        return {
          'effects': [event.source === 'file' ? { 'file': event.file, 'source': 'file', 'variant': IridisUiEffectVariant.EXTRACT_IMAGE } : { 'source': 'sample', 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }],
          'state':   state
        };
      case IridisUiActionType.NAVIGATE_TO_TARGET:
        return { 'effects': [{ 'targetId': event.targetId, 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }], 'state': state };
      case IridisUiActionType.PIN_SEED_ROLE:
        return { 'effects': [{ 'index': event.index, 'role': event.role, 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }], 'state': state };
      case IridisUiActionType.POPULATE_PICKER_FROM_IMAGE:
        return { 'effects': [{ 'hexes': event.hexes, 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }], 'state': state };
      case IridisUiActionType.REMOVE_SEED:
        return { 'effects': [{ 'index': event.index, 'op': 'remove', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
      case IridisUiActionType.SELECT_IMAGE_CANDIDATE:
        return { 'effects': [{ 'hexes': event.hexes, 'label': event.label, 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }], 'state': state };
      case IridisUiActionType.SET_COLOR_SPACE:
        return { 'effects': [{ 'op': 'colorSpace', 'value': event.colorSpace, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_CONTRAST_STRICTNESS:
        return { 'effects': [{ 'op': 'strictness', 'value': event.strictness, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_CVD_CORRECT:
        return { 'effects': [{ 'op': 'cvdCorrect', 'value': event.cvdCorrect, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_DERIVATION_CONFIG:
        return { 'effects': [{ 'op': 'derivation', 'value': event.config, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_FRAMING:
        return { 'effects': [{ 'op': 'framing', 'value': event.framing, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_ALGORITHM:
        return { 'effects': [{ 'op': 'imgAlgorithm', 'value': event.algorithm, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_CHROMA_RANGE:
        return { 'effects': [{ 'op': 'imgChromaRange', 'value': event.range, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_DELTA_E_CAP:
        return { 'effects': [{ 'op': 'imgDeltaECap', 'value': event.cap, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_HARMONIZE:
        return { 'effects': [{ 'op': 'imgHarmonize', 'value': event.threshold, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS:
        return { 'effects': [{ 'op': 'imgHistogramBits', 'value': event.bits, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_K:
        return { 'effects': [{ 'op': 'imgK', 'value': event.k, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE:
        return { 'effects': [{ 'op': 'imgLightnessRange', 'value': event.range, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_ROLE_SORT:
        return { 'effects': [{ 'op': 'roleSort', 'value': event.keys, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_SCHEMA:
        return { 'effects': [{ 'op': 'schemaName', 'value': event.schemaName, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_SEED:
        return { 'effects': [{ 'hex': event.hex, 'index': event.index, 'op': 'set', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
      case IridisUiActionType.SET_SEMANTIC_HUES_ENABLED:
        return { 'effects': [{ 'op': 'semanticHuesEnabled', 'value': event.enabled, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      default:
        break;
    }
    if (state.variant === 'idle') {
      switch (event.type) {
        case IridisUiActionType.DRAG_START:
          return { 'effects': [], 'state': { 'activeIndex': state.activeIndex, 'dragPx': 0, 'mode': state.mode, 'variant': 'dragging' } };
        case IridisUiActionType.NAVIGATE:
          return { 'effects': [], 'state': { ...state, 'activeIndex': wrap(state.activeIndex + event.delta, event.count) } };
        case IridisUiActionType.SELECT_CARD:
          return { 'effects': [], 'state': { ...state, 'activeIndex': event.index } };
        case IridisUiActionType.SELECT_MODE:
          return { 'effects': [], 'state': { 'activeIndex': event.mode === 'image' ? 0 : 1, 'mode': event.mode, 'variant': 'idle' } };
        default:
          break;
      }
    } else {
      switch (event.type) {
        case IridisUiActionType.DRAG_END:
          return { 'effects': [], 'state': { 'activeIndex': wrap(state.activeIndex + event.shiftedBy, event.count), 'mode': state.mode, 'variant': 'idle' } };
        case IridisUiActionType.DRAG_MOVE:
          return { 'effects': [], 'state': { ...state, 'dragPx': event.dragPx } };
        case IridisUiActionType.DRAG_START:
          // A second DRAG_START while already dragging (e.g. a second finger's
          // pointerdown racing the first, or any other double-fire) is
          // idempotent — the gesture already in flight continues unchanged
          // rather than restarting it or rejecting the event.
          return { 'effects': [], 'state': state };
        case IridisUiActionType.SELECT_MODE:
          // A mode switch mid-drag settles the drag (no shift is applied —
          // there's no DRAG_END shiftedBy/count to compute one from) and lands
          // in the target mode's default idle state, same activeIndex reset
          // SELECT_MODE uses from 'idle'.
          return { 'effects': [], 'state': { 'activeIndex': event.mode === 'image' ? 0 : 1, 'mode': event.mode, 'variant': 'idle' } };
        default:
          // Any other event racing an in-flight drag (e.g. a keyboard NAVIGATE
          // or a SELECT_CARD click) is a safe no-op — the drag gesture takes
          // precedence and the event is dropped rather than mutating
          // activeIndex out from under it.
          return { 'effects': [], 'state': state };
      }
    }
    throw new Error(`Cannot handle event "${event.type}" in state "${state.variant}"`);
  }
}
