import type { FsmStepType } from '@studnicky/fsm';

import { StateMachine } from '@studnicky/fsm';

import type { IridisUiEffectType, IridisUiEventType, IridisUiStateType } from '../types/index.ts';

/** Wraps a wrap-around index into `[0, count)`. */
function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * Owns the carousel/mode UI state: which mode is active, which card the
 * carousel shows, and whether it is mid-drag or a popover is open. Pure
 * reducer — `reduce()` throws for any (state, event) pair it does not model,
 * which `StateMachine.transition()` reports via `onTransitionRejected` before
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
    // carousel sub-state (idle/dragging/popoverOpen) is currently active.
    switch (event.type) {
      case 'SET_FRAMING':
        return { 'effects': [{ 'op': 'framing', 'value': event.framing, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_SCHEMA':
        return { 'effects': [{ 'op': 'schemaName', 'value': event.schemaName, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_CONTRAST_STRICTNESS':
        return { 'effects': [{ 'op': 'strictness', 'value': event.strictness, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_COLOR_SPACE':
        return { 'effects': [{ 'op': 'colorSpace', 'value': event.colorSpace, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_CVD_CORRECT':
        return { 'effects': [{ 'op': 'cvdCorrect', 'value': event.cvdCorrect, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_ALGORITHM':
        return { 'effects': [{ 'op': 'imgAlgorithm', 'value': event.algorithm, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_K':
        return { 'effects': [{ 'op': 'imgK', 'value': event.k, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_HISTOGRAM_BITS':
        return { 'effects': [{ 'op': 'imgHistogramBits', 'value': event.bits, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_DELTA_E_CAP':
        return { 'effects': [{ 'op': 'imgDeltaECap', 'value': event.cap, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_HARMONIZE':
        return { 'effects': [{ 'op': 'imgHarmonize', 'value': event.threshold, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_LIGHTNESS_RANGE':
        return { 'effects': [{ 'op': 'imgLightnessRange', 'value': event.range, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'SET_IMAGE_CHROMA_RANGE':
        return { 'effects': [{ 'op': 'imgChromaRange', 'value': event.range, 'variant': 'SET_PALETTE_PARAM' }], 'state': state };
      case 'PIN_SEED_ROLE':
        return { 'effects': [{ 'index': event.index, 'role': event.role, 'variant': 'PIN_SEED_ROLE' }], 'state': state };
      case 'EXTRACT_IMAGE':
        return {
          'effects': [event.source === 'file' ? { 'file': event.file, 'source': 'file', 'variant': 'EXTRACT_IMAGE' } : { 'source': 'sample', 'variant': 'EXTRACT_IMAGE' }],
          'state':   state
        };
      default:
        break;
    }
    if (state.variant === 'idle') {
      switch (event.type) {
        case 'ADD_SEED':
          return { 'effects': [{ 'hex': event.hex, 'op': 'add', 'variant': 'MUTATE_SEEDS' }], 'state': state };
        case 'DRAG_START':
          return { 'effects': [], 'state': { 'activeIndex': state.activeIndex, 'dragPx': 0, 'mode': state.mode, 'variant': 'dragging' } };
        case 'NAVIGATE':
          return { 'effects': [], 'state': { ...state, 'activeIndex': wrap(state.activeIndex + event.delta, event.count) } };
        case 'POPOVER_OPEN':
          return { 'effects': [], 'state': { 'activeIndex': state.activeIndex, 'mode': state.mode, 'variant': 'popoverOpen' } };
        case 'REMOVE_SEED':
          return { 'effects': [{ 'index': event.index, 'op': 'remove', 'variant': 'MUTATE_SEEDS' }], 'state': state };
        case 'SELECT_CARD':
          return { 'effects': [], 'state': { ...state, 'activeIndex': event.index } };
        case 'SELECT_MODE':
          return { 'effects': [], 'state': { 'activeIndex': event.mode === 'image' ? 0 : 1, 'mode': event.mode, 'variant': 'idle' } };
        case 'SET_SEED':
          return { 'effects': [{ 'hex': event.hex, 'index': event.index, 'op': 'set', 'variant': 'MUTATE_SEEDS' }], 'state': state };
        default:
          break;
      }
    } else if (state.variant === 'dragging') {
      switch (event.type) {
        case 'DRAG_END':
          return { 'effects': [], 'state': { 'activeIndex': wrap(state.activeIndex + event.shiftedBy, event.count), 'mode': state.mode, 'variant': 'idle' } };
        case 'DRAG_MOVE':
          return { 'effects': [], 'state': { ...state, 'dragPx': event.dragPx } };
        default:
          break;
      }
    } else if (state.variant === 'popoverOpen') {
      switch (event.type) {
        case 'POPOVER_CLOSE':
          return { 'effects': [], 'state': { 'activeIndex': state.activeIndex, 'mode': state.mode, 'variant': 'idle' } };
        default:
          break;
      }
    }
    throw new Error(`Cannot handle event "${event.type}" in state "${state.variant}"`);
  }
}
