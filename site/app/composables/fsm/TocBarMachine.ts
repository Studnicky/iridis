import type { FsmStepType } from '@studnicky/fsm';

import { StateMachine } from '@studnicky/fsm';

import type { TocBarEventType, TocBarStateType } from '../types/index.ts';

/**
 * Owns TableOfContentsBar's display state — 'top' (non-sticky, before the
 * hero sentinel scrolls out of view), 'expanded' (sticky, full two-row
 * layout), and 'compact' (sticky, collapsed to a single row while the user
 * scrolls down to read). Pure reducer, no effects — TableOfContentsBar.vue
 * reads `state.variant` directly; there's nothing outside this state for an
 * effect handler to perform.
 *
 * `reduce()` is total for every (state, event) pair: PAST_HERO/RETURN_TOP
 * are valid from any state (hero visibility can flip regardless of scroll
 * direction), and SCROLL_DOWN/SCROLL_UP from a state that isn't their
 * trigger state (e.g. SCROLL_DOWN while already 'compact', or while still
 * 'top') is a safe no-op that returns the state unchanged — there is no
 * (state, event) pair this reducer rejects, so the machine can never wedge.
 */
export class TocBarMachine extends StateMachine<TocBarStateType, TocBarEventType, never> {
  constructor() { super(); }

  getInitialState(): TocBarStateType {
    return { 'variant': 'top' };
  }

  reduce(state: TocBarStateType, event: TocBarEventType): FsmStepType<TocBarStateType, never> {
    switch (event.type) {
      case 'PAST_HERO':
        return { 'effects': [], 'state': state.variant === 'top' ? { 'variant': 'expanded' } : state };
      case 'RETURN_TOP':
        return { 'effects': [], 'state': state.variant === 'top' ? state : { 'variant': 'top' } };
      case 'SCROLL_DOWN':
        return { 'effects': [], 'state': state.variant === 'expanded' ? { 'variant': 'compact' } : state };
      case 'SCROLL_UP':
        return { 'effects': [], 'state': state.variant === 'compact' ? { 'variant': 'expanded' } : state };
      default:
        // Defensive — TocBarEventType's 4 members are exhaustively handled
        // above; this keeps reduce() total even if the union widens later.
        return { 'effects': [], 'state': state };
    }
  }
}
