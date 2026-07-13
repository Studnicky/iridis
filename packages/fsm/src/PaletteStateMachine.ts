import { evaluate } from '@studnicky/iridis-anima';
import type { CurveOptionsInterfaceType } from '@studnicky/iridis-anima';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { PaletteStateSchemaType, PaletteTransitionTableType } from './types/index.ts';

const clampUnit = (t: number): number => Math.min(1, Math.max(0, t));

/**
 * Drives a named-state palette machine: each state resolves to a target
 * `Palette`, and transitions between states are stepped through via `tick()`,
 * with every intermediate frame evaluated by iridis-anima's `evaluate()`.
 * Subclasses observe lifecycle events by overriding the protected hooks.
 */
export abstract class PaletteStateMachine {
  #states:      PaletteStateSchemaType;
  #transitions: PaletteTransitionTableType;
  #currentState: string;

  #fromState:  string | undefined;
  #toState:    string | undefined;
  #t = 0;
  #curveOpts:  CurveOptionsInterfaceType | undefined;

  protected constructor(
    states: PaletteStateSchemaType,
    transitions: PaletteTransitionTableType,
    initialState: string
  ) {
    this.#states       = states;
    this.#transitions  = transitions;
    this.#currentState = initialState;
  }

  /** The state the machine currently occupies (or is transitioning away from). */
  get currentState(): string {
    return this.#currentState;
  }

  /** True while a transition is in progress (`tick()` has not yet reached t=1). */
  get isTransitioning(): boolean {
    return this.#toState !== undefined;
  }

  /**
   * Begins a transition to `toState`. Returns `false` (and fires
   * `onTransitionRejected`) if `toState` is not reachable from the current
   * state per the transition table, or if the machine is terminated.
   */
  transition(toState: string, opts?: CurveOptionsInterfaceType): boolean {
    if (this.isTerminated()) {
      this.onTransitionRejected(this.#currentState, toState, 'terminated');
      return false;
    }

    const allowed = this.#transitions[this.#currentState] ?? [];
    if (!allowed.includes(toState) || this.#states[toState] === undefined) {
      this.onTransitionRejected(this.#currentState, toState, 'not-allowed');
      return false;
    }

    this.#fromState = this.#currentState;
    this.#toState   = toState;
    this.#t         = 0;
    this.#curveOpts = opts;
    this.onTransition(this.#fromState, toState);
    return true;
  }

  /**
   * Advances the in-progress transition by `deltaT` (clamped to [0, 1]),
   * evaluating the intermediate palette and firing `onTick`. On reaching
   * t=1, fires `onExitState` then `onEnterState` and settles the machine
   * into `toState`.
   */
  tick(deltaT: number): void {
    if (this.#fromState === undefined || this.#toState === undefined) return;

    this.#t = clampUnit(this.#t + deltaT);

    const fromPalette = this.#states[this.#fromState]!.palette;
    const toPalette    = this.#states[this.#toState]!.palette;
    const palette: PaletteInterfaceType = evaluate(fromPalette, toPalette, this.#t, this.#curveOpts);

    this.onTick(palette, this.#t);

    if (this.#t >= 1) {
      const fromState = this.#fromState;
      const toState   = this.#toState;
      this.#currentState = toState;
      this.#fromState = undefined;
      this.#toState   = undefined;
      this.#t         = 0;
      this.#curveOpts = undefined;

      this.onExitState(fromState);
      this.onEnterState(toState);
    }
  }

  /** True if the current state has no outgoing transitions in the transition table. */
  isTerminated(): boolean {
    const allowed = this.#transitions[this.#currentState];
    return allowed === undefined || allowed.length === 0;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to observe transitions.
  // ---------------------------------------------------------------------------

  /** Fires when a transition begins, before the first `tick()`. */
  protected onTransition(_fromState: string, _toState: string): void {}

  /** Fires with each evaluated intermediate palette while a transition is in progress. */
  protected onTick(_palette: PaletteInterfaceType, _t: number): void {}

  /** Fires when leaving a state, once its outbound transition completes (t=1). */
  protected onExitState(_state: string): void {}

  /** Fires when entering a state, once the inbound transition completes (t=1). */
  protected onEnterState(_state: string): void {}

  /** Fires when `transition()` is rejected: `toState` unreachable, or the machine is terminated. */
  protected onTransitionRejected(_fromState: string, _toState: string, _reason: string): void {}
}
