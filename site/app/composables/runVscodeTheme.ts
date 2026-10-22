import type { ColorRecordInterfaceTypeEntity, PaletteStateInterface } from '@studnicky/iridis';

import { ContrastReportEntryInterfaceTypeEntity, coreTasks, Engine, InputInterfaceTypeEntity, Metadata } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { VSCODE_ROLE_SCHEMAS_64, vscodePlugin } from '@studnicky/iridis-vscode';

import { VscodeThemeJsonEntity } from './entities/VscodeThemeJsonEntity.ts';
import { VscodeThemeRequestEntity } from './entities/VscodeThemeRequestEntity.ts';
import { VscodeThemeRuntimeEntity } from './entities/VscodeThemeRuntimeEntity.ts';

class VscodeThemeRun {
  readonly 'contrast': readonly ContrastReportEntryInterfaceTypeEntity.Type[];
  readonly 'palette': VscodeThemeRequestEntity.Type;
  readonly 'provenance': { readonly 'derivedRoles': readonly string[]; readonly 'pinnedRoles': readonly string[]; };
  readonly 'roles': Readonly<Record<string, string>>;
  readonly 'semanticTokenColors': VscodeThemeJsonEntity.Type['semanticTokenColors'];
  readonly 'theme': { readonly 'json': VscodeThemeJsonEntity.Type; };
  readonly 'workbenchColors': VscodeThemeJsonEntity.Type['colors'];

  constructor(
    palette: VscodeThemeRequestEntity.Type,
    contrast: readonly ContrastReportEntryInterfaceTypeEntity.Type[],
    derivedRoles: readonly string[],
    pinnedRoles: readonly string[],
    roles: Readonly<Record<string, string>>,
    themeJson: VscodeThemeJsonEntity.Type
  ) {
    this.contrast = contrast;
    this.palette = palette;
    this.provenance = { 'derivedRoles': derivedRoles, 'pinnedRoles': pinnedRoles };
    this.roles = roles;
    this.semanticTokenColors = themeJson.semanticTokenColors;
    this.theme = { 'json': themeJson };
    this.workbenchColors = themeJson.colors;
  }
}

class VscodeThemeOutput {
  private static roleColors(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>): Readonly<Record<string, string>> {
    const colors: Record<string, string> = {};
    const entries = Object.entries(roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      Object.defineProperty(colors, entry[0], { 'configurable': true, 'enumerable': true, 'value': entry[1].hex, 'writable': true });
    }
    return colors;
  }

  private static provenance(runtime: VscodeThemeRuntimeEntity.Type): { readonly 'derivedRoles': readonly string[]; readonly 'pinnedRoles': readonly string[] } {
    const derivedRoles: string[] = [];
    const pinnedRoles: string[] = [];
    const entries = Object.entries(runtime.roleProvenance);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      if (entry[1].origin === 'derived') {derivedRoles.push(entry[0]);}
      if (entry[1].origin === 'stated') {pinnedRoles.push(entry[0]);}
    }
    return { 'derivedRoles': derivedRoles, 'pinnedRoles': pinnedRoles };
  }

  static contrastPairs(state: PaletteStateInterface): readonly ContrastReportEntryInterfaceTypeEntity.Type[] {
    const report = Metadata.contrastReport(state.metadata);
    if (report !== undefined) {
      const pairs = report.pairs.map((pair) => {
        const entry = ContrastReportEntryInterfaceTypeEntity.intake(pair);
        return entry;
      });
      return pairs;
    }
    throw new RangeError('The pipeline did not write a contrast report.');
  }

  static result(palette: VscodeThemeRequestEntity.Type, state: PaletteStateInterface): VscodeThemeRun {
    const runtime = VscodeThemeRuntimeEntity.intake({
      'roleProvenance': state.metadata['core:roleProvenance'],
      'themeJson': state.outputs['vscode:themeJson']
    });
    const provenance = VscodeThemeOutput.provenance(runtime);
    const result = new VscodeThemeRun(palette, VscodeThemeOutput.contrastPairs(state), provenance.derivedRoles, provenance.pinnedRoles, VscodeThemeOutput.roleColors(state.roles), VscodeThemeJsonEntity.intake(runtime.themeJson));
    return result;
  }
}

class VscodeThemePublicInput {
  readonly framing: string;
  readonly roles: Record<string, string>;
  readonly tier: number;

  constructor(framing: string, roles: Record<string, string>, tier: number) {
    this.framing = framing;
    this.roles = roles;
    this.tier = tier;
  }
}

class VscodeThemePipeline {
  static run(request: VscodeThemePublicInput): VscodeThemeRun {
    const palette = VscodeThemeRequestEntity.intake(request);
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {engine.tasks.register(task);}
    }
    engine.adopt(contrastPlugin);
    engine.adopt(vscodePlugin);
    engine.pipeline([
      'vscode:seedRoles', 'resolve:roles', 'expand:family', 'vscode:deriveUiRoles', 'enforce:contrast',
      'derive:variant', 'vscode:expandTokens', 'vscode:applyModifiers', 'emit:vscodeSemanticRules',
      'emit:vscodeUiPalette', 'emit:vscodeThemeJson'
    ]);
    const input = InputInterfaceTypeEntity.create({
      'colors': [{ 'framing': palette.framing, 'roles': palette.roles, 'tier': palette.tier }],
      'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
      'roles': palette.framing === 'dark' ? VSCODE_ROLE_SCHEMAS_64.dark : VSCODE_ROLE_SCHEMAS_64.light,
      'runtime': { 'colorSpace': 'srgb', 'framing': palette.framing }
    });
    const state = engine.run(input);
    const result = VscodeThemeOutput.result(palette, state);
    return result;
  }
}

export const runVscodeTheme = VscodeThemePipeline.run;
