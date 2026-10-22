import { type ColorRecordInterfaceTypeEntity, CssVarName, type PaletteStateInterface } from '@studnicky/iridis';
import { CapacitorOutputsEntity } from '@studnicky/iridis-capacitor';
import { Cli, ConfigLoader } from '@studnicky/iridis-cli';
import { ComplianceReportInterfaceTypeEntity, CvdResultSetInterfaceTypeEntity } from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { contrastWcag21 } from '@studnicky/iridis/math';
import { coreTasks } from '@studnicky/iridis/tasks';
import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

class VueCapacitorTestFixture {
  static configurationPath(): string {
    const result = fileURLToPath(new URL(
      '../../../../site/app/examples/vueCapacitor/category-w3c.config.json',
      import.meta.url
    ));
    return result;
  }

  static async buildEngine(): Promise<Engine> {
    const { contrastPlugin } = await import('@studnicky/iridis-contrast');
    const { stylesheetPlugin } = await import('@studnicky/iridis-stylesheet');
    const { capacitorPlugin } = await import('@studnicky/iridis-capacitor');
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(capacitorPlugin);
    return engine;
  }

  static requireRole(state: PaletteStateInterface, name: string): ColorRecordInterfaceTypeEntity.Type {
    const role = state.roles[name];
    if (role === undefined) {
      throw new Error(`Expected resolved role ${name}.`);
    }
    return role;
  }

  static async runPipeline(pipeline: readonly string[] | undefined = undefined): Promise<PaletteStateInterface> {
    const config = await new ConfigLoader().load(VueCapacitorTestFixture.configurationPath());
    const engine = await VueCapacitorTestFixture.buildEngine();
    engine.pipeline([...(pipeline ?? config.pipeline)]);
    const result = engine.run(config.input);
    return result;
  }

  static async readConfiguration(): Promise<JsonObject> {
    const raw = await readFile(VueCapacitorTestFixture.configurationPath(), 'utf8');
    const document = JsonValue.from(JSON.parse(raw));
    if (!JsonObject.is(document)) {
      throw new TypeError('The Vue Capacitor configuration must be a JSON object.');
    }
    return document;
  }

  static misorderedPipeline(pipeline: readonly string[]): string[] {
    const result = [...pipeline];
    const resolveIndex = result.indexOf('resolve:roles');
    const expandIndex = result.indexOf('expand:family');
    if (resolveIndex < 0 || expandIndex < 0) {
      throw new Error('Canonical pipeline must contain resolve:roles and expand:family.');
    }
    result[resolveIndex] = 'expand:family';
    result[expandIndex] = 'resolve:roles';
    return result;
  }
}

await test('Vue Capacitor example admits canonical configuration and contrast metadata', async () => {
  const config = await new ConfigLoader().load(VueCapacitorTestFixture.configurationPath());
  const roles = config.input.roles;
  const wcagPairs = roles?.contrastPairs;
  if (wcagPairs === undefined) {
    throw new Error('The Vue Capacitor configuration must declare role contrast pairs.');
  }
  assert.equal(wcagPairs.length, 4);
  const state = await VueCapacitorTestFixture.runPipeline();
  const compliance = ComplianceReportInterfaceTypeEntity.intake(state.metadata['contrast:complianceReport']);
  const cvd = CvdResultSetInterfaceTypeEntity.intake(state.metadata['contrast:cvd']);
  assert.equal(compliance.compliant, true);
  assert.equal(compliance.cvdCompliant, true);
  assert.equal(compliance.pairs.length > 0, true);
  assert.equal(cvd.warnings.length, 0);
  const correctionsAreComplete = cvd.corrections.every((correction) => {
    const isComplete = correction.cvdTypesRemaining.length === 0;
    return isComplete;
  });
  assert.equal(correctionsAreComplete, true);
  for (let index = 0; index < wcagPairs.length; index += 1) {
    const pair = wcagPairs[index];
    if (pair?.minimumContrastRatio === undefined) {
      throw new Error('Every WCAG pair must declare a minimum contrast ratio.');
    }
    const ratio = contrastWcag21.apply(
      VueCapacitorTestFixture.requireRole(state, pair.foreground),
      VueCapacitorTestFixture.requireRole(state, pair.background)
    );
    assert.ok(ratio >= pair.minimumContrastRatio);
  }
});

await test('Vue Capacitor pipeline ordering determines onAccent derivation', async () => {
  const config = await new ConfigLoader().load(VueCapacitorTestFixture.configurationPath());
  const ordered = await VueCapacitorTestFixture.runPipeline(config.pipeline);
  assert.ok(Object.hasOwn(ordered.roles, 'onAccent'));
  const misordered = VueCapacitorTestFixture.misorderedPipeline(config.pipeline);
  const unordered = await VueCapacitorTestFixture.runPipeline(misordered);
  assert.equal(Object.hasOwn(unordered.roles, 'onAccent'), false);
});

await test('Vue Capacitor derives a stable high-contrast onAccent role', async () => {
  const first = await VueCapacitorTestFixture.runPipeline();
  const second = await VueCapacitorTestFixture.runPipeline();
  const onAccent = VueCapacitorTestFixture.requireRole(first, 'onAccent');
  const accent = VueCapacitorTestFixture.requireRole(first, 'accent');
  const repeated = VueCapacitorTestFixture.requireRole(second, 'onAccent');
  assert.equal(onAccent.hex.length, 7);
  assert.ok(onAccent.oklch.l >= 0.98);
  assert.ok(contrastWcag21.apply(onAccent, accent) >= 7);
  assert.equal(onAccent.hex, repeated.hex);
});

await test('Vue Capacitor emits admitted status-bar and theme output slots', async () => {
  const state = await VueCapacitorTestFixture.runPipeline();
  const statusBar = state.outputs['capacitor:statusBar'];
  const theme = state.outputs['capacitor:theme'];
  if (statusBar === undefined || theme === undefined) {
    throw new Error('Capacitor output slots must be present.');
  }
  const outputs = CapacitorOutputsEntity.intake({ 'statusBar': statusBar, 'theme': theme });
  if (outputs.statusBar === undefined || outputs.theme === undefined) {
    throw new Error('Admitted Capacitor outputs must include status-bar and theme data.');
  }
  assert.ok(outputs.statusBar.style === 'DARK' || outputs.statusBar.style === 'LIGHT');
  assert.equal(Object.keys(outputs.theme).length, 13);
  assert.equal(outputs.theme.primary.length, 7);
});

await test('Vue Capacitor emits CSS root, dark-scheme, forced-colors, and role variables', async () => {
  const state = await VueCapacitorTestFixture.runPipeline();
  const output = state.outputs['stylesheet:cssVars'];
  if (!JsonObject.is(output)) {
    throw new Error('The CSS-vars output must be an object.');
  }
  const full = output.full;
  const root = output.rootBlock;
  if (typeof full !== 'string' || typeof root !== 'string') {
    throw new Error('The CSS-vars output must expose full and rootBlock strings.');
  }
  assert.ok(full.includes(':root'));
  assert.ok(full.includes('prefers-color-scheme: dark'));
  assert.ok(full.includes('forced-colors: active'));
  const roles = state.input.roles;
  if (roles === undefined) {
    throw new Error('The canonical input must declare roles.');
  }
  for (let index = 0; index < roles.roles.length; index += 1) {
    const role = roles.roles[index];
    if (role === undefined) {
      throw new Error('The role schema contains an undefined role.');
    }
    assert.ok(root.includes(CssVarName.from(role.name, '--c-')));
  }
});

await test('Vue Capacitor CLI accepts declared output slots and rejects an undeclared one', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'iridis-vc-e2e-'));
  try {
    const source = await VueCapacitorTestFixture.readConfiguration();
    const acceptedDocument = {
      ...source,
      'output': {
        'directory': join(directory, 'accepted'),
        'files': {
          'capacitor:statusBar': 'music-statusbar.json',
          'capacitor:theme': 'music-theme.json',
          'stylesheet:cssVars': 'music.css'
        }
      }
    };
    const acceptedPath = join(directory, 'accepted.config.json');
    await writeFile(acceptedPath, JSON.stringify(acceptedDocument, null, 2), 'utf8');
    await new Cli().run(acceptedPath);
    const rejectedDocument = {
      ...source,
      'output': {
        'directory': join(directory, 'rejected'),
        'files': { 'ghost:slot': 'missing.json' }
      }
    };
    const rejectedPath = join(directory, 'rejected.config.json');
    await writeFile(rejectedPath, JSON.stringify(rejectedDocument, null, 2), 'utf8');
    await assert.rejects(new Cli().run(rejectedPath), (error: Error) => {
      const isExpected = error.message.includes('Config error') && error.message.includes('ghost:slot');
      return isExpected;
    });
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});
