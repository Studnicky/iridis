import { IridisUiEffectVariant, IridisUiActionType } from '../types/index.ts';
import type { FsmStepType } from '@studnicky/fsm';

import { StateMachine } from '@studnicky/fsm';

import type { IridisUiEffectType, IridisUiEventType, IridisUiStateType } from '../types/index.ts';
import { wrap } from './wrap.ts';

/**
 * Owns the carousel/mode UI state: which mode is active, which card the
 * carousel shows, and whether it is mid-drag. Pure reducer — `reduce()`
 * throws for any (state, event) pair it does not model, which
 * `StateMachine.transition()` reports via `onTransitionRejected` before
 * rethrowing.
 */
export class IridisUiMachine extends StateMachine<IridisUiStateType, IridisUiEventType, IridisUiEffectType> {
  constructor() { super(); }

  getInitialState(): IridisUiStateType {
    return { 'activeIndex': 0, 'mode': 'picker', 'variant': 'idle' };
  }

  reduce(state: IridisUiStateType, event: IridisUiEventType): FsmStepType<IridisUiStateType, IridisUiEffectType> {
    // Palette-param and image-extraction events are effect-only — they never
    // touch activeIndex/mode/dragPx, so they're valid regardless of which
    // carousel sub-state (idle/dragging) is currently active.
    switch (event.type) {
      case IridisUiActionType.SET_FRAMING:
        return { 'effects': [{ 'op': 'framing', 'value': event.framing, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_SCHEMA:
        return { 'effects': [{ 'op': 'schemaName', 'value': event.schemaName, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_CONTRAST_STRICTNESS:
        return { 'effects': [{ 'op': 'strictness', 'value': event.strictness, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_COLOR_SPACE:
        return { 'effects': [{ 'op': 'colorSpace', 'value': event.colorSpace, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_CVD_CORRECT:
        return { 'effects': [{ 'op': 'cvdCorrect', 'value': event.cvdCorrect, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_ALGORITHM:
        return { 'effects': [{ 'op': 'imgAlgorithm', 'value': event.algorithm, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_K:
        return { 'effects': [{ 'op': 'imgK', 'value': event.k, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS:
        return { 'effects': [{ 'op': 'imgHistogramBits', 'value': event.bits, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_DELTA_E_CAP:
        return { 'effects': [{ 'op': 'imgDeltaECap', 'value': event.cap, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_HARMONIZE:
        return { 'effects': [{ 'op': 'imgHarmonize', 'value': event.threshold, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE:
        return { 'effects': [{ 'op': 'imgLightnessRange', 'value': event.range, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_IMAGE_CHROMA_RANGE:
        return { 'effects': [{ 'op': 'imgChromaRange', 'value': event.range, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_DERIVATION_CONFIG:
        return { 'effects': [{ 'op': 'derivation', 'value': event.config, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.SET_ROLE_SORT:
        return { 'effects': [{ 'op': 'roleSort', 'value': event.keys, 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }], 'state': state };
      case IridisUiActionType.PIN_SEED_ROLE:
        return { 'effects': [{ 'index': event.index, 'role': event.role, 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }], 'state': state };
      case IridisUiActionType.EXTRACT_IMAGE:
        return {
          'effects': [event.source === 'file' ? { 'file': event.file, 'source': 'file', 'variant': IridisUiEffectVariant.EXTRACT_IMAGE } : { 'source': 'sample', 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }],
          'state':   state
        };
      case IridisUiActionType.POPULATE_PICKER_FROM_IMAGE:
        return { 'effects': [{ 'hexes': event.hexes, 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }], 'state': state };
      case IridisUiActionType.SELECT_IMAGE_CANDIDATE:
        return { 'effects': [{ 'hexes': event.hexes, 'label': event.label, 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }], 'state': state };
      case IridisUiActionType.DIAGRAM_ZOOM:
        return { 'effects': [{ 'factor': event.factor, 'op': 'zoom', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_PAN:
        return { 'effects': [{ 'dx': event.dx, 'dy': event.dy, 'op': 'pan', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_RESET:
        return { 'effects': [{ 'op': 'reset', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_FIT:
        return { 'effects': [{ 'op': 'fit', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.DIAGRAM_TOGGLE_EXPAND:
        return { 'effects': [{ 'op': 'toggleExpand', 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }], 'state': state };
      case IridisUiActionType.CVD_TOGGLE_PREVIEW:
        return { 'effects': [{ 'cvdType': event.cvdType, 'op': 'toggle', 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }], 'state': state };
      case IridisUiActionType.CVD_CLEAR_PREVIEWS:
        return { 'effects': [{ 'op': 'clear', 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }], 'state': state };
      case IridisUiActionType.NAVIGATE_TO_TARGET:
        return { 'effects': [{ 'targetId': event.targetId, 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }], 'state': state };
      default:
        break;
    }
    if (state.variant === 'idle') {
      switch (event.type) {
        case IridisUiActionType.ADD_SEED:
          return { 'effects': [{ 'hex': event.hex, 'op': 'add', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
        case IridisUiActionType.DRAG_START:
          return { 'effects': [], 'state': { 'activeIndex': state.activeIndex, 'dragPx': 0, 'mode': state.mode, 'variant': 'dragging' } };
        case IridisUiActionType.NAVIGATE:
          return { 'effects': [], 'state': { ...state, 'activeIndex': wrap(state.activeIndex + event.delta, event.count) } };
        case IridisUiActionType.REMOVE_SEED:
          return { 'effects': [{ 'index': event.index, 'op': 'remove', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
        case IridisUiActionType.SELECT_CARD:
          return { 'effects': [], 'state': { ...state, 'activeIndex': event.index } };
        case IridisUiActionType.SELECT_MODE:
          return { 'effects': [], 'state': { 'activeIndex': event.mode === 'image' ? 0 : 1, 'mode': event.mode, 'variant': 'idle' } };
        case IridisUiActionType.SET_SEED:
          return { 'effects': [{ 'hex': event.hex, 'index': event.index, 'op': 'set', 'variant': IridisUiEffectVariant.MUTATE_SEEDS }], 'state': state };
        default:
          break;
      }
    } else if (state.variant === 'dragging') {
      switch (event.type) {
        case IridisUiActionType.DRAG_END:
          return { 'effects': [], 'state': { 'activeIndex': wrap(state.activeIndex + event.shiftedBy, event.count), 'mode': state.mode, 'variant': 'idle' } };
        case IridisUiActionType.DRAG_MOVE:
          return { 'effects': [], 'state': { ...state, 'dragPx': event.dragPx } };
        default:
          break;
      }
    }
    throw new Error(`Cannot handle event "${event.type}" in state "${state.variant}"`);
  }
}
