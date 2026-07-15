import type { WritableComputedRef } from 'vue';

import type { IridisUiEventType } from './types/iridisUiEvent.ts';
import type { ModeType } from './types/mode.ts';

import { useIridisUiMachine } from './useIridisUiMachine.ts';

/**
 * Forces `mode` to `targetMode` (if it differs) before forwarding the event
 * to `send`, so the mode switch lands before the FSM observes the event that
 * implies it — but only while the carousel is 'idle'. Forcing the switch
 * mid-drag would settle (cancel) an in-flight drag as a side effect of an
 * unrelated form action (e.g. dragging a Combine slider), so the switch is
 * skipped for this call; the guarded event is still forwarded regardless,
 * since every mode-guarded event is effect-only and doesn't read `mode` at
 * reduce time. The next mode-guarded action fired once the drag settles
 * (DRAG_END) picks up the deferred switch. A direct `mode.value` assignment
 * elsewhere (e.g. ModeSwitch, image-drop) still goes through unconditionally
 * — the reducer itself accepts SELECT_MODE in every variant, settling any
 * in-flight drag when the user explicitly switches modes.
 */
export function useModeGuardedSend(
  mode: WritableComputedRef<ModeType>,
  send: (event: IridisUiEventType) => void,
  targetMode: ModeType
): (event: IridisUiEventType) => void {
  const { state } = useIridisUiMachine();
  return (event) => {
    if (mode.value !== targetMode && state.value.variant === 'idle') { mode.value = targetMode; }
    send(event);
  };
}
