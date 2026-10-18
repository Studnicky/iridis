import type { PaletteStateInterface } from '@studnicky/iridis';

import { InputInterfaceTypeEntity, RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import { ScenarioRunner } from '../../_runner/ScenarioRunner.ts';
import { ContrastMetadataAssertionPort } from '../contrast-plugin/ContrastMetadataAssertionPort.ts';
import { ContrastTestPort } from '../contrast-plugin/ContrastTestPort.ts';

interface ApcaInputInterface {
  readonly 'input': InputInterfaceTypeEntity.Type;
  readonly 'pipeline': readonly string[];
}

interface ApcaOutputInterface {
  readonly 'state': PaletteStateInterface;
}

/** Frozen behavioral matrix for APCA target selection and enforcement. */
export class ApcaScenarioSuite {
  static readonly scenarios = Object.freeze([
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-body-text] no throw');
        const apca = ContrastMetadataAssertionPort.apca(context.output().state);
        assert.ok(apca !== undefined, '[cell=4, scenario=apca-body-text] metadata written');
        assert.strictEqual(apca.pairs.length, 1, '[cell=4, scenario=apca-body-text] one pair processed');
        const pair = apca.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-body-text] pair present');
        assert.strictEqual(pair.foreground, 'text', '[cell=4, scenario=apca-body-text] foreground name');
        assert.strictEqual(pair.background, 'background', '[cell=4, scenario=apca-body-text] background name');
        assert.strictEqual(pair.algorithm, 'apca', '[cell=4, scenario=apca-body-text] algorithm');
        assert.strictEqual(pair.requiredLc, 75, '[cell=4, scenario=apca-body-text] body text Lc');
        assert.ok(pair.afterLc >= pair.requiredLc, '[cell=4, scenario=apca-body-text] contrast met');
        assert.strictEqual(pair.pass, true, '[cell=4, scenario=apca-body-text] passed');
        assert.ok(Math.abs(pair.afterLc) >= 45, '[cell=4, scenario=apca-body-text] substantial contrast');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.bodyTextRoles()),
      'kind': 'happy',
      'name': 'text+background intent selects Lc 75 body-text target; black on white passes'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-fluent] no throw');
        const pair = ContrastMetadataAssertionPort.apca(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-fluent] pair present');
        assert.strictEqual(pair.requiredLc, 60, '[cell=4, scenario=apca-fluent] fluent text Lc');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#888888'], ApcaScenarioSuite.fluentRoles()),
      'kind': 'happy',
      'name': 'text intent without background selects Lc 60 fluent-text target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-on-accent] no throw');
        const pair = ContrastMetadataAssertionPort.apca(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-on-accent] pair present');
        assert.strictEqual(pair.requiredLc, 60, '[cell=4, scenario=apca-on-accent] fluent text Lc');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.onAccentRoles()),
      'kind': 'happy',
      'name': 'onAccent foreground selects the fluent-text APCA target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-on-button] no throw');
        const pair = ContrastMetadataAssertionPort.apca(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-on-button] pair present');
        assert.strictEqual(pair.requiredLc, 60, '[cell=4, scenario=apca-on-button] fluent text Lc');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.onButtonRoles()),
      'kind': 'happy',
      'name': 'onButton foreground selects the fluent-text APCA target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-ui] no throw');
        const pair = ContrastMetadataAssertionPort.apca(context.output().state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-ui] pair present');
        assert.strictEqual(pair.requiredLc, 45, '[cell=4, scenario=apca-ui] generic UI Lc');
      },
      'input': ApcaScenarioSuite.input(['#888888', '#ffffff'], ApcaScenarioSuite.genericRoles()),
      'kind': 'happy',
      'name': 'no intent on either role selects Lc 45 non-text-UI target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-derived-intent] no throw');
        const state = context.output().state;
        const pair = ContrastMetadataAssertionPort.apca(state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-derived-intent] pair present');
        assert.strictEqual(state.roles.overlayGlyph?.hints?.intent, 'text', '[cell=4, scenario=apca-derived-intent] derived intent admitted');
        assert.strictEqual(pair.requiredLc, 60, '[cell=4, scenario=apca-derived-intent] fluent text Lc');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.derivedTextRoles(), ['intake:hex', 'resolve:roles', 'expand:family', 'enforce:apca']),
      'kind': 'happy',
      'name': 'explicit intent on a derived role selects the fluent-text APCA target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-derived-generic] no throw');
        const state = context.output().state;
        const pair = ContrastMetadataAssertionPort.apca(state)?.pairs.at(0);
        assert.ok(pair !== undefined, '[cell=4, scenario=apca-derived-generic] pair present');
        assert.strictEqual(state.roles.overlayGlyph?.hints, undefined, '[cell=4, scenario=apca-derived-generic] no inherited intent');
        assert.strictEqual(pair.requiredLc, 45, '[cell=4, scenario=apca-derived-generic] generic fallback Lc');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.derivedGenericRoles(), ['intake:hex', 'resolve:roles', 'expand:family', 'enforce:apca']),
      'kind': 'edge',
      'name': 'unspecified intent on a derived role retains the generic APCA target'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-no-pairs] no throw');
        assert.strictEqual(ContrastMetadataAssertionPort.apca(context.output().state), undefined, '[cell=4, scenario=apca-no-pairs] slot absent');
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], RoleSchemaInterfaceTypeEntity.intake({ 'name': 'no-pairs', 'roles': [{ 'name': 'primary', 'required': true }] })),
      'kind': 'edge',
      'name': 'no contrastPairs in schema: apca slot not written'
    },
    {
      'assertion': function(context) {
        assert.strictEqual(context.error(), undefined, '[cell=4, scenario=apca-ignore-wcag21] no throw');
        const apca = ContrastMetadataAssertionPort.apca(context.output().state);
        if (apca !== undefined) {
          assert.strictEqual(apca.pairs.length, 0, '[cell=4, scenario=apca-ignore-wcag21] no APCA entries');
        }
      },
      'input': ApcaScenarioSuite.input(['#000000', '#ffffff'], ApcaScenarioSuite.wcagRoles()),
      'kind': 'edge',
      'name': 'wcag21-algorithm pair in schema is ignored by enforce:apca'
    }
  ] satisfies readonly ScenarioRunner.ScenarioInterface<ApcaInputInterface, ApcaOutputInterface>[]);

  static async run(): Promise<void> {
    const runner = new ScenarioRunner<ApcaInputInterface, ApcaOutputInterface>(
      'ContrastPlugin :: cell-4 :: enforce:apca',
      ApcaScenarioSuite.runInput
    );
    await runner.run(ApcaScenarioSuite.scenarios);
  }

  private static input(colors: readonly string[], roles: RoleSchemaInterfaceTypeEntity.Type, pipeline: readonly string[] = ['intake:hex', 'resolve:roles', 'enforce:apca']): ApcaInputInterface {
    const input = InputInterfaceTypeEntity.intake({ 'colors': colors, 'roles': roles });
    const result = { 'input': input, 'pipeline': pipeline };
    return result;
  }

  private static bodyTextRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
      'name': 'apca',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'text', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
        { 'chromaRange': [0, 0.05], 'intent': 'background', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
      ]
    });
    return result;
  }

  private static onAccentRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
      'name': 'apca',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'onAccent', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
      ]
    });
    return result;
  }

  private static onButtonRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
      'name': 'apca',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'onButton', 'lightnessRange': [0, 0.30], 'name': 'text', 'required': true },
        { 'chromaRange': [0, 0.05], 'intent': 'button', 'lightnessRange': [0.85, 1], 'name': 'background', 'required': true }
      ]
    });
    return result;
  }

  private static fluentRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'card', 'foreground': 'heading', 'minimumContrastRatio': 1 }],
      'name': 'apca-fluent',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'text', 'lightnessRange': [0, 0.30], 'name': 'heading', 'required': true },
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.40, 0.65], 'name': 'card', 'required': true }
      ]
    });
    return result;
  }

  private static genericRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'canvas', 'foreground': 'icon', 'minimumContrastRatio': 1 }],
      'name': 'apca-ui',
      'roles': [
        { 'chromaRange': [0, 0.05], 'lightnessRange': [0.30, 0.60], 'name': 'icon', 'required': true },
        { 'chromaRange': [0, 0.05], 'lightnessRange': [0.85, 1], 'name': 'canvas', 'required': true }
      ]
    });
    return result;
  }

  private static derivedTextRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'chrome', 'foreground': 'overlayGlyph', 'minimumContrastRatio': 1 }],
      'name': 'apca-derived',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0, 0.30], 'name': 'accentSeed', 'required': true },
        { 'chromaRange': [0, 0.05], 'derivedFrom': 'accentSeed', 'intent': 'text', 'lightnessRange': [0, 0.30], 'name': 'overlayGlyph' },
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'chrome', 'required': true }
      ]
    });
    return result;
  }

  private static derivedGenericRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'apca', 'background': 'chrome', 'foreground': 'overlayGlyph', 'minimumContrastRatio': 1 }],
      'name': 'apca-derived',
      'roles': [
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0, 0.30], 'name': 'accentSeed', 'required': true },
        { 'chromaRange': [0, 0.05], 'derivedFrom': 'accentSeed', 'lightnessRange': [0, 0.30], 'name': 'overlayGlyph' },
        { 'chromaRange': [0, 0.05], 'intent': 'accent', 'lightnessRange': [0.85, 1], 'name': 'chrome', 'required': true }
      ]
    });
    return result;
  }

  private static runInput(input: ApcaInputInterface): ApcaOutputInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline([...input.pipeline]);
    const state = engine.run(input.input);
    const result = { 'state': state };
    return result;
  }

  private static wcagRoles(): RoleSchemaInterfaceTypeEntity.Type {
    const result = RoleSchemaInterfaceTypeEntity.intake({
      'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 4.5 }],
      'name': 'wcag-aa',
      'roles': [
        { 'lightnessRange': [0.30, 0.60], 'name': 'text', 'required': true },
        { 'lightnessRange': [0.90, 1], 'name': 'background', 'required': true }
      ]
    });
    return result;
  }
}
