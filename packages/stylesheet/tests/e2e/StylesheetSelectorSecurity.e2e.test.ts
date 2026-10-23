import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  InputEntity,
  RoleSchemaEntity,
  TaskManifestEntity
} from '@studnicky/iridis';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import { JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stylesheetPlugin } from '../../src/index.ts';
import { CssVarsScenarioOutputEntity } from '../entities/CssVarsScenarioOutputEntity.ts';
import { CssVarsScopedScenarioOutputEntity } from '../entities/CssVarsScopedScenarioOutputEntity.ts';
import { StylesheetSelectorSecurityTestData } from '../fixtures/StylesheetSelectorSecurityTestData.ts';

class HostileVariantTask implements TaskInterface {
  readonly name = 'test:addHostileVariant';

  readonly manifest: TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Add a hostile variant name for selector-boundary testing',
    'name':        'test:addHostileVariant',
    'reads':       ['roles'],
    'writes':      ['variants']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    Object.defineProperty(state.variants, StylesheetSelectorSecurityTestData.HOSTILE_VARIANT, {
      'configurable': true,
      'enumerable':   true,
      'value':        state.roles,
      'writable':     true
    });
  }
}

class StylesheetSelectorSecurityFixture {
  static runCssVars(metadata: InputEntity.Type['metadata']): CssVarsScenarioOutputEntity.Type['cssVars'] {
    const result = StylesheetSelectorSecurityFixture.runCssVarsForPipeline(
      metadata,
      ['intake:hex', 'resolve:roles', 'emit:cssVars'],
      ['#5b21b6']
    );
    return result;
  }

  static runCssVarsWithVariant(metadata: InputEntity.Type['metadata']): CssVarsScenarioOutputEntity.Type['cssVars'] {
    const result = StylesheetSelectorSecurityFixture.runCssVarsForPipeline(
      metadata,
      ['intake:oklch', 'resolve:roles', 'derive:variant', 'emit:cssVars'],
      [{ 'c': 0.4, 'h': 30, 'l': 0.7 }]
    );
    return result;
  }

  static runCssVarsScoped(metadata: InputEntity.Type['metadata']): CssVarsScopedScenarioOutputEntity.Type['scoped'] {
    const result = StylesheetSelectorSecurityFixture.runCssVarsScopedForPipeline(
      metadata,
      ['intake:hex', 'resolve:roles', 'emit:cssVarsScoped'],
      {}
    );
    return result;
  }

  static runCssVarsScopedWithHostileVariant(metadata: InputEntity.Type['metadata']): CssVarsScopedScenarioOutputEntity.Type['scoped'] {
    const result = StylesheetSelectorSecurityFixture.runCssVarsScopedForPipeline(
      metadata,
      ['intake:hex', 'resolve:roles', 'test:addHostileVariant', 'emit:cssVarsScoped'],
      { 'task': new HostileVariantTask() }
    );
    return result;
  }

  static runCssVarsScopedWithHostileWideGamutVariant(metadata: InputEntity.Type['metadata']): CssVarsScopedScenarioOutputEntity.Type['scoped'] {
    const result = StylesheetSelectorSecurityFixture.runCssVarsScopedForPipeline(
      metadata,
      ['intake:oklch', 'resolve:roles', 'test:addHostileVariant', 'emit:cssVarsScoped'],
      {
        'colors': [{ 'c': 0.4, 'h': 30, 'l': 0.7 }],
        'task':   new HostileVariantTask()
      }
    );
    return result;
  }

  static unsafeScopeAttrError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVars({
        'scopeAttr': "data-theme'] body",
        'themeName': 'brand-blue'
      });
      return undefined;
    } catch (error) {
      const result = error instanceof Error ? error : undefined;
      return result;
    }
  }

  static unsafeScopePrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVarsScoped({
        'scopePrefix': "theme'] body"
      });
      return undefined;
    } catch (error) {
      const result = error instanceof Error ? error : undefined;
      return result;
    }
  }

  static unsafeCssVarsPrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVars({
        'cssVarPrefix': '--safe: red; } body { color: red; } :root { --'
      });
      return undefined;
    } catch (error) {
      const result = error instanceof Error ? error : undefined;
      return result;
    }
  }

  static unsafeScopedCssVarsPrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVarsScoped({
        'cssVarPrefix': '--safe: red; } body { color: red; } :root { --'
      });
      return undefined;
    } catch (error) {
      const result = error instanceof Error ? error : undefined;
      return result;
    }
  }

  private static engine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(stylesheetPlugin);
    return engine;
  }

  private static input(
    metadata: InputEntity.Type['metadata'],
    colors: InputEntity.Type['colors']
  ): InputEntity.Type {
    const result = InputEntity.create({
      'colors': colors,
      ...(metadata === undefined ? {} : { 'metadata': metadata }),
      'roles': RoleSchemaEntity.intake(StylesheetSelectorSecurityTestData.RAW_ROLE_SCHEMA)
    });
    return result;
  }

  static matchCount(value: string, pattern: RegExp): number {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.exec(value) !== null) {
      count += 1;
    }
    pattern.lastIndex = 0;
    return count;
  }

  private static runCssVarsForPipeline(
    metadata: InputEntity.Type['metadata'],
    pipeline: readonly string[],
    colors: InputEntity.Type['colors']
  ): CssVarsScenarioOutputEntity.Type['cssVars'] {
    const engine = StylesheetSelectorSecurityFixture.engine();
    engine.pipeline(pipeline);
    const state = engine.run(StylesheetSelectorSecurityFixture.input(metadata, colors));
    const cssVars = state.outputs['stylesheet:cssVars'];
    if (!JsonValue.is(cssVars)) {
      throw new Error('outputs.stylesheet:cssVars is not JSON');
    }
    const output = { 'cssVars': cssVars };
    if (!CssVarsScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVars is invalid');
    }
    return output.cssVars;
  }

  private static runCssVarsScopedForPipeline(
    metadata: InputEntity.Type['metadata'],
    pipeline: readonly string[],
    options: {
      readonly 'colors'?: InputEntity.Type['colors'];
      readonly 'task'?:   TaskInterface;
    }
  ): CssVarsScopedScenarioOutputEntity.Type['scoped'] {
    const engine = StylesheetSelectorSecurityFixture.engine();
    if (options.task !== undefined) {
      engine.tasks.register(options.task);
    }
    engine.pipeline(pipeline);
    const colors = options.colors ?? ['#5b21b6'];
    const state = engine.run(StylesheetSelectorSecurityFixture.input(metadata, colors));
    const scoped = state.outputs['stylesheet:cssVarsScoped'];
    if (!JsonValue.is(scoped)) {
      throw new Error('outputs.stylesheet:cssVarsScoped is not JSON');
    }
    const output = { 'scoped': scoped };
    if (!CssVarsScopedScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVarsScoped is invalid');
    }
    return output.scoped;
  }
}

await test('emit:cssVars escapes a hostile themeName without creating another rule', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVars({
    'scopeAttr': 'data-category',
    'themeName': StylesheetSelectorSecurityTestData.HOSTILE_VARIANT
  });

  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(output.scopedBlock, StylesheetSelectorSecurityTestData.OPEN_BRACE_PATTERN), 1);
  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(output.scopedBlock, StylesheetSelectorSecurityTestData.CLOSE_BRACE_PATTERN), 1);
  assert.ok(!output.scopedBlock.includes('body {'));
  assert.match(output.scopedBlock, StylesheetSelectorSecurityTestData.ATTRIBUTE_CATEGORY_SELECTOR_PATTERN);
});

await test('emit:cssVars preserves a valid hyphenated themeName', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVars({
    'scopeAttr': 'data-app-theme',
    'themeName': 'brand-blue'
  });

  assert.match(output.scopedBlock, StylesheetSelectorSecurityTestData.BRAND_BLUE_SELECTOR_PATTERN);
});

await test('emit:cssVars rejects a scopeAttr that can terminate its selector', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopeAttrError();
  assert.match(error?.message ?? '', StylesheetSelectorSecurityTestData.CSS_SAFE_IDENTIFIER_PATTERN);
});

await test('emit:cssVarsScoped rejects an unsafe scopePrefix', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopePrefixError();
  assert.match(error?.message ?? '', StylesheetSelectorSecurityTestData.CSS_SAFE_IDENTIFIER_PATTERN);
});

await test('emit:cssVarsScoped escapes hostile variant names in scoped blocks', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsScopedWithHostileVariant({});
  const hostileBlock = output.blocks[StylesheetSelectorSecurityTestData.HOSTILE_VARIANT];
  if (hostileBlock === undefined) {
    throw new Error('hostile variant block is missing');
  }
  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(hostileBlock, StylesheetSelectorSecurityTestData.OPEN_BRACE_PATTERN), 1);
  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(hostileBlock, StylesheetSelectorSecurityTestData.CLOSE_BRACE_PATTERN), 1);
  assert.ok(!hostileBlock.includes('body {'));
  assert.match(hostileBlock, StylesheetSelectorSecurityTestData.THEME_SELECTOR_PATTERN);
});

await test('emit:cssVarsScoped escapes hostile variant names in wide-gamut blocks', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsScopedWithHostileWideGamutVariant({});
  const hostileBlock = output.wideGamut[StylesheetSelectorSecurityTestData.HOSTILE_VARIANT];
  if (hostileBlock === undefined) {
    throw new Error('hostile wide-gamut variant block is missing');
  }
  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(hostileBlock, StylesheetSelectorSecurityTestData.OPEN_BRACE_PATTERN), 2);
  assert.strictEqual(StylesheetSelectorSecurityFixture.matchCount(hostileBlock, StylesheetSelectorSecurityTestData.CLOSE_BRACE_PATTERN), 2);
  assert.ok(!hostileBlock.includes('body {'));
  assert.match(hostileBlock, StylesheetSelectorSecurityTestData.THEME_SELECTOR_PATTERN);
});

await test('emit:cssVars rejects a cssVarPrefix that can emit another rule', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeCssVarsPrefixError();
  assert.match(error?.message ?? '', StylesheetSelectorSecurityTestData.CUSTOM_PROPERTY_PREFIX_PATTERN);
});

await test('emit:cssVarsScoped rejects a cssVarPrefix that can emit another rule', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopedCssVarsPrefixError();
  assert.match(error?.message ?? '', StylesheetSelectorSecurityTestData.CUSTOM_PROPERTY_PREFIX_PATTERN);
});

await test('emit:cssVars uses a valid custom prefix across every declaration block', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsWithVariant({
    'cssVarPrefix': '--brand-'
  });
  const blocks = [
    output.rootBlock,
    output.scopedBlock,
    output.darkScheme,
    output.wideGamut,
    output.forcedColors
  ];
  assert.ok(output.darkScheme.length > 0);
  assert.ok(output.wideGamut.length > 0);
  const blockCount = blocks.length;
  for (let index = 0; index < blockCount; index++) {
    const block = blocks[index] ?? '';
    assert.ok(block.includes('--brand-primary:'));
    assert.ok(!block.includes('--c-primary:'));
  }
  assert.strictEqual(output.map.primary, '--brand-primary');
});

await test('emit:cssVarsScoped uses a valid custom prefix in scoped and wide-gamut blocks', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsScopedWithHostileWideGamutVariant({
    'cssVarPrefix': '--brand-'
  });
  const blocks = [...Object.values(output.blocks), ...Object.values(output.wideGamut)];
  const blockCount = blocks.length;
  for (let index = 0; index < blockCount; index++) {
    const block = blocks[index] ?? '';
    assert.ok(block.includes('--brand-primary:'));
    assert.ok(!block.includes('--c-primary:'));
  }
});
