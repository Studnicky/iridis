import { contrastWcag21, InputInterfaceTypeEntity } from '@studnicky/iridis';
import {
  ComplianceReportInterfaceTypeEntity,
  contrastPlugin,
  CvdResultSetInterfaceTypeEntity
} from '@studnicky/iridis-contrast';
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
  assert.strictEqual(
    contrastPlugin.name,
    'contrast',
    'plugin singleton has the canonical name'
  );
  assert.strictEqual(
    contrastPlugin.version,
    '0.1.0',
    'plugin singleton has a stable version'
  );
  assert.deepStrictEqual(
    names,
    ['enforce:compliance', 'report:compliance'],
    'plugin task order is stable'
  );
  const metadata = contrastPlugin.schemas().metadata;
  assert.ok(
    metadata !== undefined,
    'contrast plugin metadata schema contribution present'
  );
  assert.deepStrictEqual(Object.keys(metadata), [
    'contrast:complianceReport',
    'contrast:cvd'
  ]);
});

await test('ContrastPlugin compiles metadata schemas and rejects incomplete reports', () => {
  assert.doesNotThrow(
    () => { const result = ComplianceTestEngine.create(); return result; },
    'plugin metadata schemas compile during adoption'
  );
  assert.throws(
    () => {
      const result = ComplianceReportInterfaceTypeEntity.intake({
        'blockedPairs': [],
        'compliant': true,
        'cvdCompliant': true,
        'pairs': []
      });
      return result;
    },
    Error,
    'terminal compliance reports require the selected standard'
  );
  assert.throws(
    () => {
      const result = CvdResultSetInterfaceTypeEntity.intake({
        'blocked': [],
        'corrections': []
      });
      return result;
    },
    Error,
    'CVD metadata requires warnings'
  );
});

await test('canonical compliance emits an admissible zero-pair report', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance'
  ]);
  const state = engine.run(
    InputInterfaceTypeEntity.intake({
      'colors': ['#000000', '#ffffff'],
      'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'enforce', 'level': 'AA' },
      'roles': {
        'contrastPairs': [],
        'name': 'zero-pair-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'text',
            'lightnessRange': [0, 0.2],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'background',
            'lightnessRange': [0.8, 1],
            'name': 'background',
            'required': true
          }
        ]
      }
    })
  );
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(
    rawReport !== undefined,
    'terminal report exists without declared pairs'
  );
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  assert.strictEqual(
    report.compliant,
    true,
    'zero declared pairs are compliant'
  );
  assert.strictEqual(
    report.cvdCompliant,
    true,
    'zero declared pairs are CVD-compliant'
  );
  assert.deepStrictEqual(
    report.pairs,
    [],
    'zero declared pairs produce no pair observations'
  );
  assert.deepStrictEqual(
    report.blockedPairs,
    [],
    'zero declared pairs produce no blockers'
  );
});

await test('canonical compliance records an already compliant pair as not-needed', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance'
  ]);
  const state = engine.run(
    InputInterfaceTypeEntity.intake({
      'colors': ['#000000', '#ffffff'],
      'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'enforce', 'level': 'AA' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'not-needed-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'text',
            'lightnessRange': [0, 0.1],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'background',
            'lightnessRange': [0.9, 1],
            'name': 'background',
            'required': true
          }
        ]
      }
    })
  );
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists');
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(
    pair.disposition,
    'not-needed',
    'compliant pair keeps its original role values'
  );
  assert.strictEqual(
    pair.adjustedRole,
    undefined,
    'compliant pair has no adjusted role'
  );
  assert.strictEqual(
    pair.passed,
    true,
    'compliant pair is reported as passing'
  );
});

await test('canonical compliance corrects a failing AAA pair to seven to one', () => {
  const input = InputInterfaceTypeEntity.intake({
    'colors': ['#777777', '#ffffff'],
    'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'enforce', 'level': 'AAA' },
    'roles': {
      'contrastPairs': [
        {
          'background': 'background',
          'foreground': 'text',
          'minimumContrastRatio': 4.5
        }
      ],
      'name': 'aaa-correction-e2e',
      'roles': [
        {
          'chromaRange': [0, 0.05],
          'intent': 'text',
          'lightnessRange': [0.1, 0.7],
          'name': 'text',
          'required': true
        },
        {
          'chromaRange': [0, 0.05],
          'intent': 'background',
          'lightnessRange': [0.9, 1],
          'name': 'background',
          'required': true
        }
      ]
    }
  });
  const previewEngine = ComplianceTestEngine.create();
  previewEngine.pipeline(['intake:hex', 'resolve:roles', 'expand:family']);
  const preview = previewEngine.run(input);
  const initialText = preview.roles.text;
  const initialBackground = preview.roles.background;
  assert.ok(initialText !== undefined && initialBackground !== undefined, 'unadjusted roles exist');
  const initialContrast = contrastWcag21.apply(initialText, initialBackground);
  assert.ok(initialContrast < 7, 'fixture starts below the AAA target');
  const engine = ComplianceTestEngine.create();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance'
  ]);
  const state = engine.run(input);
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists');
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(pair.requiredTrichromat, 7, 'AAA maps a declared text pair to seven to one');
  assert.ok(pair.actualTrichromat >= 7, 'terminal AAA contrast meets seven to one');
  assert.strictEqual(pair.passed, true, 'terminal AAA pair passes');
});

await test('canonical compliance solves a non-background APCA pair at Lc sixty', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline([
    'intake:hex',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'derive:variant',
    'report:compliance'
  ]);
  const state = engine.run(
    InputInterfaceTypeEntity.intake({
      'colors': ['#777777', '#ffffff'],
      'contrast': { 'algorithm': 'apca', 'cvdMode': 'enforce', 'level': 'Lc' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'surface',
            'foreground': 'link',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'apca-sixty-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'link',
            'lightnessRange': [0.1, 0.7],
            'name': 'link',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'muted',
            'lightnessRange': [0.9, 1],
            'name': 'surface',
            'required': true
          }
        ]
      }
    })
  );
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists');
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(
    report.selected.level,
    'APCA-Lc-60',
    'non-background pair uses the conservative Lc sixty target'
  );
  assert.strictEqual(
    pair.requiredTrichromat,
    60,
    'terminal APCA target is Lc sixty'
  );
  assert.ok(
    pair.actualTrichromat >= 60,
    'terminal APCA contrast meets Lc sixty'
  );
  assert.strictEqual(pair.passed, true, 'terminal APCA pair passes');
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
  const state = engine.run(
    InputInterfaceTypeEntity.intake({
      'colors': ['#aaaaaa', '#ffffff'],
      'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'enforce', 'level': 'AA' },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'compliance-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'text',
            'lightnessRange': [0.2, 0.9],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'background',
            'lightnessRange': [0.9, 1],
            'name': 'background',
            'required': true
          }
        ]
      }
    })
  );
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'contrast plugin terminal report present');
  const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
  assert.strictEqual(report.compliant, true, 'terminal rendered roles comply');
  assert.strictEqual(
    report.cvdCompliant,
    true,
    'terminal rendered roles are CVD-compliant'
  );
  assert.deepStrictEqual(
    report.selected,
    { 'algorithm': 'wcag21', 'level': 'AA' },
    'selected target retained'
  );
  assert.strictEqual(
    report.blockedPairs.length,
    0,
    'no terminal pair is blocked'
  );
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair reported once');
  assert.ok(
    pair.actualTrichromat >= pair.requiredTrichromat,
    'terminal measurement meets selected minimum'
  );
  assert.deepStrictEqual(pair.cvd, [], 'no CVD deficiency remains');
});

await test('canonical compliance applies AAA and APCA targets to every declared pair', () => {
  const selections = [
    {
      'algorithm': 'wcag21',
      'expectedLevel': 'AAA',
      'expectedMinimum': 7,
      'level': 'AAA'
    },
    {
      'algorithm': 'apca',
      'expectedLevel': 'APCA-Lc-75',
      'expectedMinimum': 75,
      'level': 'Lc'
    }
  ];
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    if (selection === undefined) {
      continue;
    }
    const engine = ComplianceTestEngine.create();
    engine.pipeline([
      'intake:hex',
      'resolve:roles',
      'expand:family',
      'enforce:compliance',
      'derive:variant',
      'report:compliance'
    ]);
    const state = engine.run(
      InputInterfaceTypeEntity.intake({
        'colors': ['#000000', '#ffffff'],
        'contrast': {
          'algorithm': selection.algorithm,
          'cvdMode': 'enforce',
          'level': selection.level
        },
        'roles': {
          'contrastPairs': [
            {
              'background': 'background',
              'foreground': 'text',
              'minimumContrastRatio': 4.5
            }
          ],
          'name': 'selected-standard-e2e',
          'roles': [
            {
              'chromaRange': [0, 0.05],
              'intent': 'text',
              'lightnessRange': [0, 0.3],
              'name': 'text',
              'required': true
            },
            {
              'chromaRange': [0, 0.05],
              'intent': 'background',
              'lightnessRange': [0.9, 1],
              'name': 'background',
              'required': true
            }
          ]
        }
      })
    );
    const rawReport = state.metadata['contrast:complianceReport'];
    assert.ok(rawReport !== undefined, 'terminal report present');
    const report = ComplianceReportInterfaceTypeEntity.intake(rawReport);
    const pair = report.pairs.at(0);
    assert.ok(pair !== undefined, 'declared pair reported');
    assert.strictEqual(
      report.selected.algorithm,
      selection.algorithm,
      'selected algorithm retained'
    );
    assert.strictEqual(
      report.selected.level,
      selection.expectedLevel,
      'selected target retained'
    );
    assert.strictEqual(
      pair.requiredTrichromat,
      selection.expectedMinimum,
      'selected target controls the requirement'
    );
    assert.ok(
      pair.actualTrichromat >= pair.requiredTrichromat,
      'terminal pair meets the selected requirement'
    );
    assert.strictEqual(
      report.compliant,
      true,
      'selected-standard terminal report is compliant'
    );
    assert.strictEqual(
      report.cvdCompliant,
      true,
      'CVD uses ratio-unit thresholds alongside the selected standard'
    );
    assert.deepStrictEqual(
      pair.cvd,
      [],
      'selected-standard terminal pair has no CVD deficiency'
    );
  }
});

await CvdProbeScenarioSuite.run();
