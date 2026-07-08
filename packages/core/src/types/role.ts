import type { ColorIntentType } from './color.ts';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

export interface RoleDefinitionInterface {
  readonly name:           string;
  readonly description?:   string;
  /**
   * Canonical ontology hook for downstream semantic mapping. When set,
   * `ResolveRoles` propagates this value onto the resolved record's
   * `hints.intent`, and downstream readers consume it directly:
   *  - `EnforceApca`:             picks Lc 75 / 60 / 45 per WCAG 3 Bronze.
   *  - `wcagRequiredRatio`:       picks AA/AAA text-vs-UI ratios.
   *  - `EmitCapacitorTheme`:      picks StatusBar light/dark style.
   *  - `EmitCssVars.forcedColorsToken`: picks Windows High Contrast tokens.
   *
   * The schema-declared intent ALWAYS wins over any intake-supplied
   * `hints.intent` on the candidate color; the schema is the system's
   * ontology mapping. NO substring inference happens on role names; if
   * a role doesn't declare an intent, downstream readers fall back to
   * their documented defaults (typically the legibility-safe option).
   *
   * Users who need different semantics ship a custom JSON-tology
   * overlay with their own role schema; that overlay's `intent` value
   * flows through identically.
   */
  readonly intent?:        ColorIntentType;
  readonly required?:      boolean;
  readonly derivedFrom?:   string;
  readonly lightnessRange?: readonly [number, number];
  readonly chromaRange?:    readonly [number, number];
  /**
   * Relative hue rotation applied when the role is DERIVED from another
   * (`expand:family` adds it to the source role's hue). For a role resolved
   * directly by `resolve:roles`, it is treated as an absolute target hue.
   */
  readonly hueOffset?:      number;
  /**
   * Absolute target hue in OKLCH degrees [0, 360). Takes precedence over
   * `hueOffset` in every resolution path, so a role can inherit its source's
   * lightness/chroma character via `derivedFrom` while pinning a fixed hue
   * (e.g. `success` stays green regardless of the brand). Resolved by the
   * engine, not the consumer.
   */
  readonly hue?:            number;
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
