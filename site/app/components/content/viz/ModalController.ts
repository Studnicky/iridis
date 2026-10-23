import { ModalCloseReasonEntity } from './ModalCloseReasonEntity.ts';

/** Shared lifecycle controller for visualization modal and expanded shells. */
class ModalLifecycleState {
  readonly #states = new Set<string>();

  public isOpen(): boolean {
    const result = this.#states.has('open');
    return result;
  }

  public open(): boolean {
    if (this.#states.has('open')) {
      return false;
    }
    this.#states.add('open');
    return true;
  }

  public close(): boolean {
    if (!this.#states.has('open')) {
      return false;
    }
    this.#states.delete('open');
    return true;
  }
}

interface ModalControllerHooksInterface {
  readonly 'onClose'?: (reason: string) => void;
  readonly 'onOpen'?: () => void;
  readonly 'onStateChange'?: (state: ModalLifecycleState, reason: string | null) => void;
}

export const ModalController = class ModalController {
  readonly #onClose: ModalControllerHooksInterface['onClose'];
  readonly #onOpen: ModalControllerHooksInterface['onOpen'];
  readonly #onStateChange: ModalControllerHooksInterface['onStateChange'];
  readonly #state: ModalLifecycleState;

  public constructor(hooks: ModalControllerHooksInterface = {}) {
    this.#onClose = hooks.onClose;
    this.#onOpen = hooks.onOpen;
    this.#onStateChange = hooks.onStateChange;
    this.#state = new ModalLifecycleState();
  }

  public isOpen(): boolean {
    const result = this.#state.isOpen();
    return result;
  }

  public open(): boolean {
    const didOpen = this.#state.open();
    if (!didOpen) {
      return false;
    }
    this.#onOpen?.();
    this.#onStateChange?.(this.#state, null);
    return true;
  }

  public close(reason = 'programmatic'): boolean {
    const resolvedReason = ModalCloseReasonEntity.intake(reason);
    const didClose = this.#state.close();
    if (!didClose) {
      return false;
    }
    this.#onClose?.(resolvedReason);
    this.#onStateChange?.(this.#state, resolvedReason);
    return true;
  }

  public toggle(): boolean {
    const result = this.#state.isOpen() ? this.close('programmatic') : this.open();
    return result;
  }

  public onKeyDown(key: string | undefined): boolean {
    if (key !== 'Escape') {
      return false;
    }
    const result = this.close('escape');
    return result;
  }

  public onBackdropPress(): boolean {
    const result = this.close('backdrop');
    return result;
  }
};
