import { Engine, InputInterfaceTypeEntity, type PaletteStateInterface } from '@studnicky/iridis';
import { CapacitorOutputsEntity, capacitorPlugin } from '@studnicky/iridis-capacitor';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { coreTasks } from '@studnicky/iridis/tasks';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { categoryW3cRoleSchema } from '../fixtures/categoryW3cRoleSchema.ts';

class CategoryE2eFixture {
  static createEngine(): Engine {
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

  static run(colors: InputInterfaceTypeEntity.Type['colors'], metadata: Record<string, string>): PaletteStateInterface {
    const engine = CategoryE2eFixture.createEngine();
    engine.pipeline([
      'intake:any',
      'resolve:roles',
      'expand:family',
      'enforce:compliance',
      'derive:variant',
      'emit:cssVars',
      'emit:capacitorStatusBar',
      'emit:capacitorTheme'
    ]);
    const input = InputInterfaceTypeEntity.create({
      'colors': colors,
      'contrast': { 'algorithm': 'wcag21', 'level': 'AA' },
      'metadata': metadata,
      'roles': categoryW3cRoleSchema
    });
    const result = engine.run(input);
    return result;
  }

  static metadata(): Record<string, string> {
    const result = {
      'category': 'music',
      'cssVarPrefix': '--c-',
      'scopeAttr': 'data-category',
      'scopePrefix': 'category',
      'themeName': 'music'
    };
    return result;
  }
}

await test('category pipeline resolves all seed variants into CSS and Capacitor slots', () => {
  const single = CategoryE2eFixture.run(['#8B5CF6'], CategoryE2eFixture.metadata());
  const multiple = CategoryE2eFixture.run(['#8B5CF6', '#06b6d4', '#10b981'], CategoryE2eFixture.metadata());
  const wideGamut = CategoryE2eFixture.run([{ 'c': 0.35, 'h': 145, 'l': 0.7 }], CategoryE2eFixture.metadata());
  const unicodeMetadata = CategoryE2eFixture.run(['#8B5CF6'], {
    ...CategoryE2eFixture.metadata(),
    'category': 'müzik',
    'themeName': '音楽テーマ'
  });
  assert.ok(single.colors.length >= 1);
  assert.ok(multiple.colors.length >= 3);
  assert.ok(wideGamut.colors.length >= 1);
  assert.ok(unicodeMetadata.colors.length >= 1);
  const states = [single, multiple, wideGamut, unicodeMetadata];
  for (let index = 0; index < states.length; index += 1) {
    const state = states[index];
    if (state === undefined) {
      throw new Error('Every test pipeline state must be defined.');
    }
    assert.ok(Object.keys(state.roles).length > 0);
    assert.ok(Object.hasOwn(state.roles, 'onAccent'));
    assert.ok(state.outputs['stylesheet:cssVars'] !== undefined);
    assert.ok(state.outputs['capacitor:statusBar'] !== undefined);
  }
});

await test('category pipeline emits admitted CSS and Capacitor output shapes', () => {
  const state = CategoryE2eFixture.run(['#8B5CF6'], CategoryE2eFixture.metadata());
  const cssOutput = state.outputs['stylesheet:cssVars'];
  if (!JsonObject.is(cssOutput)) {
    throw new Error('The CSS-vars slot must be an object.');
  }
  const full = cssOutput.full;
  const map = cssOutput.map;
  if (typeof full !== 'string' || !JsonObject.is(map)) {
    throw new Error('The CSS-vars slot must expose full CSS and a property map.');
  }
  assert.ok(full.includes(':root'));
  assert.ok(Object.keys(map).length > 0);
  const statusBar = state.outputs['capacitor:statusBar'];
  const theme = state.outputs['capacitor:theme'];
  if (statusBar === undefined || theme === undefined) {
    throw new Error('The Capacitor output slots must be present.');
  }
  const outputs = CapacitorOutputsEntity.intake({ 'statusBar': statusBar, 'theme': theme });
  if (outputs.statusBar === undefined || outputs.theme === undefined) {
    throw new Error('The admitted Capacitor outputs must include status-bar and theme data.');
  }
  assert.equal(outputs.statusBar.backgroundColor.length, 7);
  assert.ok(outputs.statusBar.style === 'DARK' || outputs.statusBar.style === 'LIGHT');
  assert.equal(Object.keys(outputs.theme).length, 13);
});
