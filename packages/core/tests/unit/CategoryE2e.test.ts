import { test }   from 'node:test';
import assert     from 'node:assert/strict';

import { Engine }                from '@studnicky/iridis/engine';
import { mathBuiltins }          from '@studnicky/iridis/math';
import { coreTasks }             from '@studnicky/iridis/tasks';
import { contrastPlugin }        from '@studnicky/iridis-contrast';
import { stylesheetPlugin }      from '@studnicky/iridis-stylesheet';
import { capacitorPlugin }       from '@studnicky/iridis-capacitor';
import { categoryW3cRoleSchema } from '../fixtures/categoryW3cRoleSchema.ts';

test('CategoryE2e :: happy :: single hex seed produces W3C-conformant outputs', async () => {
  const engine = new Engine();

  for (const primitive of mathBuiltins) {
    engine.math.register(primitive);
  }
  for (const task of coreTasks) {
    engine.tasks.register(task);
  }
  engine.adopt(contrastPlugin);
  engine.adopt(stylesheetPlugin);
  engine.adopt(capacitorPlugin);
  engine.pipeline([
    'intake:any',
    'expand:family',
    'resolve:roles',
    'enforce:wcagAA',
    'derive:variant',
    'emit:cssVars',
    'emit:capacitorStatusBar',
    'emit:capacitorTheme',
  ]);

  const state = await engine.run({
    'colors':   ['#8B5CF6'],
    'roles':    categoryW3cRoleSchema,
    'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
    'metadata': {
      'category':     'music',
      'cssVarPrefix': '--c-',
      'scopeAttr':    'data-category',
      'scopePrefix':  'category',
      'themeName':    'music',
    },
  });

  assert.ok(state.colors.length >= 1,                       'colors populated by intake');
  assert.ok(Object.keys(state.roles).length >= 1,           'roles populated by resolve');
  assert.ok(state.outputs['cssVars'],                       'cssVars output present');
  assert.ok(state.outputs['capacitor'],                     'capacitor output present');

  const cssVars = state.outputs['cssVars'] as { full: string; map: Record<string, string> };
  assert.ok(cssVars.full.includes(':root'),                 'cssVars.full contains :root block');
  assert.ok(Object.keys(cssVars.map).length >= 1,           'cssVars.map populated');

  const capacitor = state.outputs['capacitor'] as { statusBar: { backgroundColor: string; style: 'DARK' | 'LIGHT' } };
  assert.match(capacitor.statusBar.backgroundColor, /^#[0-9a-f]{6}$/i, 'statusBar.backgroundColor is hex');
  assert.ok(['DARK', 'LIGHT'].includes(capacitor.statusBar.style),     'statusBar.style is DARK or LIGHT');
});
