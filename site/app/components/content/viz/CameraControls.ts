import { DpadMachine } from './DpadMachine.ts';

interface CameraControlSurfaceInterface {
  readonly 'can'?: (action: Parameters<InstanceType<typeof DpadMachine>['press']>[0]) => boolean;
  readonly 'centre': () => void | Promise<void>;
  readonly 'close'?: () => void | Promise<void>;
  readonly 'expand'?: () => void | Promise<void>;
  readonly 'fit': () => void | Promise<void>;
  readonly 'getHint'?: () => string | null;
  readonly 'getZoomLevel'?: () => number | null;
  readonly 'getZoomText'?: () => string | null;
  readonly 'pan': (direction: 'up' | 'down' | 'left' | 'right') => void | Promise<void>;
  readonly 'zoomIn': () => void | Promise<void>;
  readonly 'zoomOut': () => void | Promise<void>;
}

class CameraDpadHooks {
  public readonly getHint: (() => string | null) | undefined;
  public readonly getZoomLevel: (() => number | null) | undefined;
  public readonly getZoomText: (() => string | null) | undefined;
  readonly #controls: CameraControlSurfaceInterface;

  public constructor(controls: CameraControlSurfaceInterface) {
    this.#controls = controls;
    this.getHint = controls.getHint;
    this.getZoomLevel = controls.getZoomLevel;
    this.getZoomText = controls.getZoomText;
  }

  public can(action: Parameters<InstanceType<typeof DpadMachine>['press']>[0]): boolean {
    if (this.#controls.can?.(action) === false) {return false;}
    if (action === 'expand' && this.#controls.expand === undefined) {return false;}
    if (action === 'close' && this.#controls.close === undefined) {return false;}
    return true;
  }

  public run(
    action: Parameters<InstanceType<typeof DpadMachine>['press']>[0]
  ): void | Promise<void> {
    switch (action) {
      case 'centre':    return this.#controls.centre();
      case 'close':     return this.#controls.close?.();
      case 'expand':    return this.#controls.expand?.();
      case 'fit':       return this.#controls.fit();
      case 'pan-down':  return this.#controls.pan('down');
      case 'pan-left':  return this.#controls.pan('left');
      case 'pan-right': return this.#controls.pan('right');
      case 'pan-up':    return this.#controls.pan('up');
      case 'zoom-in':   return this.#controls.zoomIn();
      case 'zoom-out':  return this.#controls.zoomOut();
    }
    return undefined;
  }
}

export const CameraControls = class CameraControls {
  public static create(
    controls: CameraControlSurfaceInterface,
    mode: 'inline' | 'modal' = 'inline'
  ): InstanceType<typeof DpadMachine> {
    return new DpadMachine(new CameraDpadHooks(controls), mode);
  }
};
