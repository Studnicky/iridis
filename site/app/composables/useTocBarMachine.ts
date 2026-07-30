/**
 * Vue adapter over the shared TocBarMachine, run through an EffectInterpreter
 * — one module-level singleton, matching useIridisUiMachine.ts's pattern, so
 * TableOfContentsBar.vue's hero-sentinel observer and scroll-intent listener
 * (both module-scoped side effects, not prop-connected) drive the same
 * state. The machine emits no effects (TEffect = never), so `handlers` stays
 * an empty object — every event here is a pure state transition, nothing for
 * an interpreter handler to perform.
 */
import { EffectInterpreter } from '@studnicky/fsm';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import * as VueModule from 'vue';

import type { TocBarEventType } from './types/index.ts';

import { TocBarMachine } from './fsm/TocBarMachine.ts';
import { logger } from './logger.ts';

const interpreter = EffectInterpreter.create({ 'handlers': {}, 'machine': new TocBarMachine() });
interpreter.start();

const state = VueModule.shallowRef(interpreter.getState());
interpreter.subscribe((next) => { state.value = next; });

/**
 * `interpreter.send()` is async (it awaits any emitted effect handlers), but
 * the state transition itself — and the synchronous `notifyObservers()` call
 * that pushes into `state` — happens before the first `await` inside the
 * interpreter's drain loop. So fire-and-forget here still updates `state`
 * synchronously for callers (the hero observer, the scroll listener);
 * nothing here needs to await completion.
 *
 * The returned promise is still observed, not discarded, as defense-in-depth
 * — `reduce()` above is total (see its doc comment), so this `.catch` should
 * never fire in practice, but if that invariant is ever broken it logs
 * through the app logger instead of surfacing only as an unhandled rejection.
 */
class SendOperation {
  static run(event: TocBarEventType.Type): void {
    interpreter.send(event).catch((error: unknown) => {
      logger.error(
        LogBody.create()
          .component('useTocBarMachine')
          .operation('send')
          .status(LOG_STATUS.FAILED)
          .message(`FSM rejected event "${event.type}"`)
          .context({ 'error': error instanceof Error ? error.message : String(error) })
          .build()
      );
    });
  }
}

const send = SendOperation.run;

class UseTocBarMachineOperation {
  static run() {
    return { 'send': send, 'state': state };
  }
}

export const useTocBarMachine = UseTocBarMachineOperation.run;
