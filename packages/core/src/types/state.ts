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
  readonly emit?:      readonly string[];
  readonly runtime?:   RuntimeOptionsInterface;
  readonly metadata?:  Record<string, unknown>;
}

/**
 * Open registry interfaces for module augmentation.
 * Each plugin contributes exactly one key per registry via:
 *
 *   declare module '@studnicky/iridis' {
 *     interface PluginOutputsRegistry  { myPlugin: MyOutputShape;   }
 *     interface PluginMetadataRegistry { myPlugin: MyMetadataShape; }
 *   }
 *
 * PaletteStateInterface.outputs / .metadata are typed as Partial<...>
 * so every slot is optional (the plugin may not have run yet) but, once
 * present, the value has the declared plugin shape — no unknown bag.
 */
export interface PluginOutputsRegistry {
  /** emit:json — colors/roles/variants flattened to hex strings */
  'json': {
    'colors':   string[];
    'roles':    Record<string, string>;
    'variants': Record<string, Record<string, string>>;
  };
}

export interface PluginMetadataRegistry {
  /** enforce:contrast — per-pair contrast check results */
  'contrastReport':   ContrastReportEntryInterface[];
  /** derive:variant — caller-supplied variant config */
  'variantConfig':    VariantConfigInterface[];
  /** resolve:roles — names of roles that were synthesized (not assigned from colors) */
  'rolesSynthesized': string[];
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
}

export interface PaletteStateInterface {
  readonly input:    InputInterface;
  readonly runtime:  RuntimeOptionsInterface;
  colors:            ColorRecordInterface[];
  roles:             Record<string, ColorRecordInterface>;
  variants:          Record<string, Record<string, ColorRecordInterface>>;
  outputs:           Partial<PluginOutputsRegistry>;
  metadata:          Partial<PluginMetadataRegistry>;
}
