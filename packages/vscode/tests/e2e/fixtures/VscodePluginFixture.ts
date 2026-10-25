import type { PaletteStateInterface, RoleSchemaEntity, RuntimeOptionsEntity } from '@studnicky/iridis';

import { InputEntity } from '@studnicky/iridis';
import { vscodePlugin } from '@studnicky/iridis-vscode';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';

import { VSCODE_ROLE_SCHEMAS_16 } from '../../../src/index.ts';

/** Shared admitted inputs and engine execution for VS Code plugin scenarios. */
export class VscodePluginFixture {
  static readonly pipelineAny = [
    'intake:any',
    'resolve:roles',
    'expand:family',
    'vscode:deriveUiRoles',
    'enforce:contrast',
    'derive:variant',
    'vscode:expandTokens',
    'vscode:applyModifiers',
    'emit:vscodeSemanticRules',
    'emit:vscodeUiPalette',
    'emit:vscodeThemeJson'
  ];
  static readonly pipelineHex = [
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'vscode:deriveUiRoles',
    'enforce:contrast',
    'derive:variant',
    'vscode:expandTokens',
    'vscode:applyModifiers',
    'emit:vscodeSemanticRules',
    'emit:vscodeUiPalette',
    'emit:vscodeThemeJson'
  ];
  static readonly seedsSrgb = [
    '#0d1117', '#e6edf3', '#161b22', '#7d8590',
    '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
    '#fb7185', '#fbbf24', '#f59e0b', '#737373',
    '#ef4444', '#facc15', '#3b82f6', '#10b981'
  ];
  static readonly seedsWithP3 = [
    '#0d1117', '#e6edf3', '#161b22', '#7d8590',
    'color(display-p3 0.70 0.40 1.00)',
    '#e11d48', '#22d3ee', '#34d399',
    '#e11d48', '#fbbf24', '#f59e0b', '#737373',
    '#ef4444', '#facc15', '#3b82f6', '#10b981'
  ];

  static engine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(vscodePlugin);
    return engine;
  }

  static get<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
    if (!Object.hasOwn(record, key)) {
      return undefined;
    }
    const result = record[key];
    return result;
  }

  static runFull(seeds: readonly string[], pipeline: readonly string[] = VscodePluginFixture.pipelineHex): PaletteStateInterface {
    const engine = VscodePluginFixture.engine();
    engine.pipeline(pipeline);
    const result = engine.run(InputEntity.create({ 'colors': [...seeds], 'roles': VSCODE_ROLE_SCHEMAS_16.dark }));
    return result;
  }

  static runFullWithOptions(seeds: readonly string[], options?: { readonly 'pipeline'?: readonly string[]; readonly 'roles'?: RoleSchemaEntity.Type; readonly 'runtime'?: RuntimeOptionsEntity.Type; }): PaletteStateInterface {
    const engine = VscodePluginFixture.engine();
    engine.pipeline(options?.pipeline ?? VscodePluginFixture.pipelineHex);
    const input = InputEntity.create({
      'colors': [...seeds],
      'roles': options?.roles ?? VSCODE_ROLE_SCHEMAS_16.dark,
      ...(options?.runtime === undefined ? {} : { 'runtime': options.runtime })
    });
    const result = engine.run(input);
    return result;
  }
}
