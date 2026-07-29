/** Shared lifecycle controller for visualization modal and expanded shells. */
interface ModalControllerHooksInterface {
  readonly 'onClose'?: (reason: 'programmatic' | 'escape' | 'backdrop') => void;
  readonly 'onOpen'?: () => void;
  readonly 'onStateChange'?: (
    open: boolean,
    reason: 'programmatic' | 'escape' | 'backdrop' | null
  ) => void;
}

export const ModalController = class ModalController {
  readonly #onClose: ModalControllerHooksInterface['onClose'];
  readonly #onOpen: ModalControllerHooksInterface['onOpen'];
  readonly #onStateChange: ModalControllerHooksInterface['onStateChange'];
  #open: boolean;

  public constructor(hooks: ModalControllerHooksInterface = {}) {
    this.#onClose = hooks.onClose;
    this.#onOpen = hooks.onOpen;
    this.#onStateChange = hooks.onStateChange;
    this.#open = false;
  }

  public isOpen(): boolean {
    return this.#open;
  }

  public open(): boolean {
    if (this.#open) {return false;}
    this.#open = true;
    this.#onOpen?.();
    this.#onStateChange?.(true, null);
    return true;
  }

  public close(reason: 'programmatic' | 'escape' | 'backdrop' = 'programmatic'): boolean {
    if (!this.#open) {return false;}
    this.#open = false;
    this.#onClose?.(reason);
    this.#onStateChange?.(false, reason);
    return true;
  }

  public toggle(): boolean {
    return this.#open ? this.close('programmatic') : this.open();
  }

  public onKeyDown(key: string | undefined): boolean {
    if (key !== 'Escape') {return false;}
    return this.close('escape');
  }

  public onBackdropPress(isBackdropTarget: boolean): boolean {
    if (!isBackdropTarget) {return false;}
    return this.close('backdrop');
  }
};
