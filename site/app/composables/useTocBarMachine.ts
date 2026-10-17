/**
 * Vue adapter over the shared TocBarMachine, run through an EffectInterpreter
 * — one module-level singleton, matching useIridisUiMachine.ts's pattern, so
 * TableOfContentsBar.vue's hero-sentinel observer and scroll-intent listener
 * (both module-scoped side effects, not prop-connected) drive the same state.
 * The machine emits no effects, so no effect handler is registered.
 */
import { EffectInterpreter } from '@studnicky/fsm/browser';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import type { TocBarEvent } from './types/tocBarEvent.ts';

import { TocBarMachine } from './fsm/TocBarMachine.ts';
import { logger } from './logger.ts';

const interpreter = EffectInterpreter.create(TocBarMachine.create());
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
  static run(event: TocBarEvent): void {
    interpreter.send(event).catch(() => {
      logger.error(
        LogBody.create({
          'component': 'useTocBarMachine',
          'context': {},
          'message': 'Table-of-contents FSM rejected an event',
          'operation': 'send',
          'status': LOG_STATUS.FAILED
        })
      );
    });
  }
}

const send = SendOperation.run;

class UseTocBarMachineOperation {
  static run() {
    const result = { 'send': send, 'state': state };
    return result;
  }
}

export const useTocBarMachine = UseTocBarMachineOperation.run;
