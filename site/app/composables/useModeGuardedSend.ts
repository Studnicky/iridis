import { IridisUiEvent } from './types/iridisUiEvent.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';

/** Sends an effect event only after its concrete picker or image interaction context is active. */
export class UseModeGuardedSend {
  static image(send: (event: IridisUiEvent) => void): (event: IridisUiEvent) => void {
    const result = UseModeGuardedSend.create(send, IridisUiEvent.selectImageMode, (event) => {
      const active = event.selectsImageMode();
      return active;
    });
    return result;
  }

  static picker(send: (event: IridisUiEvent) => void): (event: IridisUiEvent) => void {
    const result = UseModeGuardedSend.create(send, IridisUiEvent.selectPickerMode, (event) => {
      const active = !event.selectsImageMode();
      return active;
    });
    return result;
  }

  private static create(
    send: (event: IridisUiEvent) => void,
    selectMode: () => IridisUiEvent,
    isActive: (state: ReturnType<typeof useIridisUiMachine>['state']['value']) => boolean
  ): (event: IridisUiEvent) => void {
    const { state } = useIridisUiMachine();
    const result = (event: IridisUiEvent): void => {
      if (!state.value.isDragging() && !isActive(state.value)) {
        send(selectMode());
      }
      send(event);
    };
    return result;
  }
}
