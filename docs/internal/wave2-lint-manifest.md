# Wave 2 lint manifest

Full current ESLint violation list per package, generated via:

```
npx eslint packages/<pkg>/src --no-warn-ignored
```

Each package section is grouped by rule so an implementer can address one rule
at a time across all files in the package. This manifest is the exact scope for
the wave 2 lint remediation agents — one agent per package.

## Totals

| Package | Violations |
|---|---|
| `capacitor` | 20 |
| `cli` | 5 |
| `contrast` | 32 |
| `image` | 11 |
| `rdf` | 10 |
| `stylesheet` | 20 |
| `tailwind` | 12 |
| `vscode` | 48 |

## capacitor (20 violations)

Scope: `packages/capacitor/src`

### `@studnicky/no-freestanding-verb-noun` (6)
- `packages/capacitor/src/tasks/EmitAndroidThemeXml.ts:14:1` — Freestanding 'resolveHexRole' is forbidden. Convert to a static method: `class HexRole { static resolve(...) {} }` where 'HexRole' is the type being produced.
- `packages/capacitor/src/tasks/EmitCapacitorSplashScreen.ts:15:1` — Freestanding 'resolveSplashColor' is forbidden. Convert to a static method: `class SplashColor { static resolve(...) {} }` where 'SplashColor' is the type being produced.
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:20:1` — Freestanding 'resolveBarColor' is forbidden. Convert to a static method: `class BarColor { static resolve(...) {} }` where 'BarColor' is the type being produced.
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:27:1` — Freestanding 'resolveTextColor' is forbidden. Convert to a static method: `class TextColor { static resolve(...) {} }` where 'TextColor' is the type being produced.
- `packages/capacitor/src/tasks/EmitCapacitorTheme.ts:17:1` — Freestanding 'buildIntentMap' is forbidden. Convert to a static method: `class IntentMap { static build(...) {} }` where 'IntentMap' is the type being produced.
- `packages/capacitor/src/tasks/EmitCapacitorTheme.ts:29:1` — Freestanding 'resolveHex' is forbidden. Convert to a static method: `class Hex { static resolve(...) {} }` where 'Hex' is the type being produced.

### `@studnicky/single-export` (5)
- `packages/capacitor/src/CapacitorPlugin.ts:62:1` — Files must export exactly one named symbol (found: capacitorPlugin, CapacitorPlugin).
- `packages/capacitor/src/tasks/EmitAndroidThemeXml.ts:32:1` — Files must export exactly one named symbol (found: emitAndroidThemeXml, EmitAndroidThemeXml).
- `packages/capacitor/src/tasks/EmitCapacitorSplashScreen.ts:25:1` — Files must export exactly one named symbol (found: emitCapacitorSplashScreen, EmitCapacitorSplashScreen).
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:33:1` — Files must export exactly one named symbol (found: emitCapacitorStatusBar, EmitCapacitorStatusBar).
- `packages/capacitor/src/tasks/EmitCapacitorTheme.ts:71:1` — Files must export exactly one named symbol (found: emitCapacitorTheme, EmitCapacitorTheme).

### `@studnicky/type-alias-must-end-type` (3)
- `packages/capacitor/src/types/index.ts:1:8` — Exported type alias 'StatusBarOutputInterface' must end in 'Type'. Rename to 'StatusBarOutputInterfaceType'.
- `packages/capacitor/src/types/index.ts:7:8` — Exported type alias 'CapacitorThemeOutputInterface' must end in 'Type'. Rename to 'CapacitorThemeOutputInterfaceType'.
- `packages/capacitor/src/types/index.ts:23:8` — Exported type alias 'SplashScreenOutputInterface' must end in 'Type'. Rename to 'SplashScreenOutputInterfaceType'.

### `@typescript-eslint/strict-boolean-expressions` (5)
- `packages/capacitor/src/tasks/EmitAndroidThemeXml.ts:20:9` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/capacitor/src/tasks/EmitCapacitorSplashScreen.ts:41:10` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:46:10` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:65:37` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/capacitor/src/tasks/EmitCapacitorTheme.ts:22:9` — Unexpected value in conditional. A boolean expression is required.

### `no-nested-ternary` (1)
- `packages/capacitor/src/tasks/EmitCapacitorStatusBar.ts:65:37` — Do not nest ternary expressions.


## cli (5 violations)

Scope: `packages/cli/src`

### `@studnicky/single-export` (1)
- `packages/cli/src/ConfigLoader.ts:8:1` — Files must export exactly one named symbol (found: configLoader, ConfigLoader).

### `@typescript-eslint/await-thenable` (1)
- `packages/cli/src/Cli.ts:65:28` — Unexpected `await` of a non-Promise (non-"Thenable") value.

### `@typescript-eslint/strict-boolean-expressions` (3)
- `packages/cli/src/PluginResolver.ts:43:12` — Unexpected nullable boolean value in conditional. Please handle the nullish case explicitly.
- `packages/cli/src/PluginResolver.ts:52:12` — Unexpected any value in conditional. An explicit comparison or type conversion is required.
- `packages/cli/src/main.ts:6:6` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.


## contrast (32 violations)

Scope: `packages/contrast/src`

### `@studnicky/no-freestanding-verb-noun` (1)
- `packages/contrast/src/tasks/EnforceCvdSimulate.ts:19:1` — Freestanding 'applyMatrix' is forbidden. Convert to a static method: `class Matrix { static apply(...) {} }` where 'Matrix' is the type being produced.

### `@studnicky/single-export` (8)
- `packages/contrast/src/ContrastPlugin.ts:82:1` — Files must export exactly one named symbol (found: contrastPlugin, ContrastPlugin).
- `packages/contrast/src/data/cvdMatrices.ts:30:1` — Files must export exactly one named symbol (found: achromatopsiaMatrix, cvdMatrices, deuteranopiaMatrix, protanopiaMatrix, tritanopiaMatrix).
- `packages/contrast/src/data/cvdThresholds.ts:98:1` — Files must export exactly one named symbol (found: CVD_THRESHOLDS, CvdThresholdInterface).
- `packages/contrast/src/data/wcagRequiredRatio.ts:20:1` — Files must export exactly one named symbol (found: wcagRequiredRatio, WcagRequiredRatio).
- `packages/contrast/src/tasks/EnforceApca.ts:47:1` — Files must export exactly one named symbol (found: enforceApca, EnforceApca).
- `packages/contrast/src/tasks/EnforceCvdSimulate.ts:82:1` — Files must export exactly one named symbol (found: enforceCvdSimulate, EnforceCvdSimulate).
- `packages/contrast/src/tasks/EnforceWcagAa.ts:16:1` — Files must export exactly one named symbol (found: enforceWcagAa, EnforceWcagAa).
- `packages/contrast/src/tasks/EnforceWcagAaa.ts:16:1` — Files must export exactly one named symbol (found: enforceWcagAaa, EnforceWcagAaa).

### `@studnicky/type-alias-must-end-type` (9)
- `packages/contrast/src/data/cvdThresholds.ts:98:8` — Exported type alias 'CvdThresholdInterface' must end in 'Type'. Rename to 'CvdThresholdInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:5:8` — Exported type alias 'WcagPairResultInterface' must end in 'Type'. Rename to 'WcagPairResultInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:15:8` — Exported type alias 'WcagPairResultSetInterface' must end in 'Type'. Rename to 'WcagPairResultSetInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:19:8` — Exported type alias 'ApcaPairResultInterface' must end in 'Type'. Rename to 'ApcaPairResultInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:29:8` — Exported type alias 'ApcaPairResultSetInterface' must end in 'Type'. Rename to 'ApcaPairResultSetInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:33:8` — Exported type alias 'CvdPairWarningInterface' must end in 'Type'. Rename to 'CvdPairWarningInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:44:8` — Exported type alias 'CvdResultSetInterface' must end in 'Type'. Rename to 'CvdResultSetInterfaceType'.
- `packages/contrast/src/types/augmentation.ts:48:8` — Exported type alias 'WcagMetaSlotInterface' must end in 'Type'. Rename to 'WcagMetaSlotInterfaceType'.
- `packages/contrast/src/types/index.ts:3:8` — Exported type alias 'CvdMatrixInterface' must end in 'Type'. Rename to 'CvdMatrixInterfaceType'.

### `@typescript-eslint/strict-boolean-expressions` (14)
- `packages/contrast/src/data/wcagRequiredRatio.ts:9:8` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/data/wcagRequiredRatio.ts:9:21` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/data/wcagRequiredRatio.ts:41:10` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/data/wcagRequiredRatio.ts:41:37` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceApca.ts:27:8` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceApca.ts:27:21` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceApca.ts:73:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceApca.ts:73:25` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceCvdSimulate.ts:104:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceCvdSimulate.ts:104:25` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceWcagAa.ts:43:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceWcagAa.ts:43:25` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceWcagAaa.ts:43:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/contrast/src/tasks/EnforceWcagAaa.ts:43:25` — Unexpected nullable object value in conditional. An explicit null check is required.


## image (11 violations)

Scope: `packages/image/src`

### `@studnicky/no-prefer-existing-type` (1)
- `packages/image/src/types/augmentation.ts:17:8` — Type 'GalleryConfigInterface' is fully subsumed by 'RoleDefinitionInterfaceType' from '@studnicky/iridis'. Consider using Pick<RoleDefinitionInterfaceType, 'algorithm' | 'chromaRange' | 'deltaECap' | 'harmonizeThreshold' | 'histogramBits' | 'k' | 'lightnessRange'> or importing 'RoleDefinitionInterfaceType' directly.

### `@studnicky/single-export` (5)
- `packages/image/src/ImagePlugin.ts:39:1` — Files must export exactly one named symbol (found: imagePlugin, ImagePlugin).
- `packages/image/src/tasks/GalleryAssignRoles.ts:27:1` — Files must export exactly one named symbol (found: galleryAssignRoles, GalleryAssignRoles).
- `packages/image/src/tasks/GalleryExtract.ts:73:1` — Files must export exactly one named symbol (found: galleryExtract, GalleryExtract).
- `packages/image/src/tasks/GalleryHarmonize.ts:24:1` — Files must export exactly one named symbol (found: galleryHarmonize, GalleryHarmonize).
- `packages/image/src/tasks/GalleryHistogram.ts:59:1` — Files must export exactly one named symbol (found: galleryHistogram, GalleryHistogram).

### `@studnicky/type-alias-must-end-type` (3)
- `packages/image/src/types/augmentation.ts:17:8` — Exported type alias 'GalleryConfigInterface' must end in 'Type'. Rename to 'GalleryConfigInterfaceType'.
- `packages/image/src/types/augmentation.ts:30:8` — Exported type alias 'GalleryHistogramSlotInterface' must end in 'Type'. Rename to 'GalleryHistogramSlotInterfaceType'.
- `packages/image/src/types/augmentation.ts:40:8` — Exported type alias 'GalleryHarmonizeDetailsInterface' must end in 'Type'. Rename to 'GalleryHarmonizeDetailsInterfaceType'.

### `@typescript-eslint/strict-boolean-expressions` (2)
- `packages/image/src/tasks/GalleryHarmonize.ts:38:10` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/image/src/tasks/GalleryHarmonize.ts:38:21` — Unexpected nullable object value in conditional. An explicit null check is required.


## rdf (10 violations)

Scope: `packages/rdf/src`

### `@studnicky/no-freestanding-verb-noun` (2)
- `packages/rdf/src/tasks/ReasonSerialize.ts:17:1` — Freestanding 'resolveFormat' is forbidden. Convert to a static method: `class Format { static resolve(...) {} }` where 'Format' is the type being produced.
- `packages/rdf/src/tasks/ReasonSerialize.ts:30:1` — Freestanding 'serializeStore' is forbidden. Convert to a static method: `class Store { static serialize(...) {} }` where 'Store' is the type being produced.

### `@studnicky/single-export` (3)
- `packages/rdf/src/RdfPlugin.ts:24:1` — Files must export exactly one named symbol (found: rdfPlugin, RdfPlugin).
- `packages/rdf/src/tasks/ReasonAnnotate.ts:35:1` — Files must export exactly one named symbol (found: reasonAnnotate, ReasonAnnotate).
- `packages/rdf/src/tasks/ReasonSerialize.ts:51:1` — Files must export exactly one named symbol (found: reasonSerialize, ReasonSerialize).

### `@typescript-eslint/no-unsafe-assignment` (1)
- `packages/rdf/src/tasks/ReasonSerialize.ts:45:11` — Unsafe assignment of an `any` value.

### `@typescript-eslint/strict-boolean-expressions` (4)
- `packages/rdf/src/tasks/ReasonAnnotate.ts:77:11` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/rdf/src/tasks/ReasonSerialize.ts:44:9` — Unexpected object value in conditional. The condition is always true.
- `packages/rdf/src/tasks/ReasonSerialize.ts:47:7` — Unexpected nullish value in conditional. The condition is always false.
- `packages/rdf/src/tasks/ReasonSerialize.ts:63:10` — Unexpected nullable object value in conditional. An explicit null check is required.


## stylesheet (20 violations)

Scope: `packages/stylesheet/src`

### `@studnicky/no-freestanding-verb-noun` (9)
- `packages/stylesheet/src/tasks/EmitCssVars.ts:56:1` — Freestanding 'buildDeclarations' is forbidden. Convert to a static method: `class Declarations { static build(...) {} }` where 'Declarations' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:67:1` — Freestanding 'buildRootBlock' is forbidden. Convert to a static method: `class RootBlock { static build(...) {} }` where 'RootBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:75:1` — Freestanding 'buildScopedBlock' is forbidden. Convert to a static method: `class ScopedBlock { static build(...) {} }` where 'ScopedBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:88:1` — Freestanding 'buildDarkSchemeBlock' is forbidden. Convert to a static method: `class DarkSchemeBlock { static build(...) {} }` where 'DarkSchemeBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:96:1` — Freestanding 'buildForcedColorsBlock' is forbidden. Convert to a static method: `class ForcedColorsBlock { static build(...) {} }` where 'ForcedColorsBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:123:1` — Freestanding 'buildWideGamutBlock' is forbidden. Convert to a static method: `class WideGamutBlock { static build(...) {} }` where 'WideGamutBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:138:1` — Freestanding 'buildVarMap' is forbidden. Convert to a static method: `class VarMap { static build(...) {} }` where 'VarMap' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVarsScoped.ts:17:1` — Freestanding 'buildScopedCategoryBlock' is forbidden. Convert to a static method: `class ScopedCategoryBlock { static build(...) {} }` where 'ScopedCategoryBlock' is the type being produced.
- `packages/stylesheet/src/tasks/EmitCssVarsScoped.ts:46:1` — Freestanding 'buildScopedWideGamutBlock' is forbidden. Convert to a static method: `class ScopedWideGamutBlock { static build(...) {} }` where 'ScopedWideGamutBlock' is the type being produced.

### `@studnicky/single-export` (3)
- `packages/stylesheet/src/StylesheetPlugin.ts:34:1` — Files must export exactly one named symbol (found: stylesheetPlugin, StylesheetPlugin).
- `packages/stylesheet/src/tasks/EmitCssVars.ts:150:1` — Files must export exactly one named symbol (found: emitCssVars, EmitCssVars).
- `packages/stylesheet/src/tasks/EmitCssVarsScoped.ts:77:1` — Files must export exactly one named symbol (found: emitCssVarsScoped, EmitCssVarsScoped).

### `@studnicky/type-alias-must-end-type` (2)
- `packages/stylesheet/src/types/index.ts:1:8` — Exported type alias 'CssVarsOutputInterface' must end in 'Type'. Rename to 'CssVarsOutputInterfaceType'.
- `packages/stylesheet/src/types/index.ts:11:8` — Exported type alias 'CssVarsScopedOutputInterface' must end in 'Type'. Rename to 'CssVarsScopedOutputInterfaceType'.

### `@typescript-eslint/strict-boolean-expressions` (6)
- `packages/stylesheet/src/tasks/EmitCssVars.ts:82:20` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:129:9` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/stylesheet/src/tasks/EmitCssVars.ts:172:26` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/stylesheet/src/tasks/EmitCssVarsScoped.ts:54:9` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/stylesheet/src/tasks/EmitCssVarsScoped.ts:116:11` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/stylesheet/src/util/serializeP3.ts:14:8` — Unexpected nullable object value in conditional. An explicit null check is required.


## tailwind (12 violations)

Scope: `packages/tailwind/src`

### `@studnicky/no-freestanding-verb-noun` (4)
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:25:1` — Freestanding 'serializeP3' is forbidden. Convert to a static method: `class P3 { static serialize(...) {} }` where 'P3' is the type being produced.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:51:1` — Freestanding 'buildColorsShape' is forbidden. Convert to a static method: `class ColorsShape { static build(...) {} }` where 'ColorsShape' is the type being produced.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:93:1` — Freestanding 'serializeColorsToJs' is forbidden. Convert to a static method: `class ColorsToJs { static serialize(...) {} }` where 'ColorsToJs' is the type being produced.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:127:1` — Freestanding 'buildCssVarsSheet' is forbidden. Convert to a static method: `class CssVarsSheet { static build(...) {} }` where 'CssVarsSheet' is the type being produced.

### `@studnicky/single-export` (2)
- `packages/tailwind/src/TailwindPlugin.ts:19:1` — Files must export exactly one named symbol (found: tailwindPlugin, TailwindPlugin).
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:152:1` — Files must export exactly one named symbol (found: emitTailwindTheme, EmitTailwindTheme).

### `@studnicky/type-alias-must-end-type` (1)
- `packages/tailwind/src/types/index.ts:1:8` — Exported type alias 'TailwindOutputInterface' must end in 'Type'. Rename to 'TailwindOutputInterfaceType'.

### `@typescript-eslint/prefer-nullish-coalescing` (1)
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:61:7` — Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.

### `@typescript-eslint/strict-boolean-expressions` (4)
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:26:8` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:58:9` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:61:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/tailwind/src/tasks/EmitTailwindTheme.ts:139:9` — Unexpected nullable object value in conditional. An explicit null check is required.


## vscode (48 violations)

Scope: `packages/vscode/src`

### `@studnicky/no-freestanding-verb-noun` (1)
- `packages/vscode/src/tasks/EmitVscodeUiPalette.ts:30:1` — Freestanding 'getRole' is forbidden. Convert to a static method: `class Role { static get(...) {} }` where 'Role' is the type being produced.

### `@studnicky/no-prefer-existing-type` (1)
- `packages/vscode/src/types/augmentation.ts:8:8` — Type 'SemanticRuleEntryInterface' is fully subsumed by 'QuickPaletteInterfaceType' from '@studnicky/iridis'. Consider using Pick<QuickPaletteInterfaceType, 'fontStyle' | 'foreground'> or importing 'QuickPaletteInterfaceType' directly.

### `@studnicky/single-export` (7)
- `packages/vscode/src/VscodePlugin.ts:55:1` — Files must export exactly one named symbol (found: vscodePlugin, VscodePlugin).
- `packages/vscode/src/data/derivationParams.ts:18:1` — Files must export exactly one named symbol (found: DERIVATION_PARAMS, TOKEN_FAMILY, TOKEN_MODIFIERS, TOKEN_TYPES).
- `packages/vscode/src/tasks/ApplyModifiers.ts:27:1` — Files must export exactly one named symbol (found: applyModifiers, ApplyModifiers).
- `packages/vscode/src/tasks/EmitVscodeSemanticRules.ts:23:1` — Files must export exactly one named symbol (found: emitVscodeSemanticRules, EmitVscodeSemanticRules).
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:21:1` — Files must export exactly one named symbol (found: emitVscodeThemeJson, EmitVscodeThemeJson).
- `packages/vscode/src/tasks/EmitVscodeUiPalette.ts:38:1` — Files must export exactly one named symbol (found: emitVscodeUiPalette, EmitVscodeUiPalette).
- `packages/vscode/src/tasks/ExpandTokens.ts:23:1` — Files must export exactly one named symbol (found: expandTokens, ExpandTokens).

### `@studnicky/type-alias-must-end-type` (7)
- `packages/vscode/src/types/augmentation.ts:8:8` — Exported type alias 'SemanticRuleEntryInterface' must end in 'Type'. Rename to 'SemanticRuleEntryInterfaceType'.
- `packages/vscode/src/types/augmentation.ts:14:8` — Exported type alias 'TokenColorRuleInterface' must end in 'Type'. Rename to 'TokenColorRuleInterfaceType'.
- `packages/vscode/src/types/augmentation.ts:24:8` — Exported type alias 'ThemeJsonInterface' must end in 'Type'. Rename to 'ThemeJsonInterfaceType'.
- `packages/vscode/src/types/augmentation.ts:37:8` — Exported type alias 'VscodeOutputSlotInterface' must end in 'Type'. Rename to 'VscodeOutputSlotInterfaceType'.
- `packages/vscode/src/types/augmentation.ts:46:8` — Exported type alias 'VscodeMetaSlotInterface' must end in 'Type'. Rename to 'VscodeMetaSlotInterfaceType'.
- `packages/vscode/src/types/derivation.ts:21:8` — Exported type alias 'DerivationParamsInterface' must end in 'Type'. Rename to 'DerivationParamsInterfaceType'.
- `packages/vscode/src/types/modifiers.ts:11:8` — Exported type alias 'ModifierTransformInterface' must end in 'Type'. Rename to 'ModifierTransformInterfaceType'.

### `@typescript-eslint/no-unused-vars` (1)
- `packages/vscode/src/tasks/EmitVscodeUiPalette.ts:72:11` — 'surface_HEX' is assigned a value but never used. Allowed unused vars must match /^(_|[A-Z][A-Za-z]*Schema$|[A-Za-z]*Interface$|[A-Za-z]*Type$)/u.

### `@typescript-eslint/strict-boolean-expressions` (31)
- `packages/vscode/src/tasks/ApplyModifiers.ts:49:12` — Unexpected value in conditional. A boolean expression is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:51:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:60:12` — Unexpected value in conditional. A boolean expression is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:62:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:66:14` — Unexpected value in conditional. A boolean expression is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:69:14` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:73:13` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/tasks/ApplyModifiers.ts:81:13` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/tasks/ApplyModifiers.ts:89:13` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/ApplyModifiers.ts:89:34` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/tasks/ApplyModifiers.ts:91:15` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ApplyModifiers.ts:100:13` — Unexpected value in conditional. A boolean expression is required.
- `packages/vscode/src/tasks/EmitVscodeSemanticRules.ts:20:10` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeSemanticRules.ts:40:11` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeSemanticRules.ts:46:11` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:44:19` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:50:11` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:52:18` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:64:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/EmitVscodeThemeJson.ts:70:11` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/EmitVscodeUiPalette.ts:32:8` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:40:10` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:40:20` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:40:33` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:49:12` — Unexpected value in conditional. A boolean expression is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:52:12` — Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly.
- `packages/vscode/src/tasks/ExpandTokens.ts:76:12` — Unexpected nullable object value in conditional. An explicit null check is required.
- `packages/vscode/src/tasks/ExpandTokens.ts:90:11` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/tasks/ExpandTokens.ts:93:11` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/tasks/ExpandTokens.ts:100:11` — Unexpected nullable number value in conditional. Please handle the nullish/zero/NaN cases explicitly.
- `packages/vscode/src/util/recordToVscodeColor.ts:22:8` — Unexpected nullable object value in conditional. An explicit null check is required.


