import { contrastWcag21, InputEntity } from '@studnicky/iridis';
import {
  ComplianceReportEntity,
  contrastPlugin,
  CvdResultSetEntity
} from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CvdProbeScenarioSuite } from './fixtures/cvd/CvdProbeScenarioSuite.ts';

class StrictComplianceScenario {
  static bestEffortInput() {
    const result = InputEntity.intake({
      'colors': ['#777777', '#ffffff'],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdMode': 'warn',
        'enableStrictCompliance': false,
        'level': 'AA'
      },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'strict-compliance-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'text',
            'lightnessRange': [0.45, 0.46],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'background',
            'lightnessRange': [0.5, 0.51],
            'name': 'background',
            'required': true
          }
        ]
      }
    });
    return result;
  }

  static strictInput() {
    const result = InputEntity.intake({
      'colors': ['#777777', '#ffffff'],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdMode': 'warn',
        'enableStrictCompliance': true,
        'level': 'AA'
      },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'strict-compliance-e2e',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'intent': 'text',
            'lightnessRange': [0.45, 0.46],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'intent': 'background',
            'lightnessRange': [0.5, 0.51],
            'name': 'background',
            'required': true
          }
        ]
      }
    });
    return result;
  }

  static pipeline(): readonly string[] {
    const result = [
      'intake:hex',
      'resolve:roles',
      'expand:family',
      'enforce:compliance',
      'derive:variant',
      'report:compliance',
      'withhold:compliance'
    ];
    return result;
  }
}

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
    ['enforce:compliance', 'report:compliance', 'withhold:compliance'],
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
      const result = ComplianceReportEntity.intake({
        'compliant': true,
        'pairs': [],
        'problemPairs': [],
        'selected': { 'algorithm': 'wcag21', 'level': 'AA' }
      });
      return result;
    },
    Error,
    'terminal compliance reports require the selected standard'
  );
  assert.throws(
    () => {
      const result = CvdResultSetEntity.intake({
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
    InputEntity.intake({
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
  const report = ComplianceReportEntity.intake(rawReport);
  assert.strictEqual(
    report.compliant,
    true,
    'zero declared pairs are compliant'
  );
  assert.strictEqual(report.disposition, 'resolved', 'zero declared pairs resolve the report');
  assert.deepStrictEqual(
    report.pairs,
    [],
    'zero declared pairs produce no pair observations'
  );
  assert.deepStrictEqual(
    report.problemPairs,
    [],
    'zero declared pairs produce no blockers'
  );
});

await test('canonical compliance records an already compliant pair as resolved', () => {
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
    InputEntity.intake({
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
  const report = ComplianceReportEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(report.disposition, 'resolved', 'compliant report is resolved');
  assert.deepStrictEqual(pair.constraints, [], 'compliant pair has no constraints');
  assert.deepStrictEqual(
    pair.adjustedRoles,
    [],
    'compliant pair has no adjusted roles'
  );
  assert.strictEqual(
    pair.passed,
    true,
    'compliant pair is reported as passing'
  );
  assert.strictEqual(pair.proof, undefined, 'passing pair omits feasibility proof');
});

await test('canonical compliance corrects a failing AAA pair to seven to one', () => {
  const input = InputEntity.intake({
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
  const report = ComplianceReportEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(pair.required, 7, 'AAA maps a declared text pair to seven to one');
  assert.ok(pair.actual >= 7, 'terminal AAA contrast meets seven to one');
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
    InputEntity.intake({
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
  const report = ComplianceReportEntity.intake(rawReport);
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair is observed');
  assert.strictEqual(
    report.selected.level,
    'APCA-Lc-60',
    'non-background pair uses the conservative Lc sixty target'
  );
  assert.strictEqual(
    pair.required,
    60,
    'terminal APCA target is Lc sixty'
  );
  assert.ok(
    pair.actual >= 60,
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
    InputEntity.intake({
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
  const report = ComplianceReportEntity.intake(rawReport);
  assert.strictEqual(report.compliant, true, 'terminal rendered roles comply');
  assert.strictEqual(report.disposition, 'resolved', 'terminal rendered roles resolve the report');
  assert.deepStrictEqual(
    report.selected,
    { 'algorithm': 'wcag21', 'level': 'AA' },
    'selected target retained'
  );
  assert.strictEqual(
    report.problemPairs.length,
    0,
    'no terminal pair is blocked'
  );
  const pair = report.pairs.at(0);
  assert.ok(pair !== undefined, 'declared pair reported once');
  assert.ok(
    pair.actual >= pair.required,
    'terminal measurement meets selected minimum'
  );
  assert.deepStrictEqual(pair.constraints, [], 'no terminal constraint remains');
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
      InputEntity.intake({
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
    const report = ComplianceReportEntity.intake(rawReport);
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
      pair.required,
      selection.expectedMinimum,
      'selected target controls the requirement'
    );
    assert.ok(
      pair.actual >= pair.required,
      'terminal pair meets the selected requirement'
    );
    assert.strictEqual(
      report.compliant,
      true,
      'selected-standard terminal report is compliant'
    );
    assert.strictEqual(report.disposition, 'resolved', 'selected-standard report resolves');
    assert.deepStrictEqual(pair.constraints, [], 'selected-standard pair has no terminal constraint');
  }
});

await test('strict false keeps the best-effort palette and terminal evidence', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline(StrictComplianceScenario.pipeline());
  const state = engine.run(StrictComplianceScenario.bestEffortInput());
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists');
  const report = ComplianceReportEntity.intake(rawReport);
  assert.strictEqual(report.compliant, false, 'infeasible range-bounded pair remains noncompliant');
  assert.strictEqual(report.disposition, 'best-effort', 'best-effort mode keeps its palette');
  assert.strictEqual(report.problemPairs.length, 1, 'terminal evidence retains the failing pair');
  assert.ok(Object.keys(state.roles).length > 0, 'best-effort roles remain available');
  assert.ok(Object.keys(state.variants).length > 0, 'best-effort variants remain available');
});

await test('terminal problem pairs carry an exact feasibility proof when schema hues are fixed', () => {
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
    InputEntity.intake({
      'colors': ['#777777', '#ffffff'],
      'contrast': { 'algorithm': 'wcag21', 'cvdMode': 'warn', 'level': 'AA' },
      'roles': {
        'contrastPairs': [{
          'background': 'background',
          'foreground': 'text',
          'minimumContrastRatio': 4.5
        }],
        'name': 'fixed-hue-feasibility-proof',
        'roles': [
          {
            'chromaRange': [0, 0.05],
            'hue': 120,
            'intent': 'text',
            'lightnessRange': [0.45, 0.46],
            'name': 'text',
            'required': true
          },
          {
            'chromaRange': [0, 0.05],
            'hue': 120,
            'intent': 'background',
            'lightnessRange': [0.5, 0.51],
            'name': 'background',
            'required': true
          }
        ]
      }
    })
  );
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists');
  const report = ComplianceReportEntity.intake(rawReport);
  const pair = report.problemPairs[0];
  const renderedPair = report.pairs[0];

  assert.ok(pair !== undefined && renderedPair !== undefined, 'failing pair appears in both terminal collections');
  assert.ok(pair.proof !== undefined, 'fixed-hue failure carries exact feasibility evidence');
  assert.strictEqual(pair.proof.required, pair.required, 'proof uses the terminal pair requirement');
  assert.ok(pair.proof.bestActual < pair.proof.required, 'proof preserves the best achievable shortfall');
  assert.deepStrictEqual(renderedPair.proof, pair.proof, 'pairs and problemPairs carry the same proof object shape');
});

await test('strict true withholds an infeasible palette while preserving its best-achievable state', () => {
  const bestEffortEngine = ComplianceTestEngine.create();
  bestEffortEngine.pipeline(StrictComplianceScenario.pipeline());
  const bestEffortState = bestEffortEngine.run(StrictComplianceScenario.bestEffortInput());
  const engine = ComplianceTestEngine.create();
  engine.pipeline(StrictComplianceScenario.pipeline());
  const state = engine.run(StrictComplianceScenario.strictInput());
  const rawReport = state.metadata['contrast:complianceReport'];
  assert.ok(rawReport !== undefined, 'terminal report exists before palette withholding');
  const report = ComplianceReportEntity.intake(rawReport);
  const pair = report.problemPairs[0];
  assert.ok(pair !== undefined, 'terminal report retains the failing pair');
  assert.strictEqual(report.compliant, false, 'withholding preserves noncompliant evidence');
  assert.strictEqual(report.disposition, 'withheld', 'strict mode reports the withheld result');
  assert.ok(pair.actual < pair.required, 'withheld evidence preserves actual and required values');
  assert.ok(pair.shortfall > 0, 'withheld evidence preserves the shortfall');
  assert.ok(pair.constraints.length > 0, 'withheld evidence preserves constraints');
  assert.deepStrictEqual(
    state.roles,
    bestEffortState.roles,
    'strict withholding retains the best-achievable roles for downstream emitters'
  );
  assert.deepStrictEqual(
    state.variants,
    bestEffortState.variants,
    'strict withholding retains the best-achievable variants for downstream emitters'
  );
});

await test('strict true retains a compliant palette', () => {
  const engine = ComplianceTestEngine.create();
  engine.pipeline(StrictComplianceScenario.pipeline());
  const state = engine.run(
    InputEntity.intake({
      'colors': ['#000000', '#ffffff'],
      'contrast': {
        'algorithm': 'wcag21',
        'cvdMode': 'warn',
        'enableStrictCompliance': true,
        'level': 'AA'
      },
      'roles': {
        'contrastPairs': [
          {
            'background': 'background',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }
        ],
        'name': 'strict-compliant-e2e',
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
  const report = ComplianceReportEntity.intake(rawReport);
  assert.strictEqual(report.compliant, true, 'fixture remains compliant');
  assert.strictEqual(report.disposition, 'resolved', 'strict mode does not withhold a compliant palette');
  assert.deepStrictEqual(report.problemPairs, [], 'compliant palette has no terminal problems');
  assert.ok(Object.keys(state.roles).length > 0, 'compliant strict roles remain available');
  assert.ok(Object.keys(state.variants).length > 0, 'compliant strict variants remain available');
});

await CvdProbeScenarioSuite.run();
