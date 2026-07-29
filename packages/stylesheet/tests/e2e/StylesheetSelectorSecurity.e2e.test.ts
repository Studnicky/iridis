import type {
  InputInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleSchemaInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stylesheetPlugin } from '../../src/index.ts';
import { CssVarsScenarioOutputEntity } from '../entities/CssVarsScenarioOutputEntity.ts';
import { CssVarsScopedScenarioOutputEntity } from '../entities/CssVarsScopedScenarioOutputEntity.ts';

const HOSTILE_VARIANT = "music'] } body { color: red } [data-owned='true";

const ROLE_SCHEMA: RoleSchemaInterfaceType = {
  'contrastPairs': undefined,
  'description': undefined,
  'name': 'selector-security',
  'roles': [{
    'chromaRange': undefined,
    'derivedFrom': undefined,
    'description': undefined,
    'hue': undefined,
    'hueClamp': undefined,
    'hueOffset': undefined,
    'intent': undefined,
    'lightnessRange': undefined,
    'name': 'primary',
    'required': true
  }]
};

class HostileVariantTask implements TaskInterface {
  readonly name = 'test:addHostileVariant';

  readonly manifest: TaskManifestInterfaceType = {
    'description': 'Add a hostile variant name for selector-boundary testing',
    'name':        'test:addHostileVariant',
    'phase':       undefined,
    'reads':       ['roles'],
    'requires':    undefined,
    'writes':      ['variants']
  };

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    state.variants[HOSTILE_VARIANT] = state.roles;
  }
}

class StylesheetSelectorSecurityFixture {
  static input(
    metadata: InputInterface['metadata'],
    colors: InputInterface['colors'] = ['#5b21b6']
  ): InputInterface {
    return {
      'bypass':    undefined,
      'colors':    colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  metadata,
      'roles':     ROLE_SCHEMA,
      'runtime':   undefined
    };
  }

  static runCssVars(
    metadata: InputInterface['metadata'],
    options?: {
      readonly 'withVariant'?:   boolean;
      readonly 'withWideGamut'?: boolean;
    }
  ): CssVarsScenarioOutputEntity.Type['cssVars'] {
    const engine = StylesheetSelectorSecurityFixture.engine();
    const withVariant = options?.withVariant === true;
    const withWideGamut = options?.withWideGamut === true;
    const intakeTask = withWideGamut ? 'intake:oklch' : 'intake:hex';
    const pipeline = withVariant
      ? [intakeTask, 'resolve:roles', 'derive:variant', 'emit:cssVars']
      : [intakeTask, 'resolve:roles', 'emit:cssVars'];
    engine.pipeline(pipeline);
    const colors: InputInterface['colors'] = withWideGamut
      ? [{ 'c': 0.4, 'h': 30, 'l': 0.7 }]
      : ['#5b21b6'];
    const state = engine.run(StylesheetSelectorSecurityFixture.input(metadata, colors));
    const cssVars = state.outputs['stylesheet:cssVars'];
    const output = { 'cssVars': cssVars };
    if (!CssVarsScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVars is invalid');
    }
    return output.cssVars;
  }

  static runCssVarsScoped(
    metadata: InputInterface['metadata'],
    options?: {
      readonly 'withHostileVariant'?: boolean;
      readonly 'withWideGamut'?:     boolean;
    }
  ): CssVarsScopedScenarioOutputEntity.Type['scoped'] {
    const engine = StylesheetSelectorSecurityFixture.engine();
    const withHostileVariant = options?.withHostileVariant === true;
    const withWideGamut = options?.withWideGamut === true;
    const intakeTask = withWideGamut ? 'intake:oklch' : 'intake:hex';
    if (withHostileVariant) {
      engine.tasks.register(new HostileVariantTask());
      engine.pipeline([intakeTask, 'resolve:roles', 'test:addHostileVariant', 'emit:cssVarsScoped']);
    } else {
      engine.pipeline([intakeTask, 'resolve:roles', 'emit:cssVarsScoped']);
    }
    const colors: InputInterface['colors'] = withWideGamut
      ? [{ 'c': 0.4, 'h': 30, 'l': 0.7 }]
      : ['#5b21b6'];
    const state = engine.run(StylesheetSelectorSecurityFixture.input(metadata, colors));
    const scoped = state.outputs['stylesheet:cssVarsScoped'];
    const output = { 'scoped': scoped };
    if (!CssVarsScopedScenarioOutputEntity.validate(output)) {
      throw new Error('outputs.stylesheet:cssVarsScoped is invalid');
    }
    return output.scoped;
  }

  static unsafeScopeAttrError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVars({
        'scopeAttr': "data-theme'] body",
        'themeName': 'brand-blue'
      });
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  static unsafeScopePrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVarsScoped({
        'scopePrefix': "theme'] body"
      });
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  static unsafeCssVarsPrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVars({
        'cssVarPrefix': '--safe: red; } body { color: red; } :root { --'
      });
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  static unsafeScopedCssVarsPrefixError(): Error | undefined {
    try {
      StylesheetSelectorSecurityFixture.runCssVarsScoped({
        'cssVarPrefix': '--safe: red; } body { color: red; } :root { --'
      });
      return undefined;
    } catch (error) {
      return error instanceof Error ? error : undefined;
    }
  }

  private static engine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.adopt(stylesheetPlugin);
    return engine;
  }
}

await test('emit:cssVars escapes a hostile themeName without creating another rule', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVars({
    'scopeAttr': 'data-category',
    'themeName': HOSTILE_VARIANT
  });

  assert.strictEqual(output.scopedBlock.match(/\{/gu)?.length, 1);
  assert.strictEqual(output.scopedBlock.match(/\}/gu)?.length, 1);
  assert.ok(!output.scopedBlock.includes('body {'));
  assert.match(output.scopedBlock, /^\[data-category='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\] \{/u);
});

await test('emit:cssVars preserves a valid hyphenated themeName', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVars({
    'scopeAttr': 'data-app-theme',
    'themeName': 'brand-blue'
  });

  assert.match(output.scopedBlock, /^\[data-app-theme='brand-blue'\] \{/u);
});

await test('emit:cssVars rejects a scopeAttr that can terminate its selector', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopeAttrError();
  assert.match(error?.message ?? '', /attributeName must be a CSS-safe identifier/u);
});

await test('emit:cssVarsScoped rejects an unsafe scopePrefix', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopePrefixError();
  assert.match(error?.message ?? '', /attributeName must be a CSS-safe identifier/u);
});

await test('emit:cssVarsScoped escapes hostile variant names in scoped blocks', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsScoped({}, {
    'withHostileVariant': true
  });
  const hostileBlock = output.blocks[HOSTILE_VARIANT];
  if (hostileBlock === undefined) {
    throw new Error('hostile variant block is missing');
  }
  assert.strictEqual(hostileBlock.match(/\{/gu)?.length, 1);
  assert.strictEqual(hostileBlock.match(/\}/gu)?.length, 1);
  assert.ok(!hostileBlock.includes('body {'));
  assert.match(hostileBlock, /^\[data-theme='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\] \{/u);
});

await test('emit:cssVarsScoped escapes hostile variant names in wide-gamut blocks', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVarsScoped({}, {
    'withHostileVariant': true,
    'withWideGamut':      true
  });
  const hostileBlock = output.wideGamut[HOSTILE_VARIANT];
  if (hostileBlock === undefined) {
    throw new Error('hostile wide-gamut variant block is missing');
  }
  assert.strictEqual(hostileBlock.match(/\{/gu)?.length, 2);
  assert.strictEqual(hostileBlock.match(/\}/gu)?.length, 2);
  assert.ok(!hostileBlock.includes('body {'));
  assert.match(hostileBlock, /\[data-theme='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\] \{/u);
});

await test('emit:cssVars rejects a cssVarPrefix that can emit another rule', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeCssVarsPrefixError();
  assert.match(error?.message ?? '', /value must be a CSS custom-property prefix/u);
});

await test('emit:cssVarsScoped rejects a cssVarPrefix that can emit another rule', () => {
  const error = StylesheetSelectorSecurityFixture.unsafeScopedCssVarsPrefixError();
  assert.match(error?.message ?? '', /value must be a CSS custom-property prefix/u);
});

await test('emit:cssVars uses a valid custom prefix across every declaration block', () => {
  const output = StylesheetSelectorSecurityFixture.runCssVars({
    'cssVarPrefix': '--brand-'
  }, {
    'withVariant':   true,
    'withWideGamut': true
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
  const output = StylesheetSelectorSecurityFixture.runCssVarsScoped({
    'cssVarPrefix': '--brand-'
  }, {
    'withHostileVariant': true,
    'withWideGamut':      true
  });
  const blocks = [...Object.values(output.blocks), ...Object.values(output.wideGamut)];
  const blockCount = blocks.length;
  for (let index = 0; index < blockCount; index++) {
    const block = blocks[index] ?? '';
    assert.ok(block.includes('--brand-primary:'));
    assert.ok(!block.includes('--c-primary:'));
  }
});
