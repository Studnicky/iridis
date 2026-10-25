import { DpadDirectionEntity } from './DpadDirectionEntity.ts';
import { DpadMachine } from './DpadMachine.ts';
import { VisualizationModeEntity } from './VisualizationModeEntity.ts';

interface CameraControlSurfaceInterface {
  readonly 'can'?: (action: string) => boolean;
  readonly 'centre': () => void | Promise<void>;
  readonly 'close'?: () => void | Promise<void>;
  readonly 'expand'?: () => void | Promise<void>;
  readonly 'fit': () => void | Promise<void>;
  readonly 'getHint'?: () => string | null;
  readonly 'getZoomLevel'?: () => number | null;
  readonly 'getZoomText'?: () => string | null;
  readonly 'pan': (direction: string) => void | Promise<void>;
  readonly 'zoomIn': () => void | Promise<void>;
  readonly 'zoomOut': () => void | Promise<void>;
}

class CameraDpadCommand {
  public readonly id: string;
  readonly #isAvailable: () => boolean;
  readonly #run: (() => void | Promise<void>) | undefined;

  public constructor(id: string, isAvailable: () => boolean, run: (() => void | Promise<void>) | undefined) {
    this.id = id;
    this.#isAvailable = isAvailable;
    this.#run = run;
  }

  public canRun(): boolean {
    const result = this.#isAvailable();
    return result;
  }

  public run(): void | Promise<void> {
    const result = this.#run?.();
    return result;
  }
}

class CameraDpadHooks {
  public readonly getHint: (() => string | null) | undefined;
  public readonly getZoomLevel: (() => number | null) | undefined;
  public readonly getZoomText: (() => string | null) | undefined;
  readonly #commandsById: ReadonlyMap<string, CameraDpadCommand>;

  public constructor(controls: CameraControlSurfaceInterface) {
    const canRun = (id: string, required: (() => void | Promise<void>) | undefined): boolean => {
      const result = controls.can?.(id) !== false && required !== undefined;
      return result;
    };
    const centre = (): void | Promise<void> => {
      const result = controls.centre();
      return result;
    };
    const fit = (): void | Promise<void> => {
      const result = controls.fit();
      return result;
    };
    const panDown = (): void | Promise<void> => {
      const result = controls.pan(DpadDirectionEntity.intake('down'));
      return result;
    };
    const panLeft = (): void | Promise<void> => {
      const result = controls.pan(DpadDirectionEntity.intake('left'));
      return result;
    };
    const panRight = (): void | Promise<void> => {
      const result = controls.pan(DpadDirectionEntity.intake('right'));
      return result;
    };
    const panUp = (): void | Promise<void> => {
      const result = controls.pan(DpadDirectionEntity.intake('up'));
      return result;
    };
    const zoomIn = (): void | Promise<void> => {
      const result = controls.zoomIn();
      return result;
    };
    const zoomOut = (): void | Promise<void> => {
      const result = controls.zoomOut();
      return result;
    };
    const canCentre = (): boolean => {
      const result = canRun('centre', controls.centre);
      return result;
    };
    const canClose = (): boolean => {
      const result = canRun('close', controls.close);
      return result;
    };
    const canExpand = (): boolean => {
      const result = canRun('expand', controls.expand);
      return result;
    };
    const canFit = (): boolean => {
      const result = canRun('fit', controls.fit);
      return result;
    };
    const canPanDown = (): boolean => {
      const result = canRun('pan-down', panDown);
      return result;
    };
    const canPanLeft = (): boolean => {
      const result = canRun('pan-left', panLeft);
      return result;
    };
    const canPanRight = (): boolean => {
      const result = canRun('pan-right', panRight);
      return result;
    };
    const canPanUp = (): boolean => {
      const result = canRun('pan-up', panUp);
      return result;
    };
    const canZoomIn = (): boolean => {
      const result = canRun('zoom-in', controls.zoomIn);
      return result;
    };
    const canZoomOut = (): boolean => {
      const result = canRun('zoom-out', controls.zoomOut);
      return result;
    };
    this.#commandsById = new Map<string, CameraDpadCommand>([
      ['centre', new CameraDpadCommand('centre', canCentre, centre)],
      ['close', new CameraDpadCommand('close', canClose, controls.close)],
      ['expand', new CameraDpadCommand('expand', canExpand, controls.expand)],
      ['fit', new CameraDpadCommand('fit', canFit, fit)],
      ['pan-down', new CameraDpadCommand('pan-down', canPanDown, panDown)],
      ['pan-left', new CameraDpadCommand('pan-left', canPanLeft, panLeft)],
      ['pan-right', new CameraDpadCommand('pan-right', canPanRight, panRight)],
      ['pan-up', new CameraDpadCommand('pan-up', canPanUp, panUp)],
      ['zoom-in', new CameraDpadCommand('zoom-in', canZoomIn, zoomIn)],
      ['zoom-out', new CameraDpadCommand('zoom-out', canZoomOut, zoomOut)]
    ]);
    this.getHint = controls.getHint;
    this.getZoomLevel = controls.getZoomLevel;
    this.getZoomText = controls.getZoomText;
  }

  public can(action: string): boolean {
    const command = this.#commandsById.get(action);
    const result = command?.canRun() ?? false;
    return result;
  }

  public run(action: string): void | Promise<void> {
    const command = this.#commandsById.get(action);
    const result = command?.run();
    return result;
  }
}

export const CameraControls = class CameraControls {
  public static create(controls: CameraControlSurfaceInterface, mode = 'inline'): InstanceType<typeof DpadMachine> {
    const resolvedMode = VisualizationModeEntity.intake(mode);
    const result = new DpadMachine(new CameraDpadHooks(controls), resolvedMode);
    return result;
  }
};
