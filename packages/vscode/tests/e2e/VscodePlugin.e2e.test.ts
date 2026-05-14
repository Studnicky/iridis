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
  // baseTokens holds full ColorRecord-shaped objects post-R7.3 so emit
  // tasks can decide hex vs `color(display-p3 ...)` per slot. The test
  // peeks at the `hex` field for legacy shape assertions; full shape is
  // covered by the core ColorRecord shape tests.
  readonly 'baseTokens'?:         Record<string, { readonly 'hex': string }>;
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
          // All in-sRGB so this scenario covers the hex-only path; the
          // wide-gamut scenario below covers the `color(display-p3 ...)` path.
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

// ---------------------------------------------------------------------------
// R7.3 — wide-gamut P3 propagation through the VS Code pipeline. The plugin
// emits CSS Color 4 `color(display-p3 r g b)` syntax in tokenColors /
// workbench colors when the source record carries `displayP3`; sRGB-only
// records emit hex. The slot must choose per role: math-derived slots
// (mixHsl / lighten / darken / contrastText) stay hex because the math
// primitives operate in sRGB; direct passthroughs carry P3 through.
//
// One pipeline run, many assertions per `it`. Mixed input: one P3 string
// for the keyword (accent driver, intent='accent') + 15 hex seeds for the
// rest. The keyword role's chroma range (0.16–0.40) accepts the wide-gamut
// chroma, so `resolve:roles` preserves the P3 signal.
// ---------------------------------------------------------------------------
describe('VscodePlugin e2e :: wide-gamut scenarios', () => {
  const widePipeline: readonly string[] = [
    'intake:any',
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

  it('wide-gamut keyword input emits color(display-p3 ...) in workbench colors and tokenColors', async () => {
    engine.pipeline(widePipeline);
    const state = await engine.run({
      'colors': [
        // 15 in-sRGB seeds + 1 wide-gamut display-p3 string for the keyword
        // (accent driver). The display-p3 input lands at OKLCH ≈ (0.65,
        // 0.30, 30) — within keyword's range and outside sRGB gamut, so
        // ResolveRoles preserves the displayP3 slot.
        '#0d1117', '#e6edf3', '#161b22', '#7d8590',
        'color(display-p3 1.0 0.30 0.20)',
        '#a78bfa', '#22d3ee', '#34d399',
        '#fb7185', '#fbbf24', '#f59e0b', '#737373',
        '#ef4444', '#facc15', '#3b82f6', '#10b981',
      ],
      'roles': vscodeRoleSchema16,
    });

    const keyword = state.roles['keyword'];
    assert.ok(keyword !== undefined,             'keyword role resolved');
    assert.ok(keyword.displayP3 !== undefined,
      'keyword record carries displayP3 (wide-gamut input preserved through resolve:roles)');

    const out = state.outputs['vscode'] as VscodeOutputShapeInterface | undefined;
    assert.ok(out !== undefined,             'outputs.vscode populated');
    const themeJson = out.themeJson;
    assert.ok(themeJson !== undefined,       'themeJson assembled');

    // ---- workbench colors: direct keyword passthroughs emit P3 form ----
    // editorCursor.foreground, tab.activeBorder, activityBarBadge.background,
    // badge.background, button.background, peekView.border,
    // progressBar.background, statusBar.debuggingBackground are all direct
    // passthroughs of the accent (keyword) role.
    const cursor = themeJson.colors['editorCursor.foreground'];
    assert.ok(typeof cursor === 'string', 'editorCursor.foreground is a string');
    assert.match(cursor as string,
      /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/,
      'editorCursor.foreground (direct keyword passthrough) emits color(display-p3 ...)');

    const tabBorder = themeJson.colors['tab.activeBorder'];
    assert.match(tabBorder as string,
      /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/,
      'tab.activeBorder (direct keyword passthrough) emits color(display-p3 ...)');

    // Math-derived slots stay sRGB hex — they go through fromHex/mixHsl/
    // lighten/darken which round-trip via 6-digit hex (P3 cannot survive).
    const findMatch = themeJson.colors['editor.findMatchBackground'];
    assert.match(findMatch as string, /^#[0-9a-f]{6}[0-9a-f]{2}$/,
      'editor.findMatchBackground (template-string alpha suffix) stays 8-digit sRGB hex');

    // sideBar.foreground is mixHsl(fg, muted) — sRGB-only math output.
    const sideBarFg = themeJson.colors['sideBar.foreground'];
    assert.match(sideBarFg as string, /^#[0-9a-f]{6}$/,
      'sideBar.foreground (math-derived) stays 6-digit sRGB hex');

    // editor.background is a direct fg passthrough — foreground role is
    // intent='text' and our input gave it a plain sRGB seed, so stays hex.
    const editorBg = themeJson.colors['editor.background'];
    // bg is the background role (sRGB seed) — stays hex.
    assert.match(editorBg as string, /^#[0-9a-f]{6}$/,
      'editor.background (sRGB background role passthrough) stays 6-digit sRGB hex');

    // ---- tokenColors: keyword's wide-gamut signal propagates through ----
    // expand:family (TOKEN_FAMILY) into tokenColors[].settings.foreground
    // for any token whose family is 'keyword' (e.g. tokenType 'keyword').
    interface TokenColorEntry {
      readonly 'name':     string;
      readonly 'settings': { readonly 'foreground'?: string };
    }
    const tokenColors = themeJson.tokenColors as readonly TokenColorEntry[];
    const keywordToken = tokenColors.find((t) => t.name === 'keyword');
    assert.ok(keywordToken !== undefined,           'keyword tokenColor entry present');
    assert.ok(keywordToken.settings.foreground !== undefined,
      'keyword tokenColor has foreground');
    assert.match(keywordToken.settings.foreground as string,
      /^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/,
      'keyword tokenColors foreground emits color(display-p3 ...) for wide-gamut keyword role');
  });
});

// ---------------------------------------------------------------------------
// R7.7 — math-derived and template-string-alpha slots must NEVER emit
// `color(display-p3 ...)`, regardless of input. Those slots route through
// helpers that operate on 6-digit hex strings (mixHslHex / lightenHex /
// darkenHex / contrastTextHex) or concatenate an 8-digit alpha suffix
// (`${color}40`) — neither is compatible with the P3 functional syntax.
// This regression test stays valid even when role resolution nudges
// input chromas out of sRGB, because it only inspects slots that are
// guaranteed-sRGB by construction.
// ---------------------------------------------------------------------------
describe('VscodePlugin e2e :: math-derived slot regression', () => {
  it('math-derived and alpha-suffixed slots stay sRGB hex even when input drives roles out-of-gamut', async () => {
    engine.pipeline(VSCODE_PIPELINE);
    const state = await engine.run({
      'colors': [
        '#0d1117', '#e6edf3', '#161b22', '#7d8590',
        '#8b5cf6', '#a78bfa', '#22d3ee', '#34d399',
        '#fb7185', '#fbbf24', '#f59e0b', '#737373',
        '#ef4444', '#facc15', '#3b82f6', '#10b981',
      ],
      'roles': vscodeRoleSchema16,
    });

    const out = state.outputs['vscode'] as VscodeOutputShapeInterface | undefined;
    assert.ok(out !== undefined && out.themeJson !== undefined, 'themeJson assembled');
    const colors = out.themeJson.colors;

    // Slots that are math-derived (mixHsl / lighten / darken / contrastText)
    // or template-string alpha-suffixed — every value MUST be a plain hex
    // string, never `color(display-p3 ...)`.
    const sRgbOnlySlots = [
      'activityBar.background',           // mixHslHex / darkenHex
      'activityBar.border',               // mixHslHex
      'activityBarBadge.foreground',      // contrastTextHex
      'badge.foreground',                 // contrastTextHex
      'button.foreground',                // contrastTextHex
      'button.hoverBackground',           // lightenHex
      'button.secondaryBackground',       // activeSelection (mixHslHex)
      'button.secondaryHoverBackground',  // mixHslHex
      'editor.findMatchBackground',       // `${accent_HEX}40`
      'editor.findMatchHighlightBackground', // `${accent_HEX}25`
      'editor.lineHighlightBackground',   // hover (mixHslHex)
      'editor.selectionBackground',       // selection (mixHslHex)
      'editor.selectionHighlightBackground', // `${selection}80`
      'editorBracketMatch.background',    // `${selection}60`
      'editorBracketMatch.border',        // `${accent_HEX}80`
      'editorIndentGuide.activeBackground1', // mixHslHex
      'editorIndentGuide.background1',    // border (mixHslHex)
      'focusBorder',                      // `${accent_HEX}80`
      'inputOption.activeBackground',     // `${accent_HEX}30`
      'scrollbarSlider.activeBackground', // `${muted_HEX}70`
      'scrollbarSlider.background',       // `${muted_HEX}30`
      'scrollbarSlider.hoverBackground',  // `${muted_HEX}50`
      'sideBar.foreground',               // mixHslHex
      'statusBar.foreground',             // mixHslHex
      'terminal.ansiBrightBlue',          // lightenHex
      'terminal.ansiBrightCyan',          // lightenHex
      'terminal.ansiBrightGreen',         // lightenHex
      'terminal.ansiBrightMagenta',       // lightenHex
      'terminal.ansiBrightRed',           // lightenHex
      'terminal.ansiBrightYellow',        // lightenHex
      'titleBar.activeForeground',        // mixHslHex
    ];
    for (const slot of sRgbOnlySlots) {
      const value = colors[slot];
      assert.ok(typeof value === 'string', `slot ${slot} is a string`);
      assert.ok(!value.includes('display-p3'),
        `math-derived slot ${slot} must not contain display-p3 syntax, got ${value}`);
      assert.match(value, /^#[0-9a-f]{6,8}$/,
        `math-derived slot ${slot} must be a 6- or 8-digit hex, got ${value}`);
    }
  });
});
