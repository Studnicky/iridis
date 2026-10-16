import type { ColorRecordInterfaceType, InputInterface } from '@studnicky/iridis';

import { coreTasks, Engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { VSCODE_ROLE_SCHEMAS_64, vscodePlugin, vscodeSeedRoleData } from '@studnicky/iridis-vscode';

class VscodeStructuredPalette {
  readonly 'framing': 'dark' | 'light';
  readonly 'roles': Readonly<Record<string, string>>;
  readonly 'tier': 4 | 8 | 16 | 64;

  constructor(tier: 4 | 8 | 16 | 64, framing: 'dark' | 'light', roles: Readonly<Record<string, string>>) {
    this.tier = tier;
    this.framing = framing;
    this.roles = roles;
  }
}

class VscodeContrastEntry {
  readonly 'adjusted': boolean;
  readonly 'algorithm': 'apca' | 'wcag21';
  readonly 'background': string;
  readonly 'foreground': string;
  readonly 'maxRatio': number | undefined;
  readonly 'minRatio': number;
  readonly 'passed': boolean;
  readonly 'ratio': number;

  constructor(entry: Record<string, unknown>) {
    if (typeof entry.adjusted !== 'boolean'
      || (entry.algorithm !== 'apca' && entry.algorithm !== 'wcag21')
      || typeof entry.background !== 'string'
      || typeof entry.foreground !== 'string'
      || typeof entry.minRatio !== 'number'
      || typeof entry.passed !== 'boolean'
      || typeof entry.ratio !== 'number'
      || (entry.maxRatio !== undefined && typeof entry.maxRatio !== 'number')) {
      throw new TypeError('VS Code theme pipeline returned an invalid contrast report entry');
    }
    this.adjusted = entry.adjusted;
    this.algorithm = entry.algorithm;
    this.background = entry.background;
    this.foreground = entry.foreground;
    this.maxRatio = entry.maxRatio;
    this.minRatio = entry.minRatio;
    this.passed = entry.passed;
    this.ratio = entry.ratio;
  }
}

class VscodeThemeJson {
  readonly 'json': Readonly<Record<string, unknown>>;
  readonly 'semanticTokenColors': Readonly<Record<string, unknown>>;
  readonly 'workbenchColors': Readonly<Record<string, string>>;

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  constructor(value: unknown) {
    if (!VscodeThemeJson.isRecord(value)
      || typeof value.name !== 'string'
      || (value.type !== 'dark' && value.type !== 'light')
      || !VscodeThemeJson.isRecord(value.colors)
      || !VscodeThemeJson.isRecord(value.semanticTokenColors)
      || !Array.isArray(value.tokenColors)
      || value.semanticHighlighting !== true) {
      throw new TypeError('VS Code theme pipeline returned invalid theme JSON');
    }
    const workbenchColors: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value.colors)) {
      if (typeof entry !== 'string') {
        throw new TypeError('VS Code theme pipeline returned an invalid workbench color map');
      }
      workbenchColors[key] = entry;
    }
    const json: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      json[key] = entry;
    }
    const semanticTokenColors: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value.semanticTokenColors)) {
      semanticTokenColors[key] = entry;
    }
    this.json = json;
    this.semanticTokenColors = semanticTokenColors;
    this.workbenchColors = workbenchColors;
  }
}

class VscodeThemeRun {
  readonly 'contrast': readonly VscodeContrastEntry[];
  readonly 'palette': VscodeStructuredPalette;
  readonly 'provenance': {
    readonly 'derivedRoles': readonly string[];
    readonly 'pinnedRoles': readonly string[];
  };
  readonly 'roles': Readonly<Record<string, string>>;
  readonly 'semanticTokenColors': Readonly<Record<string, unknown>>;
  readonly 'theme': VscodeThemeJson;
  readonly 'workbenchColors': Readonly<Record<string, string>>;

  constructor(
    palette: VscodeStructuredPalette,
    contrast: readonly VscodeContrastEntry[],
    derivedRoles: readonly string[],
    pinnedRoles: readonly string[],
    roles: Readonly<Record<string, string>>,
    theme: VscodeThemeJson
  ) {
    this.contrast = contrast;
    this.palette = palette;
    this.provenance = { 'derivedRoles': derivedRoles, 'pinnedRoles': pinnedRoles };
    this.roles = roles;
    this.semanticTokenColors = theme.semanticTokenColors;
    this.theme = theme;
    this.workbenchColors = theme.workbenchColors;
  }
}

class VscodeThemeInput {
  private static readonly 'hexCharacters' = '0123456789abcdefABCDEF';

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static isHex(value: string): boolean {
    if (value.length !== 7 || value[0] !== '#') { return false; }
    for (const character of value.slice(1)) {
      if (!VscodeThemeInput.hexCharacters.includes(character)) { return false; }
    }
    return true;
  }

  static parse(value: unknown): VscodeStructuredPalette {
    if (!VscodeThemeInput.isRecord(value)) {
      throw new TypeError('VS Code theme input must be a structured palette object');
    }
    if (Object.keys(value).length !== 3 || !['tier', 'framing', 'roles'].every((key) => { return key in value; })) {
      throw new TypeError('VS Code theme input requires exactly tier, framing, and roles');
    }
    const framing = value.framing;
    if (framing !== 'dark' && framing !== 'light') {
      throw new TypeError('VS Code theme input framing must be dark or light');
    }
    if (!VscodeThemeInput.isRecord(value.roles)) {
      throw new TypeError('VS Code theme input roles must be an object');
    }
    const tierData = vscodeSeedRoleData.roleTiers.find((entry) => { return entry.tier === value.tier; });
    if (tierData === undefined) {
      throw new TypeError('VS Code theme input tier must be 4, 8, 16, or 64');
    }
    const keys = Object.keys(value.roles);
    const expectedRoleNames = new Set<string>();
    for (const role of tierData.roleNames) {
      expectedRoleNames.add(role);
    }
    let keysMatch = keys.length === expectedRoleNames.size;
    for (const key of keys) {
      if (!expectedRoleNames.has(key)) { keysMatch = false; }
    }
    if (!keysMatch) {
      throw new TypeError(`VS Code theme input roles must contain exactly the ${tierData.tier}-tier role names`);
    }
    const roles: Record<string, string> = {};
    for (const role of tierData.roleNames) {
      const color = value.roles[role];
      if (typeof color !== 'string' || !VscodeThemeInput.isHex(color)) {
        throw new TypeError(`VS Code theme input role ${role} must be an sRGB #rrggbb color`);
      }
      roles[role] = color;
    }
    return new VscodeStructuredPalette(tierData.tier, framing, roles);
  }
}

class VscodeThemeOutput {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static provenanceRoles(value: unknown, origin: 'derived' | 'stated'): readonly string[] {
    if (!VscodeThemeOutput.isRecord(value)) {
      throw new TypeError('VS Code theme pipeline returned invalid role provenance metadata');
    }
    const roles: string[] = [];
    for (const [roleName, evidence] of Object.entries(value)) {
      if (!VscodeThemeOutput.isRecord(evidence)
        || (evidence.origin !== 'derived' && evidence.origin !== 'stated' && evidence.origin !== 'synthesized')) {
        throw new TypeError('VS Code theme pipeline returned invalid role provenance entry');
      }
      if (evidence.origin === origin) {roles.push(roleName);}
    }
    return roles;
  }

  private static contrast(value: unknown): readonly VscodeContrastEntry[] {
    if (!Array.isArray(value)) {
      throw new TypeError('VS Code theme pipeline returned no contrast report');
    }
    const report: VscodeContrastEntry[] = [];
    for (const entry of value) {
      if (!VscodeThemeOutput.isRecord(entry)) {
        throw new TypeError('VS Code theme pipeline returned an invalid contrast report entry');
      }
      report.push(new VscodeContrastEntry(entry));
    }
    return report;
  }

  private static roleColors(roles: Readonly<Record<string, ColorRecordInterfaceType>>): Readonly<Record<string, string>> {
    const colors: Record<string, string> = {};
    for (const [name, color] of Object.entries(roles)) {
      colors[name] = color.hex;
    }
    return colors;
  }

  static result(palette: VscodeStructuredPalette, state: { readonly 'metadata': Record<string, unknown>; readonly 'outputs': Record<string, unknown>; readonly 'roles': Record<string, ColorRecordInterfaceType> }): VscodeThemeRun {
    const contrastReport = state.metadata['core:contrastReport'];
    const roleProvenance = state.metadata['core:roleProvenance'];
    const emittedTheme = state.outputs['vscode:themeJson'];
    return new VscodeThemeRun(
      palette,
      VscodeThemeOutput.contrast(contrastReport),
      VscodeThemeOutput.provenanceRoles(roleProvenance, 'derived'),
      VscodeThemeOutput.provenanceRoles(roleProvenance, 'stated'),
      VscodeThemeOutput.roleColors(state.roles),
      new VscodeThemeJson(emittedTheme)
    );
  }
}

class VscodeThemePipeline {
  static run(value: unknown): VscodeThemeRun {
    const palette = VscodeThemeInput.parse(value);
    const engine = new Engine();
    for (const task of coreTasks) { engine.tasks.register(task); }
    engine.adopt(contrastPlugin);
    engine.adopt(vscodePlugin);
    engine.pipeline([
      'vscode:seedRoles', 'resolve:roles', 'expand:family', 'vscode:deriveUiRoles', 'enforce:contrast',
      'derive:variant', 'vscode:expandTokens', 'vscode:applyModifiers', 'emit:vscodeSemanticRules',
      'emit:vscodeUiPalette', 'emit:vscodeThemeJson'
    ]);
    const input: InputInterface = {
      'bypass': undefined,
      'colors': [{ 'framing': palette.framing, 'roles': palette.roles, 'tier': palette.tier }],
      'contrast': { 'algorithm': 'wcag21', 'cvdCorrect': undefined, 'extra': undefined, 'level': 'AA' },
      'emit': undefined,
      'maxColors': undefined,
      'metadata': undefined,
      'roles': palette.framing === 'dark' ? VSCODE_ROLE_SCHEMAS_64.dark : VSCODE_ROLE_SCHEMAS_64.light,
      'runtime': { 'colorSpace': 'srgb', 'extra': undefined, 'framing': palette.framing }
    };
    const state = engine.run(input);
    return VscodeThemeOutput.result(palette, state);
  }
}

export const runVscodeTheme = VscodeThemePipeline.run;
