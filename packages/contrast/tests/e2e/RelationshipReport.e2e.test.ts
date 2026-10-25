import type { PaletteStateInterface } from '@studnicky/iridis';

import {
  colorRecordFactory,
  consoleLogger,
  ContrastReportEntity,
  contrastWcag21,
  InputEntity,
  Metadata,
  RuntimeOptionsEntity
} from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ComplianceReportEntity } from '../../src/entities/ComplianceReportEntity.ts';
import { reportCompliance } from '../../src/tasks/ReportCompliance.ts';

class RelationshipReportFixture {
  static state(): PaletteStateInterface {
    const background = colorRecordFactory.fromHex('#ffffff');
    const foreground = colorRecordFactory.fromHex('#777777');
    const plain = colorRecordFactory.fromHex('#000000');
    const actual = contrastWcag21.apply(foreground, background);
    const plainActual = contrastWcag21.apply(plain, background);
    const state: PaletteStateInterface = {
      'colors': [],
      'input': InputEntity.intake({ 'colors': [] }),
      'metadata': {},
      'outputs': {},
      'roles': { 'background': background, 'plain': plain, 'text': foreground },
      'runtime': RuntimeOptionsEntity.intake({
        'colorSpace': 'srgb',
        'extra': {},
        'framing': 'dark'
      }),
      'variants': {}
    };
    Metadata.writeContrastReport(state.metadata, ContrastReportEntity.intake({
      'compliant': false,
      'disposition': 'best-effort',
      'pairs': [
        {
          'actual': actual,
          'adjustedRoles': [],
          'background': 'background',
          'constraints': ['hue-relationship'],
          'foreground': 'text',
          'passed': false,
          'relationIds': ['zeta-relationship', 'alpha-relationship'],
          'required': 7,
          'shortfall': 7 - actual
        },
        {
          'actual': plainActual,
          'adjustedRoles': [],
          'background': 'background',
          'constraints': [],
          'foreground': 'plain',
          'passed': true,
          'required': 7,
          'shortfall': 0
        }
      ],
      'problemPairs': [
        {
          'actual': actual,
          'adjustedRoles': [],
          'background': 'background',
          'constraints': ['hue-relationship'],
          'foreground': 'text',
          'passed': false,
          'relationIds': ['zeta-relationship', 'alpha-relationship'],
          'required': 7,
          'shortfall': 7 - actual
        }
      ],
      'selected': { 'algorithm': 'wcag21', 'level': 'AA' }
    }));
    return state;
  }
}

void test('report:compliance preserves sorted relationship IDs in terminal and problem pairs', () => {
  const state = RelationshipReportFixture.state();

  reportCompliance.run(state, { 'logger': consoleLogger, 'startedAt': Date.now() });

  const report = ComplianceReportEntity.intake(state.metadata['contrast:complianceReport']);
  const pair = report.pairs.find((candidate) => {
    const result = candidate.foreground === 'text';
    return result;
  });
  const plainPair = report.pairs.find((candidate) => {
    const result = candidate.foreground === 'plain';
    return result;
  });
  const [problemPair] = report.problemPairs;

  assert.ok(pair !== undefined);
  assert.ok(plainPair !== undefined);
  assert.ok(problemPair !== undefined);
  assert.deepEqual(pair.relationIds, ['alpha-relationship', 'zeta-relationship']);
  assert.deepEqual(problemPair.relationIds, ['alpha-relationship', 'zeta-relationship']);
  assert.deepEqual(pair.constraints, ['hue-relationship']);
  assert.deepEqual(problemPair.constraints, ['hue-relationship']);
  assert.equal(plainPair.relationIds, undefined);
});
