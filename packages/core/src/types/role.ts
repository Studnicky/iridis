import type { ColorIntentType } from './color.ts';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

export type RoleDefinitionInterfaceType = {
  'chromaRange':    [number, number] | undefined;
  'derivedFrom':    string | undefined;
  'description':    string | undefined;
  /**
   * Target hue in OKLCH degrees [0, 360). Takes precedence over `hueOffset` in
   * every resolution path. Always applied as a BOUNDED nudge, never an absolute
   * pin — the resolved color is rotated toward the target by at most `hueClamp`
   * degrees (defaulting to `RoleGeometry.DEFAULT_HUE_CLAMP` when `hueClamp` is
   * omitted) along the shortest arc, so semantic roles lean toward their meaning
   * (success → green) while staying rooted in the actual palette rather than
   * snapping to a hue that appears nowhere in it. Resolved by the engine, not
   * the consumer.
   */
  'hue':            number | undefined;
  /**
   * Maximum degrees the resolved hue may rotate toward `hue`. Bounds the nudge
   * so a red-dominant palette yields a warm-leaning `success` rather than a pure
   * green that appears nowhere in the theme. Ignored unless `hue` is set;
   * defaults to `RoleGeometry.DEFAULT_HUE_CLAMP` degrees when `hue` is set
   * without it.
   */
  'hueClamp':       number | undefined;
  /**
   * Relative hue rotation applied when the role is DERIVED from another
   * (`expand:family` adds it to the source role's hue). For a role resolved
   * directly by `resolve:roles`, it is treated as an absolute target hue.
   */
  'hueOffset':      number | undefined;
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
  'intent':         ColorIntentType | undefined;
  'lightnessRange': [number, number] | undefined;
  'name':           string;
  'required':       boolean | undefined;
};

export type ContrastPairInterfaceType = {
  'algorithm'?: ContrastAlgorithmType;
  'background': string;
  'foreground': string;
  'minRatio':   number;
};

export type RoleSchemaInterfaceType = {
  'contrastPairs'?: ContrastPairInterfaceType[];
  'description'?:   string;
  'name':           string;
  'roles':          RoleDefinitionInterfaceType[];
};
