import { ColorGraphLifecycleState } from './ColorGraphLifecycleState.ts';

/** A resolved color graph lifecycle transition. */
export abstract class ColorGraphLifecycleEvent {
  abstract readonly type: string;

  static constructed(): ColorGraphLifecycleEvent {
    const result = new ConstructedColorGraphLifecycleEvent();

    return result;
  }

  static destroyed(): ColorGraphLifecycleEvent {
    const result = new DestroyedColorGraphLifecycleEvent();

    return result;
  }

  static deviceReady(): ColorGraphLifecycleEvent {
    const result = new DeviceReadyColorGraphLifecycleEvent();

    return result;
  }

  static fitArmed(): ColorGraphLifecycleEvent {
    const result = new FitArmedColorGraphLifecycleEvent();

    return result;
  }

  static fitSettled(): ColorGraphLifecycleEvent {
    const result = new FitSettledColorGraphLifecycleEvent();

    return result;
  }

  static suspended(): ColorGraphLifecycleEvent {
    const result = new SuspendedColorGraphLifecycleEvent();

    return result;
  }

  static zoomed(): ColorGraphLifecycleEvent {
    const result = new ZoomedColorGraphLifecycleEvent();

    return result;
  }

  static zoomEnded(): ColorGraphLifecycleEvent {
    const result = new ZoomEndedColorGraphLifecycleEvent();

    return result;
  }

  abstract transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState;
}

class ConstructedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'CONSTRUCTED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isIdle() || state.isSuspended() ? ColorGraphLifecycleState.constructing() : state;

    return result;
  }
}

class DestroyedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'DESTROYED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isIdle() ? state : ColorGraphLifecycleState.idle();

    return result;
  }
}

class DeviceReadyColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'DEVICE_READY';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isConstructing() ? ColorGraphLifecycleState.ready() : state;

    return result;
  }
}

class FitArmedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'FIT_ARMED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isDeviceReady() ? ColorGraphLifecycleState.fitting() : state;

    return result;
  }
}

class FitSettledColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'FIT_SETTLED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isFitting() ? ColorGraphLifecycleState.settled() : state;

    return result;
  }
}

class SuspendedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'SUSPENDED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isDeviceReady() ? ColorGraphLifecycleState.suspended() : state;

    return result;
  }
}

class ZoomedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'ZOOMED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isSettled() ? ColorGraphLifecycleState.zooming() : state;

    return result;
  }
}

class ZoomEndedColorGraphLifecycleEvent extends ColorGraphLifecycleEvent {
  readonly type: string = 'ZOOM_ENDED';

  transition(state: ColorGraphLifecycleState): ColorGraphLifecycleState {
    const result = state.isZooming() ? ColorGraphLifecycleState.settled() : state;

    return result;
  }
}
