/**
 * VS Code plugin end-to-end tests.
 *
 * Drives the published 16-role schema through the full vscode:* + emit:vscode*
 * pipeline in a single scenario, asserting every output and metadata slot the
 * five tasks should produce. Plugin shape (singleton, version, task list) is
 * checked alongside the run output inside the same `it` body.
 */
import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type {
  InputInterface,
  PaletteStateInterface,
} from '@studnicky/iridis';
import { vscodePlugin, VscodePlugin, vscodeRoleSchema16 } from '@studnicky/iridis-vscode';

interface SemanticRuleShapeInterface {
  readonly 'foreground'?: string;
  readonly 'fontStyle'?:  string;
}
interface ThemeJsonShapeInterface {
  readonly 'name':                 string;
  readonly 'type':                 string;
  readonly 'semanticHighlighting': boolean;
  readonly 'colors':               Record<string, string>;
  readonly 'semanticTokenColors':  Record<string, unknown>;
  readonly 'tokenColors':          readonly unknown[];
}
interface VscodeMetaShapeInterface {
  readonly 'baseTokens'?:         Record<string, string>;
  readonly 'semanticTokenRules'?: Record<string, SemanticRuleShapeInterface>;
}
interface VscodeOutputShapeInterface {
  readonly 'workbenchColors'?:    Record<string, string>;
  readonly 'semanticTokenRules'?: Record<string, SemanticRuleShapeInterface>;
  readonly 'themeJson'?:          ThemeJsonShapeInterface;
}

interface ScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(vscodePlugin);

const VSCODE_PIPELINE: readonly string[] = [
  'intake:hex',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'derive:variant',
  'vscode:expandTokens',
  'vscode:applyModifiers',
  'emit:vscodeSemanticRules',
  'emit:vscodeUiPalette',
  'emit:vscodeThemeJson',
];

describe('VscodePlugin e2e :: scenarios', () => {
  const scenarios: readonly ScenarioInterface[] = [
    {
      'name':     'full vscode pipeline — every emit task produces shape-correct output',
      'pipeline': VSCODE_PIPELINE,
      'input': {
        'colors': [
          // 16 seed colors so every required role resolves without a derived gap.
          '#0d1117', '#e6edf3', '#161b22', '#7d8590',
          '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
          '#fb7185', '#fbbf24', '#f59e0b', '#737373',
          '#ef4444', '#facc15', '#3b82f6', '#10b981',
        ],
        'roles':  vscodeRoleSchema16,
      },
      assert(state): void {
        // ---- Plugin shape (asserted inside the single it body) ------------
        assert.ok(vscodePlugin instanceof VscodePlugin, 'singleton is class instance');
        assert.strictEqual(vscodePlugin.name,    'vscode');
        assert.strictEqual(vscodePlugin.version, '0.1.0');
        assert.strictEqual(vscodeRoleSchema16.roles.length, 16, 'schema has 16 roles');
        const taskNames = vscodePlugin.tasks().map((t) => t.name).sort();
        assert.deepStrictEqual(
          taskNames,
          [
            'emit:vscodeSemanticRules',
            'emit:vscodeThemeJson',
            'emit:vscodeUiPalette',
            'vscode:applyModifiers',
            'vscode:expandTokens',
          ],
          'plugin registers all five vscode tasks',
        );

        // ---- metadata.vscode written by expandTokens + applyModifiers -----
        const meta = state.metadata['vscode'] as VscodeMetaShapeInterface | undefined;
        assert.ok(meta !== undefined,                       'metadata.vscode populated');
        assert.ok(meta.baseTokens !== undefined,            'expandTokens wrote metadata.vscode.baseTokens');
        assert.ok(Object.keys(meta.baseTokens).length > 0,  'baseTokens has at least one derived token');
        // expandTokens derives a 'comment' base token from the comment family role
        assert.ok('comment' in meta.baseTokens,             'baseTokens contains the comment token (expandTokens ran)');
        assert.ok(meta.semanticTokenRules !== undefined,    'applyModifiers wrote metadata.vscode.semanticTokenRules');
        // applyModifiers cross-products TOKEN_TYPES × TOKEN_MODIFIERS — must include modifier selectors
        const ruleSelectors = Object.keys(meta.semanticTokenRules);
        const modifierSelector = ruleSelectors.find((s) => s.includes('.'));
        assert.ok(
          modifierSelector !== undefined,
          `applyModifiers should emit at least one tokenType.modifier selector, got ${ruleSelectors.length} rules`,
        );

        // ---- outputs.vscode.semanticTokenRules from emit:vscodeSemanticRules
        const out = state.outputs['vscode'] as VscodeOutputShapeInterface | undefined;
        assert.ok(out !== undefined, 'outputs.vscode populated');
        const semantic = out.semanticTokenRules as
          Record<string, SemanticRuleShapeInterface> | undefined;
        assert.ok(semantic !== undefined,                'emit:vscodeSemanticRules wrote outputs.vscode.semanticTokenRules');
        assert.ok(Object.keys(semantic).length > 0,      'semanticTokenRules has at least one entry');
        const commentRule = semantic['comment'];
        assert.ok(commentRule !== undefined,             'comment selector exists');
        assert.ok(commentRule.foreground !== undefined,  'comment rule has a foreground');

        // ---- outputs.vscode.workbenchColors (uiPalette) -------------------
        const palette = out.workbenchColors;
        assert.ok(palette !== undefined,                       'emit:vscodeUiPalette wrote outputs.vscode.workbenchColors');
        assert.ok(Object.keys(palette).length > 0,             'workbenchColors has entries');
        assert.ok('editor.background' in palette,              'workbenchColors includes editor.background UI key');
        assert.ok('activityBar.background' in palette,         'workbenchColors includes activityBar.background UI key');

        // ---- outputs.vscode.themeJson — assembled by emit:vscodeThemeJson -
        const themeJson = out.themeJson as ThemeJsonShapeInterface | undefined;
        assert.ok(themeJson !== undefined,                 'emit:vscodeThemeJson wrote outputs.vscode.themeJson');
        assert.ok(typeof themeJson.name === 'string' && themeJson.name.length > 0, 'themeJson.name is a non-empty string');
        assert.ok(themeJson.type === 'dark' || themeJson.type === 'light',         'themeJson.type is dark|light');
        assert.strictEqual(themeJson.semanticHighlighting, true);
        assert.ok(typeof themeJson.colors === 'object' && Object.keys(themeJson.colors).length > 0, 'themeJson.colors populated');
        assert.ok(Array.isArray(themeJson.tokenColors) && themeJson.tokenColors.length > 0,        'themeJson.tokenColors has entries');
        assert.ok(typeof themeJson.semanticTokenColors === 'object'
          && Object.keys(themeJson.semanticTokenColors).length > 0,                                'themeJson.semanticTokenColors populated');
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      engine.pipeline(sc.pipeline);
      const state = await engine.run(sc.input);
      sc.assert(state);
    });
  }
});
