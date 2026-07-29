import type { ModeType } from './mode.ts';

/**
 * UI-interaction state for the shared FSM: which mode is active, which carousel
 * card is showing, and whether the carousel is mid-drag.
 */
export declare namespace IridisUiStateType {
  type Type =
    | { 'activeIndex': number; 'mode': ModeType.Type; 'variant': 'idle' }
    | { 'activeIndex': number; 'dragPx': number; 'mode': ModeType.Type; 'variant': 'dragging' };
}
