import type { JsonObjectType } from '@studnicky/types';

import type { ColorRecordInterfaceType } from './color.ts';
import type {
  ContrastAlgorithmType,
  ContrastPairInterfaceType,
  RoleSchemaInterfaceType
} from './role.ts';
import type { RuntimeOptionsInterface } from './runtime.ts';

export interface InputInterface {
  readonly 'bypass':    boolean | undefined;
  readonly 'colors':    readonly unknown[];
  readonly 'contrast': {
    readonly 'algorithm':   ContrastAlgorithmType | undefined;
    readonly 'cvdCorrect':  boolean | undefined;
    readonly 'extra':       readonly ContrastPairInterfaceType[] | undefined;
    readonly 'level':       string | undefined;
  } | undefined;
  /**
   * Selective emit filter: names of output slots to produce. Reserved for
   * the planned `@studnicky/iridis-anima` animation/interpolation engine,
   * which will use this field to request only the output slots it needs per
   * interpolation frame (avoiding unnecessary emit work on hot paths).
   * No current task reads this field; it is public API for future consumers.
   */
  readonly 'emit':      readonly string[] | undefined;
  readonly 'maxColors': number | undefined;
  readonly 'metadata':  JsonObjectType | undefined;
  readonly 'roles':     RoleSchemaInterfaceType | undefined;
  readonly 'runtime':   RuntimeOptionsInterface | undefined;
}

/** Shape of a single contrast report entry (written by enforce:contrast). */
export type ContrastReportEntryInterfaceType = {
  'adjusted':   boolean;
  'algorithm':  string;
  'background': string;
  'foreground': string;
  'minRatio':   number;
  'passed':     boolean;
  'ratio':      number;
};

/** A contrast pair queued during the nudge pass, held until reconciliation re-measures it against the terminal state.roles. */
export type PendingContrastEntryInterfaceType = {
  'adjusted': boolean;
  'algo':     ContrastAlgorithmType;
  'minRatio': number;
  'pair':     ContrastPairInterfaceType;
};

export interface PaletteStateInterface {
  'colors':            ColorRecordInterfaceType[];
  readonly 'input':    InputInterface;
  'metadata':          JsonObjectType;
  'outputs':           JsonObjectType;
  'roles':             Record<string, ColorRecordInterfaceType>;
  readonly 'runtime':  RuntimeOptionsInterface;
  'variants':          Record<string, Record<string, ColorRecordInterfaceType>>;
}
