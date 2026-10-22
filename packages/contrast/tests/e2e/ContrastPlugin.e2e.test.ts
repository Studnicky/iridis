import { InputInterfaceTypeEntity } from '@studnicky/iridis';
import { ComplianceReportInterfaceTypeEntity, contrastPlugin } from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CvdProbeScenarioSuite } from './fixtures/cvd/CvdProbeScenarioSuite.ts';

class ComplianceTestEngine {
  static create(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(contrastPlugin);
    return engine;
  }
}

await test('ContrastPlugin registers only the canonical compliance stages', () => {
  const names = contrastPlugin.tasks().map((task) => {
    const result = task.name;
    return result;
  });
  assert.deepStrictEqual(names, ['enforce:compliance', 'report:compliance']);
  const metadata = contrastPlugin.schemas().metadata;
  assert.ok(metadata !== undefined, 'contrast plugin metadata schema contribution present');
  assert.deepStrictEqual(Object.keys(metadata), ['contrast:complianceReport', 'contrast:cvd']);
});

await test('canonical compliance preserves its terminal report through variant derivation', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance'
  ]);
  const state = engine.run(InputInterfaceTypeEntity.intake({
    'colors': ['#aaaaaa', '#ffffff'],
    'contrast': { 'algorithm': 'wcag21', 'cvdCorrect': true, 'level': 'AA' },
    'roles': {
      'contrastPairs': [{ 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 4.5 }],
      'name': 'compliance-e2e',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'text', 'lightnessRange': [0.2, 0.9], 'name': 'text', 'required': true },
        { 'chromaRange': [0, 0.05], 'intent': 'background', 'lightnessRange': [0.9, 1], 'name': 'background', 'required': true }
      ]
    }
  }));
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'contrast plugin terminal report present');
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  assert.strictEqual(report.compliant, true, 'terminal rendered roles comply');
  assert.strictEqual(report.cvdCompliant, true, 'terminal rendered roles are CVD-compliant');
  assert.deepStrictEqual(report.selected, { 'algorithm': 'wcag21', 'level': 'AA' }, 'selected target retained');
  assert.strictEqual(report.blockedPairs.length, 0, 'no terminal pair is blocked');
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair reported once');
  assert.ok(pair.actualTrichromat >= pair.requiredTrichromat, 'terminal measurement meets selected minimum');
  assert.deepStrictEqual(pair.cvd, [], 'no CVD deficiency remains');
});

await CvdProbeScenarioSuite.run();
