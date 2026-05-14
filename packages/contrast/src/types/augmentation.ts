import type { CvdType } from '@studnicky/iridis';

export interface WcagPairResultInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  'wcag21' | 'apca';
  readonly 'required':   number;
  readonly 'before':     number;
  readonly 'after':      number;
  readonly 'pass':       boolean;
}

export interface WcagPairResultSetInterface {
  readonly 'pairs': readonly WcagPairResultInterface[];
}

export interface ApcaPairResultInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  'apca';
  readonly 'requiredLc': number;
  readonly 'beforeLc':   number;
  readonly 'afterLc':    number;
  readonly 'pass':       boolean;
}

export interface ApcaPairResultSetInterface {
  readonly 'pairs': readonly ApcaPairResultInterface[];
}

/**
 * One CVD-simulation warning. Emitted by `enforce:cvdSimulate` when
 * either of the two stability signals for the named CVD type fires:
 *  - `|drop|` exceeds the type's `dropMagnitude` threshold, OR
 *  - `simulatedLuminanceContrast` falls below the type's
 *    `minSimulatedContrast` floor.
 *
 * `dropThreshold` and `minSimulatedContrast` are echoed onto each
 * warning so downstream consumers can audit which signal fired without
 * cross-referencing the threshold table. Thresholds come from
 * `CVD_THRESHOLDS` in `packages/contrast/src/data/cvdThresholds.ts`.
 */
export interface CvdPairWarningInterface {
  readonly 'foreground':                 string;
  readonly 'background':                 string;
  readonly 'cvdType':                    CvdType;
  readonly 'originalLuminanceContrast':  number;
  readonly 'simulatedLuminanceContrast': number;
  readonly 'drop':                       number;
  readonly 'dropThreshold':              number;
  readonly 'minSimulatedContrast':       number;
}

export interface CvdResultSetInterface {
  readonly 'warnings': readonly CvdPairWarningInterface[];
}

export interface WcagMetaSlotInterface {
  'aa'?:   WcagPairResultSetInterface;
  'aaa'?:  WcagPairResultSetInterface;
  'apca'?: ApcaPairResultSetInterface;
  'cvd'?:  CvdResultSetInterface;
}

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'wcag': WcagMetaSlotInterface;
  }
}
