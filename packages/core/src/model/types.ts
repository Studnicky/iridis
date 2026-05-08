export type ColorIntentType =
  | 'base'
  | 'accent'
  | 'muted'
  | 'critical'
  | 'positive'
  | 'neutral'
  | 'surface'
  | 'text';

export type SourceFormatType =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'oklch'
  | 'lab'
  | 'named'
  | 'imagePixel';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

export type LifecyclePhaseType = 'onRunStart' | 'onRunEnd';

export type FramingType = 'dark' | 'light';

export type ColorSpaceType = 'srgb' | 'displayP3';

export interface RuntimeOptionsInterface {
  readonly framing?:    FramingType;
  readonly colorSpace?: ColorSpaceType;
  readonly extra?:      Readonly<Record<string, unknown>>;
}

export interface OklchInterface {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export interface RgbInterface {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ColorHintsInterface {
  readonly role?:   string;
  readonly intent?: ColorIntentType;
  readonly weight?: number;
}

export interface ColorRecordInterface {
  readonly oklch:        OklchInterface;
  readonly rgb:          RgbInterface;
  readonly hex:          string;
  readonly alpha:        number;
  readonly sourceFormat: SourceFormatType;
  readonly displayP3?:   RgbInterface;
  readonly hints?:       ColorHintsInterface;
}

export interface RoleDefinitionInterface {
  readonly name:           string;
  readonly description?:   string;
  readonly intent?:        ColorIntentType;
  readonly required?:      boolean;
  readonly derivedFrom?:   string;
  readonly lightnessRange?: readonly [number, number];
  readonly chromaRange?:    readonly [number, number];
  readonly hueOffset?:      number;
}

export interface ContrastPairInterface {
  readonly foreground: string;
  readonly background: string;
  readonly minRatio:   number;
  readonly algorithm?: ContrastAlgorithmType;
}

export interface RoleSchemaInterface {
  readonly name:           string;
  readonly description?:   string;
  readonly roles:          readonly RoleDefinitionInterface[];
  readonly contrastPairs?: readonly ContrastPairInterface[];
}

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

export interface PaletteStateInterface {
  readonly input:    InputInterface;
  readonly runtime:  RuntimeOptionsInterface;
  colors:            ColorRecordInterface[];
  roles:             Record<string, ColorRecordInterface>;
  variants:          Record<string, Record<string, ColorRecordInterface>>;
  outputs:           Record<string, unknown>;
  graph?:            unknown;
  metadata:          Record<string, unknown>;
}

export interface PipelineContextInterface {
  readonly engine:    EngineInterface;
  readonly tasks:     TaskRegistryInterface;
  readonly math:      ColorMathRegistryInterface;
  readonly logger:    LoggerInterface;
  readonly startedAt: number;
  readonly cache:     Map<string, unknown>;
}

export interface LoggerInterface {
  debug(scope: string, op: string, message: string, data?: unknown): void;
  info(scope: string, op: string, message: string, data?: unknown):  void;
  warn(scope: string, op: string, message: string, data?: unknown):  void;
  error(scope: string, op: string, message: string, data?: unknown): void;
}

export interface TaskManifestInterface {
  readonly name:           string;
  readonly phase?:         LifecyclePhaseType;
  readonly reads?:         readonly string[];
  readonly writes?:        readonly string[];
  readonly requires?:      readonly string[];
  readonly description?:   string;
}

export interface TaskInterface {
  readonly name:      string;
  readonly manifest?: TaskManifestInterface;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): Promise<void> | void;
}

export interface MathPrimitiveInterface {
  readonly name: string;
  apply(...args: readonly unknown[]): unknown;
}

export interface PluginInterface {
  readonly name:    string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
  math():  readonly MathPrimitiveInterface[];
}

export interface TaskRegistryInterface {
  register(task: TaskInterface): void;
  hook(phase: LifecyclePhaseType, task: TaskInterface): void;
  resolve(name: string): TaskInterface;
  has(name: string): boolean;
  list(): readonly TaskManifestInterface[];
  hooks(phase: LifecyclePhaseType): readonly TaskInterface[];
}

export interface ColorMathRegistryInterface {
  register(primitive: MathPrimitiveInterface): void;
  resolve(name: string): MathPrimitiveInterface;
  has(name: string): boolean;
  list(): readonly string[];
  invoke<TResult = unknown>(name: string, ...args: readonly unknown[]): TResult;
}

export interface EngineInterface {
  readonly tasks: TaskRegistryInterface;
  readonly math:  ColorMathRegistryInterface;
  adopt(plugin: PluginInterface): void;
  pipeline(order: readonly string[]): void;
  run(input: InputInterface): Promise<PaletteStateInterface>;
}
