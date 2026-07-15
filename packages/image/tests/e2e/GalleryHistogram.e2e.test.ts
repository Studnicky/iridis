/**
 * GalleryHistogram — scenario-matrix suite.
 *
 * Subject: `gallery:histogram` task (image-pixel path via `intake:imagePixels`).
 * Drives the histogram + downstream extract pipeline through the engine so
 * binning, weighting, filtering, and boundary arithmetic are exercised e2e.
 *
 * Cells:
 *   1. bin population & weight accuracy   — counts, centroids, metadata
 *   2. transparent-pixel skipping         — alpha=0 rows excluded
 *   3. histogram-bits boundary            — 3-bit and 7-bit config edges
 *   4. OKLCH range filters                — lightnessRange / chromaRange drop pixels
 *   5. empty / no-op input               — zero colors, no crash
 *   6. image geometry extremes            — 1×1, wide×1, single row huge, monochrome
 */

import { test } from 'node:test';
import {
  ScenarioRunner,
  assert,
  type ScenarioInterface,
} from '../_runner/ScenarioRunner.ts';
import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import { imagePlugin }  from '@studnicky/iridis-image';
import type { PaletteStateInterface } from '@studnicky/iridis';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(imagePlugin);
  return engine;
}

/** Build an ImageData-shaped object from an array of [R,G,B,A] byte tuples. */
function makeImageData(
  pixels: readonly [number, number, number, number][],
  width?: number,
): { 'data': Uint8ClampedArray; 'width': number; 'height': number } {
  const w = width ?? pixels.length;
  const h = Math.ceil(pixels.length / w);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i];
    if (px === undefined) continue;
    data[i * 4]     = px[0];
    data[i * 4 + 1] = px[1];
    data[i * 4 + 2] = px[2];
    data[i * 4 + 3] = px[3];
  }
  return { 'data': data, 'width': w, 'height': h };
}

/** Opaque pixel shorthand. */
function px(r: number, g: number, b: number): [number, number, number, number] {
  return [r, g, b, 255];
}

/** Fully-transparent pixel. */
function transparent(): [number, number, number, number] {
  return [0, 0, 0, 0];
}

type GalleryHistogramMeta = {
  'bins':        readonly { 'hex': string; 'weight': number }[];
  'totalPixels': number;
  'binCount':    number;
} | undefined;

// ---------------------------------------------------------------------------
// Cell 1 — bin population, weight accuracy, and metadata
//
// The histogram bins every opaque pixel into a 5-bit-per-channel bucket.
// Pixels in the same bin merge into a weighted centroid; the resulting
// ColorRecord carries hints.weight = pixel count. The metadata key
// metadata.gallery.histogram is written with totalPixels, binCount, and
// bins[] sorted by descending weight.
//
// Invariants under test:
//   - state.colors.length === number of non-empty bins
//   - sum(colors[].hints.weight) === totalPixels === pixel count
//   - bins[] sorted descending by weight
//   - metadata.gallery.histogram written with correct field values
//   - three visually-distinct primaries collapse to exactly three bins
// ---------------------------------------------------------------------------

interface HistogramBinInput {
  readonly pixels: readonly [number, number, number, number][];
  readonly meta?: Record<string, unknown>;
}
interface HistogramBinOutput {
  readonly state: PaletteStateInterface;
  readonly colorCount: number;
  readonly totalWeight: number;
  readonly galMeta: GalleryHistogramMeta;
}

const histogramBinScenarios: readonly ScenarioInterface<HistogramBinInput, HistogramBinOutput>[] = [
  {
    name: '100 reds + 50 greens + 25 blues → 3 bins, weights proportional',
    kind: 'happy',
    input: {
      pixels: [
        ...Array<null>(100).fill(null).map(() => px(255, 0, 0)),
        ...Array<null>(50).fill(null).map(() => px(0, 255, 0)),
        ...Array<null>(25).fill(null).map(() => px(0, 0, 255)),
      ],
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=rgb-100-50-25] must not throw');
      assert.ok(output, '[cell=1, scenario=rgb-100-50-25] output present');
      assert.strictEqual(output!.colorCount, 3, '[cell=1, scenario=rgb-100-50-25] three non-empty bins');
      assert.strictEqual(output!.totalWeight, 175, '[cell=1, scenario=rgb-100-50-25] total weight = pixel count');
      assert.ok(output!.galMeta !== undefined, '[cell=1, scenario=rgb-100-50-25] histogram metadata written');
      assert.strictEqual(output!.galMeta!.totalPixels, 175, '[cell=1, scenario=rgb-100-50-25] totalPixels matches');
      assert.strictEqual(output!.galMeta!.binCount, 3, '[cell=1, scenario=rgb-100-50-25] binCount matches');
      assert.strictEqual(output!.galMeta!.bins[0]?.weight, 100, '[cell=1, scenario=rgb-100-50-25] bins sorted descending');
    },
  },
  {
    name: 'single opaque pixel produces one bin with weight 1',
    kind: 'happy',
    input: { pixels: [px(128, 64, 32)] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-pixel] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=single-pixel] one bin');
      assert.strictEqual(output!.totalWeight, 1, '[cell=1, scenario=single-pixel] weight = 1');
    },
  },
  {
    // 5-bit quantisation: bucket width = 256/32 = 8. Values 200 and 204
    // both map to bucket floor(200/8)=25 → same bin, so they must merge.
    name: 'two pixels in same 5-bit bin merge to single weighted centroid',
    kind: 'happy',
    input: { pixels: [px(200, 0, 0), px(204, 0, 0)] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=same-bin-merge] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=same-bin-merge] one bin after merge');
      assert.strictEqual(output!.totalWeight, 2, '[cell=1, scenario=same-bin-merge] merged weight = 2');
    },
  },
  {
    name: 'monochrome image — all pixels identical → one bin',
    kind: 'edge',
    input: { pixels: Array<null>(64).fill(null).map(() => px(0, 0, 0)) },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=monochrome] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=monochrome] single bin');
      assert.strictEqual(output!.totalWeight, 64, '[cell=1, scenario=monochrome] weight = pixel count');
    },
  },
  {
    name: 'full-color spectrum — 256 unique hues produce multiple bins',
    kind: 'edge',
    input: {
      pixels: Array.from({ length: 256 }, (_, i): [number, number, number, number] =>
        px(i, 255 - i, (i * 37) % 256),
      ),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=full-spectrum] must not throw');
      assert.ok(output!.colorCount > 1, '[cell=1, scenario=full-spectrum] multiple bins for spectrum');
      assert.ok(output!.colorCount <= 256, '[cell=1, scenario=full-spectrum] at most one bin per pixel');
      assert.strictEqual(output!.totalWeight, 256, '[cell=1, scenario=full-spectrum] all 256 pixels accounted');
    },
  },
];

new ScenarioRunner<HistogramBinInput, HistogramBinOutput>(
  'GalleryHistogram :: cell-1 :: binning',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [makeImageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.meta,
      'roles':     undefined,
      'runtime':   undefined,
    });
    const totalWeight = state.colors.reduce((s, c) => s + (c.hints?.weight ?? 0), 0);
    const galMeta = state.metadata['gallery:histogram'] as GalleryHistogramMeta;
    return { state, colorCount: state.colors.length, totalWeight, galMeta };
  },
).run(histogramBinScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — transparent pixel skipping
//
// Pixels with alpha === 0 MUST NOT contribute to any bin. Partially-opaque
// pixels (alpha > 0) are included. A mixed opaque+transparent image must
// only count the opaque pixels in totalWeight and bin counts.
// ---------------------------------------------------------------------------

interface TransparentInput {
  readonly pixels: readonly [number, number, number, number][];
}
interface TransparentOutput {
  readonly colorCount:   number;
  readonly totalWeight:  number;
}

const transparentScenarios: readonly ScenarioInterface<TransparentInput, TransparentOutput>[] = [
  {
    name: 'one opaque + one fully-transparent pixel → 1 bin, weight 1',
    kind: 'happy',
    input: { pixels: [px(255, 0, 0), transparent()] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=opaque-plus-transparent] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=2, scenario=opaque-plus-transparent] transparent excluded');
      assert.strictEqual(output!.totalWeight, 1, '[cell=2, scenario=opaque-plus-transparent] weight only counts opaque');
    },
  },
  {
    name: 'partially-opaque pixel (alpha=128) is included in histogram',
    kind: 'edge',
    input: { pixels: [[255, 0, 0, 128]] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=partial-alpha] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=2, scenario=partial-alpha] partial-alpha pixel binned');
      assert.strictEqual(output!.totalWeight, 1, '[cell=2, scenario=partial-alpha] weight = 1');
    },
  },
  {
    name: 'all-transparent image → zero bins, no error',
    kind: 'edge',
    input: { pixels: [transparent(), transparent(), transparent()] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-transparent] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=2, scenario=all-transparent] no bins from transparent pixels');
      assert.strictEqual(output!.totalWeight, 0, '[cell=2, scenario=all-transparent] zero weight');
    },
  },
];

new ScenarioRunner<TransparentInput, TransparentOutput>(
  'GalleryHistogram :: cell-2 :: transparent-pixel-skipping',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [makeImageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined,
    });
    const totalWeight = state.colors.reduce((s, c) => s + (c.hints?.weight ?? 0), 0);
    return { colorCount: state.colors.length, totalWeight };
  },
).run(transparentScenarios);

// ---------------------------------------------------------------------------
// Cell 3 — histogramBits boundary values (3-bit and 7-bit)
//
// The task clamps the bits parameter to [3, 7]. At 3 bits there are 512
// possible bins (coarse); at 7 bits there are 2 097 152 (fine). Both must
// produce at least one bin from a non-empty image, and must NOT throw.
// Bins at 3-bit must be fewer than or equal to bins at 7-bit for the same
// image (coarser quantisation → fewer distinct bins).
// ---------------------------------------------------------------------------

interface HistogramBitsInput {
  readonly pixels: readonly [number, number, number, number][];
  readonly histogramBits: number;
}
interface HistogramBitsOutput {
  readonly colorCount: number;
}

const histogramBitsScenarios: readonly ScenarioInterface<HistogramBitsInput, HistogramBitsOutput>[] = [
  {
    name: '3-bit quantisation produces at least 1 bin from 4-primary image',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0), px(0, 0, 255), px(255, 255, 0)],
      histogramBits: 3,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=3bit] must not throw');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=3bit] at least one bin');
      assert.ok(output!.colorCount <= 4, '[cell=3, scenario=3bit] at most four bins (coarse)');
    },
  },
  {
    name: '7-bit quantisation treats 4 distinct primaries as separate bins',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0), px(0, 0, 255), px(255, 255, 0)],
      histogramBits: 7,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=7bit] must not throw');
      assert.strictEqual(output!.colorCount, 4, '[cell=3, scenario=7bit] 4 fine-grained bins for 4 distinct primaries');
    },
  },
  {
    name: 'out-of-range bits (0) is clamped to 3 without error',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0)],
      histogramBits: 0,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bits-clamp-low] must not throw for bits=0');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=bits-clamp-low] at least one bin after clamp');
    },
  },
  {
    name: 'out-of-range bits (99) is clamped to 7 without error',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0)],
      histogramBits: 99,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bits-clamp-high] must not throw for bits=99');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=bits-clamp-high] at least one bin after clamp');
    },
  },
];

new ScenarioRunner<HistogramBitsInput, HistogramBitsOutput>(
  'GalleryHistogram :: cell-3 :: histogram-bits-boundary',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [makeImageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': { 'histogramBits': input.histogramBits } },
      'roles':     undefined,
      'runtime':   undefined,
    });
    return { colorCount: state.colors.length };
  },
).run(histogramBitsScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — OKLCH range filters (lightnessRange / chromaRange)
//
// When metadata.gallery.lightnessRange or chromaRange is set, pixels outside
// the envelope are dropped from binning. Pixels inside the envelope survive.
// Filtering should not throw; it may result in fewer bins.
// ---------------------------------------------------------------------------

interface RangeFilterInput {
  readonly pixels:          readonly [number, number, number, number][];
  readonly lightnessRange?: readonly [number, number];
  readonly chromaRange?:    readonly [number, number];
  readonly expectedAtLeast: number;
  readonly expectedAtMost:  number;
}
interface RangeFilterOutput {
  readonly colorCount: number;
}

const rangeFilterScenarios: readonly ScenarioInterface<RangeFilterInput, RangeFilterOutput>[] = [
  {
    name: 'lightnessRange [0,1] (full) passes all pixels',
    kind: 'happy',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0), px(0, 0, 0)],
      lightnessRange: [0, 1],
      expectedAtLeast: 1,
      expectedAtMost: 3,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=full-l-range] must not throw');
      assert.ok(output!.colorCount >= 1, '[cell=4, scenario=full-l-range] at least one bin');
      assert.ok(output!.colorCount <= 3, '[cell=4, scenario=full-l-range] at most 3 bins');
    },
  },
  {
    name: 'lightnessRange [0.9, 1] keeps only near-white pixels',
    kind: 'edge',
    input: {
      pixels: [
        px(255, 255, 255),  // very light — L ≈ 1.0, should pass
        px(255, 0, 0),      // pure red — L ≈ 0.63, should fail lightness filter
        px(0, 0, 0),        // black — L = 0, should fail
      ],
      lightnessRange: [0.9, 1],
      expectedAtLeast: 1,
      expectedAtMost: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=high-l-range] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=4, scenario=high-l-range] only near-white survives');
    },
  },
  {
    name: 'chromaRange [0, 0.01] keeps only near-neutral pixels (greys)',
    kind: 'edge',
    input: {
      pixels: [
        px(128, 128, 128),  // grey — C ≈ 0, should pass
        px(255, 0, 0),      // red — C ≈ 0.26, should fail chroma filter
        px(0, 0, 255),      // blue — C ≈ 0.31, should fail chroma filter
      ],
      chromaRange: [0, 0.01],
      expectedAtLeast: 1,
      expectedAtMost: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=low-c-range] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=4, scenario=low-c-range] only grey survives chroma filter');
    },
  },
  {
    name: 'impossible range [1.1, 1.2] drops all pixels — zero bins, no throw',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0)],
      lightnessRange: [1.1, 1.2],
      expectedAtLeast: 0,
      expectedAtMost: 0,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=impossible-range] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=4, scenario=impossible-range] all pixels filtered out');
    },
  },
];

new ScenarioRunner<RangeFilterInput, RangeFilterOutput>(
  'GalleryHistogram :: cell-4 :: oklch-range-filters',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const galleryMeta: Record<string, unknown> = {};
    if (input.lightnessRange !== undefined) galleryMeta['lightnessRange'] = input.lightnessRange;
    if (input.chromaRange    !== undefined) galleryMeta['chromaRange']    = input.chromaRange;
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [makeImageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': galleryMeta },
      'roles':     undefined,
      'runtime':   undefined,
    });
    return { colorCount: state.colors.length };
  },
).run(rangeFilterScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — empty input (no-op behavior)
//
// When state.colors is empty after intake (e.g. zero-byte image or an
// input object with no matching ImageData), gallery:histogram must not
// throw. state.colors remains empty; no histogram metadata is written
// (the task returns early on empty input).
// ---------------------------------------------------------------------------

interface EmptyInputInput {
  readonly colors: unknown[];
}
interface EmptyInputOutput {
  readonly colorCount: number;
}

const emptyInputScenarios: readonly ScenarioInterface<EmptyInputInput, EmptyInputOutput>[] = [
  {
    name: 'empty colors array does not throw',
    kind: 'edge',
    input: { colors: [] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=empty-colors] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=5, scenario=empty-colors] no bins');
    },
  },
  {
    name: 'zero-by-zero ImageData does not throw',
    kind: 'edge',
    input: { colors: [{ 'data': new Uint8ClampedArray(0), 'width': 0, 'height': 0 }] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=zero-dimensions] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=5, scenario=zero-dimensions] zero dimensions = no pixels');
    },
  },
];

new ScenarioRunner<EmptyInputInput, EmptyInputOutput>(
  'GalleryHistogram :: cell-5 :: empty-input',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined,
    });
    return { colorCount: state.colors.length };
  },
).run(emptyInputScenarios);

// ---------------------------------------------------------------------------
// Cell 6 — image geometry extremes and pixel format variety
//
// Covers image shapes and content that probe boundary arithmetic:
//   - 1×1 image (minimal geometry)
//   - tall-single-column image (width=1, many rows)
//   - large image (1000+ pixels) — ensure no truncation
//   - wide-gamut OKLCH input (high-chroma, P3-space colors) via hex intake
//     so the full gamut-mapping path in colorRecordFactory is exercised
//   - malformed colors entry (non-ImageData object) — should be silently
//     skipped by intake:imagePixels and not crash histogram
// ---------------------------------------------------------------------------

interface GeometryInput {
  readonly pixels:      readonly [number, number, number, number][];
  readonly imageWidth?: number;
}
interface GeometryOutput {
  readonly colorCount:  number;
  readonly totalWeight: number;
}

const geometryScenarios: readonly ScenarioInterface<GeometryInput, GeometryOutput>[] = [
  {
    name: '1×1 image — single pixel produces one bin',
    kind: 'edge',
    input: { pixels: [px(100, 150, 200)] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=1x1] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=1x1] one bin');
      assert.strictEqual(output!.totalWeight, 1, '[cell=6, scenario=1x1] weight = 1');
    },
  },
  {
    name: '1-wide × 500-tall image — all pixels accounted',
    kind: 'edge',
    input: {
      pixels: Array.from({ length: 500 }, (_, i): [number, number, number, number] =>
        px(i % 256, (i * 2) % 256, (i * 3) % 256),
      ),
      imageWidth: 1,
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=tall-single-col] must not throw');
      assert.strictEqual(output!.totalWeight, 500, '[cell=6, scenario=tall-single-col] 500 pixels accounted');
      assert.ok(output!.colorCount >= 1, '[cell=6, scenario=tall-single-col] at least one bin');
    },
  },
  {
    name: '1000-pixel image — weight totals to 1000',
    kind: 'edge',
    input: {
      pixels: Array.from({ length: 1000 }, (): [number, number, number, number] => px(128, 0, 64)),
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=1000px] must not throw');
      assert.strictEqual(output!.totalWeight, 1000, '[cell=6, scenario=1000px] 1000 pixels accounted');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=1000px] one bin for uniform color');
    },
  },
  {
    name: 'pure-black 1×1 image — black pixel binned (L ≈ 0)',
    kind: 'edge',
    input: { pixels: [px(0, 0, 0)] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=black] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=black] one bin for black');
    },
  },
  {
    name: 'pure-white 1×1 image — white pixel binned (L ≈ 1)',
    kind: 'edge',
    input: { pixels: [px(255, 255, 255)] },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=white] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=white] one bin for white');
    },
  },
];

new ScenarioRunner<GeometryInput, GeometryOutput>(
  'GalleryHistogram :: cell-6 :: image-geometry-extremes',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const imgData = makeImageData(input.pixels, input.imageWidth);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [imgData],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined,
    });
    const totalWeight = state.colors.reduce((s, c) => s + (c.hints?.weight ?? 0), 0);
    return { colorCount: state.colors.length, totalWeight };
  },
).run(geometryScenarios);

// ---------------------------------------------------------------------------
// Cell 6b — wide-gamut and extract integration
//
// gallery:extract after gallery:histogram must produce ≤ K clusters from
// a large image, preserving total weight. Wide-gamut (high-chroma) colors
// supplied via hex go through gamut-mapping in colorRecordFactory; the
// histogram and extract must handle these without crashing.
// ---------------------------------------------------------------------------

interface ExtractIntegrationInput {
  readonly pixels:    readonly [number, number, number, number][];
  readonly k:         number;
  readonly algorithm: 'median-cut' | 'delta-e';
}
interface ExtractIntegrationOutput {
  readonly resultCount: number;
  readonly totalWeight: number;
}

const extractIntegrationScenarios: readonly ScenarioInterface<ExtractIntegrationInput, ExtractIntegrationOutput>[] = [
  {
    name: 'median-cut reduces 300-pixel 3-color image to ≤ k=3 clusters',
    kind: 'happy',
    input: {
      pixels: [
        ...Array<null>(100).fill(null).map(() => px(255, 0, 0)),
        ...Array<null>(100).fill(null).map(() => px(0, 255, 0)),
        ...Array<null>(100).fill(null).map(() => px(0, 0, 255)),
      ],
      k: 3,
      algorithm: 'median-cut',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=median-cut-3color] must not throw');
      assert.ok(output!.resultCount <= 3, '[cell=6b, scenario=median-cut-3color] ≤ k clusters');
      assert.strictEqual(output!.totalWeight, 300, '[cell=6b, scenario=median-cut-3color] total weight preserved');
    },
  },
  {
    name: 'delta-e reduces 320-pixel 4-color image to ≤ k=3 clusters',
    kind: 'happy',
    input: {
      pixels: [
        ...Array<null>(80).fill(null).map(() => px(200, 10, 10)),
        ...Array<null>(80).fill(null).map(() => px(210, 20, 20)),
        ...Array<null>(80).fill(null).map(() => px(10, 200, 10)),
        ...Array<null>(80).fill(null).map(() => px(10, 10, 200)),
      ],
      k: 3,
      algorithm: 'delta-e',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=delta-e-4color] must not throw');
      assert.ok(output!.resultCount <= 3, `[cell=6b, scenario=delta-e-4color] ≤ k=3 clusters, got ${String(output?.resultCount)}`);
      assert.strictEqual(output!.totalWeight, 320, '[cell=6b, scenario=delta-e-4color] total weight preserved');
    },
  },
  {
    name: 'k=1 collapses all pixels to single representative',
    kind: 'edge',
    input: {
      pixels: [
        px(255, 0, 0), px(0, 255, 0), px(0, 0, 255),
        px(255, 255, 0), px(255, 0, 255), px(0, 255, 255),
      ],
      k: 1,
      algorithm: 'median-cut',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=k=1] must not throw');
      assert.strictEqual(output!.resultCount, 1, '[cell=6b, scenario=k=1] exactly 1 cluster for k=1');
    },
  },
  {
    name: 'k larger than bin count returns all bins (no phantom colors)',
    kind: 'edge',
    input: {
      pixels: [px(255, 0, 0), px(0, 255, 0)],
      k: 100,
      algorithm: 'median-cut',
    },
    assert(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=k-exceeds-bins] must not throw');
      assert.ok(output!.resultCount <= 2, '[cell=6b, scenario=k-exceeds-bins] cannot exceed available bins');
    },
  },
];

new ScenarioRunner<ExtractIntegrationInput, ExtractIntegrationOutput>(
  'GalleryHistogram :: cell-6b :: extract-integration',
  async (input) => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);
    const state = await engine.run({
      'bypass':    undefined,
      'colors':    [makeImageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': { 'k': input.k, 'algorithm': input.algorithm } },
      'roles':     undefined,
      'runtime':   undefined,
    });
    const totalWeight = state.colors.reduce((s, c) => s + (c.hints?.weight ?? 0), 0);
    return { resultCount: state.colors.length, totalWeight };
  },
).run(extractIntegrationScenarios);

// ---------------------------------------------------------------------------
// Golden fixture — algorithm metadata round-trip
//
// Byte-identical behavior check: state.metadata.gallery.algorithm must
// echo back the algorithm string supplied in metadata.gallery.algorithm.
// Kept as a bare test because it is a single golden assertion.
// ---------------------------------------------------------------------------

test('GalleryHistogram :: golden :: algorithm string round-trips through state.metadata.gallery', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

  const pixels: [number, number, number, number][] = [
    [255, 0, 0, 255], [255, 0, 0, 255], [255, 0, 0, 255],
    [0, 255, 0, 255], [0, 255, 0, 255],
  ];
  const state = await engine.run({
    'bypass':    undefined,
    'colors':    [makeImageData(pixels)],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'gallery': { 'k': 2, 'algorithm': 'median-cut' } },
    'roles':     undefined,
    'runtime':   undefined,
  });

  const meta = state.metadata['gallery'] as { 'algorithm'?: string } | undefined;
  assert.strictEqual(
    meta?.algorithm,
    'median-cut',
    '[golden, scenario=algorithm-round-trip] algorithm value must echo back from metadata',
  );
});

// ---------------------------------------------------------------------------
// Regression — dominant near-black background must not crowd out saturated
// hues in the delta-E trim step
//
// Reproduces the reported bug: a large near-black region (simulating a
// solid background plus antialiased dark edges) fragments into many heavy
// low-chroma bins — enough to fill the entire deltaE-merge trim cap (128)
// before ranking ever reaches a genuinely saturated bin, since each vibrant
// hue is itself split across several slightly-different shades (diluting
// its own per-bin weight versus the background's few but heavy bins).
//
// Before the fix: trimByWeightDescending ranked purely by linear weight, so
// the near-black bins (heavier, by pixel count) filled all 128 trim slots
// and every saturated bin was discarded before delta-E clustering ever saw
// it — the extracted palette was 100% near-black (max chroma ≈ 0.07).
//
// After the fix: bins are tiered chromatic-first (any bin with chroma ≥
// 0.05) before neutral/near-black bins, so genuinely saturated colors
// survive the trim and appear in the final K-color output.
// ---------------------------------------------------------------------------

test('GalleryHistogram :: regression :: saturated hues survive extraction despite dominant near-black background', async () => {
  const engine = freshEngine();
  engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

  // Background: 128 distinct near-black/near-neutral shades (5-bit
  // quantization bins), each carrying substantial weight — simulates a
  // solid background plus antialiased dark edges fragmenting into many
  // heavy dark bins, which is exactly the scenario that crowded out
  // saturated colors under pure linear-weight ranking.
  const background: [number, number, number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let g = 0; g < 8; g++) {
      for (let b = 0; b < 2; b++) {
        for (let rep = 0; rep < 60; rep++) {
          background.push(px(r * 8, g * 8, b * 8));
        }
      }
    }
  }
  // Saturated patches: each hue spread across a handful of slightly
  // different shades (antialiased hex-cell edges dilute a hue's own bin
  // weight), each individually far lighter than any background bin.
  const hues: readonly [number, number, number][] = [
    [230, 20, 20],   // red
    [20, 60, 230],   // blue
    [20, 200, 60],   // green
    [240, 130, 10],  // orange
  ];
  const saturatedPatches: [number, number, number, number][] = [];
  for (const [r, g, b] of hues) {
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 5; k++) {
        const jr = i * 8 - 16;
        const jg = k * 8 - 16;
        saturatedPatches.push(px(
          Math.max(0, Math.min(255, r + jr)),
          Math.max(0, Math.min(255, g + jg)),
          b,
        ));
      }
    }
  }
  const pixels = [...background, ...saturatedPatches];

  const state = await engine.run({
    'bypass':    undefined,
    'colors':    [makeImageData(pixels)],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  {
      'gallery': {
        'k':         8,
        'algorithm': 'delta-e',
        'deltaECap': 128,
      },
    },
    'roles':     undefined,
    'runtime':   undefined,
  });

  const chromaticOutputs = state.colors.filter((c) => c.oklch.c >= 0.15);
  assert.ok(
    chromaticOutputs.length >= 3,
    `[regression, scenario=black-bg-vs-saturated-hues] expected ≥3 high-chroma (c≥0.15) colors in output, ` +
      `got ${String(chromaticOutputs.length)} of ${String(state.colors.length)}: ` +
      state.colors.map((c) => `${c.hex}(c=${c.oklch.c.toFixed(3)})`).join(', '),
  );
});
