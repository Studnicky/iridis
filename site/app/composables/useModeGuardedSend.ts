import type { WritableComputedRef } from 'vue';
import type { IridisUiEventType } from './types/iridisUiEvent.ts';
import type { ModeType } from './types/mode.ts';

/** Forces `mode` to `targetMode` (if it differs) before forwarding the event to `send`, so the mode switch always lands before the FSM observes the event that implies it. */
export function useModeGuardedSend(
  mode: WritableComputedRef<ModeType>,
  send: (event: IridisUiEventType) => void,
  targetMode: ModeType
): (event: IridisUiEventType) => void {
  return (event) => {
    if (mode.value !== targetMode) mode.value = targetMode;
    send(event);
  };
}
