import {
  InputInterfaceTypeEntity,
  RoleDefinitionInterfaceTypeEntity,
  RoleSchemaInterfaceTypeEntity
} from '@studnicky/iridis';
import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';

import { ShadcnThemeScenarioOutputEntity } from '../../../entities/ShadcnThemeScenarioOutputEntity.ts';

/** Shared canonical inputs and real-engine port for Shadcn end-to-end scenarios. */
export class ShadcnPluginScenarioFixture {
  static readonly fullCoverageRoleNames = [
    'accent-alt', 'brand', 'text', 'background', 'border', 'surface',
    'error', 'bg-soft', 'text-subtle', 'on-brand', 'focus-ring'
  ] as const;

  static readonly fullCoverageExpectedColors: Readonly<Record<string, string>> = {
    '--accent':                 '#b1667e',
    '--accent-foreground':      '#ac713e',
    '--background':             '#977d30',
    '--border':                 '#798940',
    '--card':                   '#519160',
    '--card-foreground':        '#ac713e',
    '--destructive':            '#239382',
    '--destructive-foreground': '#ac713e',
    '--foreground':             '#ac713e',
    '--input':                  '#798940',
    '--muted':                  '#1590a1',
    '--muted-foreground':       '#4188b6',
    '--popover':                '#519160',
    '--popover-foreground':     '#ac713e',
    '--primary':                '#b4685c',
    '--primary-foreground':     '#697dbc',
    '--ring':                   '#8972b3',
    '--secondary':              '#b1667e',
    '--secondary-foreground':   '#ac713e'
  };

  static readonly fullCoverageExpectedCssVars = `:root {
  --accent: 0.6000 0.1000 0.00;
  --accent-foreground: 0.6000 0.1000 60.00;
  --background: 0.6000 0.1000 90.00;
  --border: 0.6000 0.1000 120.00;
  --card: 0.6000 0.1000 150.00;
  --card-foreground: 0.6000 0.1000 60.00;
  --destructive: 0.6000 0.1000 180.00;
  --destructive-foreground: 0.6000 0.1000 60.00;
  --foreground: 0.6000 0.1000 60.00;
  --input: 0.6000 0.1000 120.00;
  --muted: 0.6000 0.1000 210.00;
  --muted-foreground: 0.6000 0.1000 240.00;
  --popover: 0.6000 0.1000 150.00;
  --popover-foreground: 0.6000 0.1000 60.00;
  --primary: 0.6000 0.1000 30.00;
  --primary-foreground: 0.6000 0.1000 270.00;
  --ring: 0.6000 0.1000 300.00;
  --secondary: 0.6000 0.1000 0.00;
  --secondary-foreground: 0.6000 0.1000 60.00;
}`;

  static readonly partialExpectedColors: Readonly<Record<string, string>> = {
    '--accent-foreground':      '#239382',
    '--background':             '#b1667e',
    '--card':                   '#b1667e',
    '--card-foreground':        '#239382',
    '--destructive-foreground': '#239382',
    '--foreground':             '#239382',
    '--muted':                  '#b1667e',
    '--muted-foreground':       '#239382',
    '--popover':                '#b1667e',
    '--popover-foreground':     '#239382',
    '--primary-foreground':     '#239382',
    '--secondary-foreground':   '#239382'
  };

  static readonly partialOmittedVars = [
    '--accent', '--border', '--destructive', '--input', '--primary', '--ring', '--secondary'
  ] as const;

  static readonly roleCoverageExpectedHex: Readonly<Record<string, string>> = {
    'accent-alt':  '#b1667e',
    'background':  '#977d30',
    'bg-soft':     '#1590a1',
    'border':      '#798940',
    'brand':       '#b4685c',
    'error':       '#239382',
    'focus-ring':  '#8972b3',
    'on-brand':    '#697dbc',
    'surface':     '#519160',
    'text':        '#ac713e',
    'text-subtle': '#4188b6'
  };

  static freshEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let index = 0; index < taskCount; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(shadcnPlugin);
    return engine;
  }

  static oklchPipeline(): readonly string[] {
    const result = ['intake:oklch', 'resolve:roles', 'emit:shadcnTheme'];
    return result;
  }

  static hexPipeline(): readonly string[] {
    const result = ['intake:hex', 'resolve:roles', 'emit:shadcnTheme'];
    return result;
  }

  static fullCoverageRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const roles: RoleDefinitionInterfaceTypeEntity.Type[] = [];
    const nameCount = ShadcnPluginScenarioFixture.fullCoverageRoleNames.length;
    for (let index = 0; index < nameCount; index += 1) {
      const name = ShadcnPluginScenarioFixture.fullCoverageRoleNames[index];
      if (name !== undefined) {
        roles.push(ShadcnPluginScenarioFixture.requiredRole(name, index * 30));
      }
    }
    const result = ShadcnPluginScenarioFixture.schema('full-coverage', roles);
    return result;
  }

  static fullCoverageColors(): InputInterfaceTypeEntity.Type['colors'] {
    const colors: InputInterfaceTypeEntity.Type['colors'] = [];
    const nameCount = ShadcnPluginScenarioFixture.fullCoverageRoleNames.length;
    for (let index = 0; index < nameCount; index += 1) {
      colors.push({ 'c': 0.10, 'h': index * 30, 'l': 0.60 });
    }
    return colors;
  }

  static partialRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = ShadcnPluginScenarioFixture.schema('partial', [
      ShadcnPluginScenarioFixture.requiredRole('background', 0),
      ShadcnPluginScenarioFixture.requiredRole('text', 180)
    ]);
    return result;
  }

  static partialColors(): InputInterfaceTypeEntity.Type['colors'] {
    const result = [
      { 'c': 0.10, 'h': 0, 'l': 0.60 },
      { 'c': 0.10, 'h': 180, 'l': 0.60 }
    ];
    return result;
  }

  static irrelevantRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = ShadcnPluginScenarioFixture.schema('irrelevant', [
      RoleDefinitionInterfaceTypeEntity.create({ 'name': 'irrelevant' })
    ]);
    return result;
  }

  static run(
    colors: InputInterfaceTypeEntity.Type['colors'],
    pipeline: readonly string[],
    roles: RoleSchemaInterfaceTypeEntity.Type | undefined
  ): ShadcnThemeScenarioOutputEntity.Type {
    const engine = ShadcnPluginScenarioFixture.freshEngine();
    engine.pipeline(pipeline);
    const state = engine.run(InputInterfaceTypeEntity.create({
      'colors': colors,
      ...(roles === undefined ? {} : { 'roles': roles })
    }));
    const theme = state.outputs['shadcn:theme'];
    assert.ok(theme !== undefined, 'outputs.shadcn:theme must be present');
    const result = ShadcnThemeScenarioOutputEntity.intake(theme);
    return result;
  }

  private static requiredRole(name: string, hueOffset: number): RoleDefinitionInterfaceTypeEntity.Type {
    const result = RoleDefinitionInterfaceTypeEntity.create({ 'hueOffset': hueOffset, 'name': name, 'required': true });
    return result;
  }

  private static schema(
    name: string,
    roles: RoleDefinitionInterfaceTypeEntity.Type[]
  ): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.create({ 'name': name, 'roles': roles });
    return result;
  }
}
