import type { ModeType } from './mode.ts';

/**
 * UI-interaction state for the shared FSM: which mode is active, which carousel
 * card is showing, and whether the carousel is mid-drag.
 */
export type IridisUiStateType =
  | { 'activeIndex': number; 'mode': ModeType; 'variant': 'idle' }
  | { 'activeIndex': number; 'dragPx': number; 'mode': ModeType; 'variant': 'dragging' };
