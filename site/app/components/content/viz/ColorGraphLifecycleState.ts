/** Resolved lifecycle state of the color graph runtime. */
export abstract class ColorGraphLifecycleState {
  abstract readonly variant: string;

  static constructing(): ColorGraphLifecycleState {
    const result = new ConstructingColorGraphLifecycleState();

    return result;
  }

  static fitting(): ColorGraphLifecycleState {
    const result = new FittingColorGraphLifecycleState();

    return result;
  }

  static idle(): ColorGraphLifecycleState {
    const result = new IdleColorGraphLifecycleState();

    return result;
  }

  static ready(): ColorGraphLifecycleState {
    const result = new ReadyColorGraphLifecycleState();

    return result;
  }

  static settled(): ColorGraphLifecycleState {
    const result = new SettledColorGraphLifecycleState();

    return result;
  }

  static suspended(): ColorGraphLifecycleState {
    const result = new SuspendedColorGraphLifecycleState();

    return result;
  }

  static zooming(): ColorGraphLifecycleState {
    const result = new ZoomingColorGraphLifecycleState();

    return result;
  }

  abstract isConstructing(): boolean;
  abstract isDeviceReady(): boolean;
  abstract isFitting(): boolean;
  abstract isIdle(): boolean;
  abstract isSettled(): boolean;
  abstract isSuspended(): boolean;
  abstract isZooming(): boolean;
}

abstract class BaseColorGraphLifecycleState extends ColorGraphLifecycleState {
  isConstructing(): boolean {
    return false;
  }

  isDeviceReady(): boolean {
    return true;
  }

  isFitting(): boolean {
    return false;
  }

  isIdle(): boolean {
    return false;
  }

  isSettled(): boolean {
    return false;
  }

  isSuspended(): boolean {
    return false;
  }

  isZooming(): boolean {
    return false;
  }
}

class ConstructingColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'constructing';

  override isConstructing(): boolean {
    return true;
  }

  override isDeviceReady(): boolean {
    return false;
  }
}

class FittingColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'fitting';

  override isFitting(): boolean {
    return true;
  }
}

class IdleColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'idle';

  override isDeviceReady(): boolean {
    return false;
  }

  override isIdle(): boolean {
    return true;
  }
}

class ReadyColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'ready';
}

class SettledColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'settled';

  override isSettled(): boolean {
    return true;
  }
}

class SuspendedColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'suspended';

  override isDeviceReady(): boolean {
    return false;
  }

  override isSuspended(): boolean {
    return true;
  }
}

class ZoomingColorGraphLifecycleState extends BaseColorGraphLifecycleState {
  readonly variant: string = 'zooming';

  override isZooming(): boolean {
    return true;
  }
}
