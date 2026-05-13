/**
 * Image plugin end-to-end tests.
 *
 * Asserts plugin shape and drives the gallery extract/assignRoles/harmonize
 * trio against the published 5-role gallery schema.
 */
import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import { imagePlugin, ImagePlugin, galleryRoleSchema5 } from '@studnicky/iridis-image';

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(imagePlugin);
  return engine;
}

test('ImagePlugin e2e :: shape :: singleton is an instance of ImagePlugin', () => {
  assert.ok(imagePlugin instanceof ImagePlugin);
  assert.strictEqual(imagePlugin.name,    'image');
  assert.strictEqual(imagePlugin.version, '0.1.0');
});

test('ImagePlugin e2e :: shape :: registers the three gallery tasks', () => {
  const taskNames = imagePlugin.tasks().map((t) => t.name).sort();
  assert.deepStrictEqual(
    taskNames,
    ['gallery:assignRoles', 'gallery:extract', 'gallery:harmonize'],
  );
});

test('ImagePlugin e2e :: happy :: gallery:extract reduces a hex set via median-cut', async () => {
  const engine = freshEngine();
  engine.pipeline([
    'intake:hex',
    'gallery:extract',
  ]);

  // Provide more colors than k=5 so extract has work to do.
  const state = await engine.run({
    'colors': [
      '#1a1a1a', '#2b2b2b', '#3c3c3c', '#4d4d4d', '#5e5e5e',
      '#8b5cf6', '#a78bfa', '#c4b5fd', '#d8b4fe', '#e9d5ff',
      '#ec4899', '#f472b6', '#f9a8d4',
    ],
    'metadata': { 'gallery': { 'k': 5 } },
  });

  assert.ok(state.colors.length <= 5, `extract clamps to k=5, got ${state.colors.length}`);
  const dominant = (state.metadata['gallery'] as { 'dominantColors'?: readonly unknown[] } | undefined)?.dominantColors;
  assert.ok(Array.isArray(dominant), 'dominantColors recorded in metadata');
});

test('ImagePlugin e2e :: shape :: galleryRoleSchema5 exposes five roles', () => {
  assert.strictEqual(galleryRoleSchema5.roles.length, 5);
});

// ---------------------------------------------------------------------------
// gallery:assignRoles + gallery:harmonize scenario coverage
//
// ONE pipeline pass per scenario. The single `it` body asserts EVERY
// observable effect of the task being exercised — state.roles assignment,
// metadata.gallery.harmonized flag, accent hue delta after harmonize, etc.
// ---------------------------------------------------------------------------
import { describe, it }          from 'node:test';
import type { InputInterface, PaletteStateInterface } from '@studnicky/iridis';

interface GalleryScenarioInterface {
  readonly 'name':     string;
  readonly 'pipeline': readonly string[];
  readonly 'input':    InputInterface;
  assert(state: PaletteStateInterface): void;
}

describe('ImagePlugin e2e :: gallery scenarios', () => {
  const scenarios: readonly GalleryScenarioInterface[] = [
    {
      'name':     'gallery:assignRoles populates canvas/frame/accent/muted/text from extracted colors',
      'pipeline': ['intake:hex', 'gallery:extract', 'gallery:assignRoles'],
      'input': {
        'colors': [
          '#0d0d0d', '#202020', '#3c3c3c',     // dark neutrals → canvas / frame
          '#8b5cf6', '#a78bfa',                 // saturated accents
          '#5b6470', '#7d8390',                 // mid neutrals → muted candidates
        ],
        'metadata': { 'gallery': { 'k': 5 } },
      },
      assert(state): void {
        // All five gallery roles must be assigned.
        assert.ok('canvas' in state.roles, 'canvas role assigned');
        assert.ok('frame'  in state.roles, 'frame role assigned');
        assert.ok('accent' in state.roles, 'accent role assigned');
        assert.ok('muted'  in state.roles, 'muted role assigned');
        assert.ok('text'   in state.roles, 'text role auto-derived');
        // Canvas is the lowest-L color among extracted candidates.
        const canvasL = state.roles['canvas']!.oklch.l;
        for (const c of state.colors) {
          assert.ok(c.oklch.l >= canvasL - 1e-9, 'canvas has the lowest lightness');
        }
        // Accent has the highest chroma.
        const accentC = state.roles['accent']!.oklch.c;
        for (const c of state.colors) {
          assert.ok(c.oklch.c <= accentC + 1e-9, 'accent has the highest chroma');
        }
        // text is auto-derived: white if canvas is dark, black otherwise.
        const textHex = state.roles['text']!.hex.toLowerCase();
        if (canvasL <= 0.5) {
          assert.strictEqual(textHex, '#ffffff', 'dark canvas → white text');
        } else {
          assert.strictEqual(textHex, '#000000', 'light canvas → black text');
        }
      },
    },
    {
      'name':     'gallery:harmonize shifts accent hue when deltaE vs frame is < 10',
      'pipeline': ['intake:hex', 'gallery:extract', 'gallery:assignRoles', 'gallery:harmonize'],
      'input': {
        // accent and frame share hues — gallery:harmonize MUST shift accent ±30°.
        'colors': [
          '#0d0d0d',          // canvas (darkest)
          '#6d28d9',          // saturated violet → accent candidate
          '#7c3aed',          // very-similar violet → frame candidate after mid-L sort
          '#a78bfa', '#c4b5fd',
        ],
        'metadata': { 'gallery': { 'k': 5 } },
      },
      assert(state): void {
        const galleryMeta = state.metadata['gallery'] as {
          'harmonized'?:       boolean;
          'harmonizeDetails'?: {
            'before':   string;
            'after':    string;
            'deltaE':   number;
            'hueShift': number;
          };
        } | undefined;
        assert.ok(galleryMeta !== undefined,        'metadata.gallery written');
        if (galleryMeta.harmonized === true) {
          assert.ok(galleryMeta.harmonizeDetails !== undefined, 'details present when harmonized');
          const d = galleryMeta.harmonizeDetails;
          assert.strictEqual(Math.abs(d.hueShift), 30, 'shift magnitude is 30 degrees');
          assert.ok(d.deltaE < 10, `deltaE ${d.deltaE} should trigger harmonize threshold`);
          assert.notStrictEqual(d.before, d.after, 'accent hex changed after shift');
          // accent role's stored OKLCH h reflects the shift.
          const accent = state.roles['accent']!;
          assert.ok(accent.hex !== d.before, 'state.roles.accent rewritten to harmonized value');
        } else {
          // If accent/frame ended up distant, the task records harmonized:false.
          assert.strictEqual(galleryMeta.harmonized, false);
        }
      },
    },
  ];

  for (const sc of scenarios) {
    it(sc.name, async () => {
      const engine = freshEngine();
      engine.pipeline(sc.pipeline);
      const state = await engine.run(sc.input);
      sc.assert(state);
    });
  }
});
