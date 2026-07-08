import type { ColorRecordInterface } from './color.ts';
import type {
  ContrastAlgorithmType,
  ContrastPairInterface,
  RoleSchemaInterface,
} from './role.ts';
import type { RuntimeOptionsInterface } from './runtime.ts';

export interface InputInterface {
  readonly colors:    readonly unknown[];
  readonly roles?:    RoleSchemaInterface;
  readonly contrast?: {
    readonly level?:     'AA' | 'AAA' | string;
    readonly algorithm?: ContrastAlgorithmType;
    readonly extra?:     readonly ContrastPairInterface[];
  };
  readonly maxColors?: number;
  readonly bypass?:    boolean;
  /**
   * Selective emit filter: names of output slots to produce. Reserved for
   * the planned `@studnicky/iridis-anima` animation/interpolation engine,
   * which will use this field to request only the output slots it needs per
   * interpolation frame (avoiding unnecessary emit work on hot paths).
   * No current task reads this field; it is public API for future consumers.
   */
  readonly emit?:      readonly string[];
  readonly runtime?:   RuntimeOptionsInterface;
  readonly metadata?:  Record<string, unknown>;
}

/** Shape of a single contrast report entry (written by enforce:contrast). */
export interface ContrastReportEntryInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  string;
  readonly 'ratio':      number;
  readonly 'minRatio':   number;
  readonly 'passed':     boolean;
  readonly 'adjusted':   boolean;
}

/** Shape of a single variant configuration entry (read by derive:variant). */
export interface VariantConfigInterface {
  readonly 'name':             string;
  readonly 'invertLightness':  boolean;
  readonly 'lightnessOffset'?: number;
  /**
   * Absolute target OKLCH lightness for every role in this variant. Takes
   * precedence over `lightnessOffset`. Lets a caller request a fixed tonal
   * step (e.g. an 11-stop 50→950 scale) resolved through the engine's own
   * `colorRecordFactory` rather than computing the ramp downstream.
   */
  readonly 'lightnessTarget'?: number;
}

export interface PaletteStateInterface {
  readonly input:    InputInterface;
  readonly runtime:  RuntimeOptionsInterface;
  colors:            ColorRecordInterface[];
  roles:             Record<string, ColorRecordInterface>;
  variants:          Record<string, Record<string, ColorRecordInterface>>;
  outputs:           Record<string, unknown>;
  metadata:          Record<string, unknown>;
}
