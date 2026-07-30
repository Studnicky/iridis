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

import type { PaletteStateInterface } from '@studnicky/iridis';
import type { JsonValueType } from '@studnicky/types';

import { imagePlugin }  from '@studnicky/iridis-image';
import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ScenarioInterface } from '../_runner/ScenarioInterface.ts';

import { ScenarioRunner } from '../_runner/ScenarioRunner.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class ImageFixture {
  static engine(): Engine {
    const engine = new Engine();
    for (const task of coreTasks) {engine.tasks.register(task);}
    engine.adopt(imagePlugin);
    return engine;
  }

  static imageData(
    pixels: readonly [number, number, number, number][],
    width?: number
  ): { 'data': Uint8ClampedArray; 'height': number; 'width': number; } {
    const imageWidth = width ?? pixels.length;
    const imageHeight = Math.ceil(pixels.length / imageWidth);
    const data = new Uint8ClampedArray(imageWidth * imageHeight * 4);
    const pixelCount = pixels.length;
    for (let index = 0; index < pixelCount; index++) {
      const pixel = pixels[index];
      if (pixel === undefined) {continue;}
      data[index * 4] = pixel[0];
      data[index * 4 + 1] = pixel[1];
      data[index * 4 + 2] = pixel[2];
      data[index * 4 + 3] = pixel[3];
    }
    return { 'data': data, 'height': imageHeight, 'width': imageWidth };
  }

  static pixel(red: number, green: number, blue: number, alpha = 255): [number, number, number, number] {
    return [
      Math.max(0, Math.min(255, Math.round(red))),
      Math.max(0, Math.min(255, Math.round(green))),
      Math.max(0, Math.min(255, Math.round(blue))),
      Math.max(0, Math.min(255, Math.round(alpha)))
    ];
  }
}

type GalleryHistogramMeta = {
  'binCount':    number;
  'bins':        readonly { 'hex': string; 'weight': number }[];
  'totalPixels': number;
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

abstract class HistogramBinInput {
  abstract readonly 'meta'?: Record<string, JsonValueType>;
  readonly 'pixels': readonly [number, number, number, number][];
}
abstract class HistogramBinOutput {
  abstract readonly 'colorCount': number;
  abstract readonly 'galMeta': GalleryHistogramMeta;
  abstract readonly 'state': PaletteStateInterface;
  abstract readonly 'totalWeight': number;
}

const histogramBinScenarios: readonly ScenarioInterface<HistogramBinInput, HistogramBinOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=rgb-100-50-25] must not throw');
      assert.ok(output !== undefined, '[cell=1, scenario=rgb-100-50-25] output present');
      assert.strictEqual(output.colorCount, 3, '[cell=1, scenario=rgb-100-50-25] three non-empty bins');
      assert.strictEqual(output.totalWeight, 175, '[cell=1, scenario=rgb-100-50-25] total weight = pixel count');
      assert.ok(output.galMeta !== undefined, '[cell=1, scenario=rgb-100-50-25] histogram metadata written');
      assert.strictEqual(output.galMeta.totalPixels, 175, '[cell=1, scenario=rgb-100-50-25] totalPixels matches');
      assert.strictEqual(output.galMeta.binCount, 3, '[cell=1, scenario=rgb-100-50-25] binCount matches');
      assert.strictEqual(output.galMeta.bins.at(0)?.weight, 100, '[cell=1, scenario=rgb-100-50-25] bins sorted descending');
    },
    'input': {
      'pixels': [
        ...Array<null>(100).fill(null).map(() => { const pixel = ImageFixture.pixel(255, 0, 0); return pixel; }),
        ...Array<null>(50).fill(null).map(() => { const pixel = ImageFixture.pixel(0, 255, 0); return pixel; }),
        ...Array<null>(25).fill(null).map(() => { const pixel = ImageFixture.pixel(0, 0, 255); return pixel; })
      ]
    },
    'kind': 'happy',
    'name': '100 reds + 50 greens + 25 blues → 3 bins, weights proportional'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=single-pixel] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=single-pixel] one bin');
      assert.strictEqual(output!.totalWeight, 1, '[cell=1, scenario=single-pixel] weight = 1');
    },
    'input': { 'pixels': [ImageFixture.pixel(128, 64, 32)] },
    'kind': 'happy',
    'name': 'single opaque pixel produces one bin with weight 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=same-bin-merge] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=same-bin-merge] one bin after merge');
      assert.strictEqual(output!.totalWeight, 2, '[cell=1, scenario=same-bin-merge] merged weight = 2');
    },
    'input': { 'pixels': [ImageFixture.pixel(200, 0, 0), ImageFixture.pixel(204, 0, 0)] },
    'kind': 'happy',
    // 5-bit quantisation: bucket width = 256/32 = 8. Values 200 and 204
    // both map to bucket floor(200/8)=25 → same bin, so they must merge.
    'name': 'two pixels in same 5-bit bin merge to single weighted centroid'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=monochrome] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=1, scenario=monochrome] single bin');
      assert.strictEqual(output!.totalWeight, 64, '[cell=1, scenario=monochrome] weight = pixel count');
    },
    'input': { 'pixels': Array<null>(64).fill(null).map(() => { const pixel = ImageFixture.pixel(0, 0, 0); return pixel; }) },
    'kind': 'edge',
    'name': 'monochrome image — all pixels identical → one bin'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=1, scenario=full-spectrum] must not throw');
      assert.ok(output!.colorCount > 1, '[cell=1, scenario=full-spectrum] multiple bins for spectrum');
      assert.ok(output!.colorCount <= 256, '[cell=1, scenario=full-spectrum] at most one bin per pixel');
      assert.strictEqual(output!.totalWeight, 256, '[cell=1, scenario=full-spectrum] all 256 pixels accounted');
    },
    'input': {
      'pixels': Array<null>(256).fill(null).map((_value, index) => {
        const pixel = ImageFixture.pixel(index, 255 - index, (index * 37) % 256);
        return pixel;
      })
    },
    'kind': 'edge',
    'name': 'full-color spectrum — 256 unique hues produce multiple bins'
  }
];

await new ScenarioRunner<HistogramBinInput, HistogramBinOutput>(
  'GalleryHistogram :: cell-1 :: binning',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [ImageFixture.imageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  input.meta,
      'roles':     undefined,
      'runtime':   undefined
    });
    const totalWeight = state.colors.reduce((s, c) => {return s + (c.hints?.weight ?? 0);}, 0);
    const galMeta = state.metadata['gallery:histogram'] as GalleryHistogramMeta;
    return { 'colorCount': state.colors.length, 'galMeta': galMeta, 'state': state, 'totalWeight': totalWeight };
  }
).run(histogramBinScenarios);

// ---------------------------------------------------------------------------
// Cell 2 — transparent pixel skipping
//
// Pixels with alpha === 0 MUST NOT contribute to any bin. Partially-opaque
// pixels (alpha > 0) are included. A mixed opaque+transparent image must
// only count the opaque pixels in totalWeight and bin counts.
// ---------------------------------------------------------------------------

type TransparentInput = {
  readonly 'pixels': readonly [number, number, number, number][];
};
abstract class TransparentOutput {
  abstract readonly 'colorCount': number;
  abstract readonly 'totalWeight': number;
}

const transparentScenarios: readonly ScenarioInterface<TransparentInput, TransparentOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=opaque-plus-transparent] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=2, scenario=opaque-plus-transparent] transparent excluded');
      assert.strictEqual(output!.totalWeight, 1, '[cell=2, scenario=opaque-plus-transparent] weight only counts opaque');
    },
    'input': { 'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 0, 0, 0)] },
    'kind': 'happy',
    'name': 'one opaque + one fully-transparent pixel → 1 bin, weight 1'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=partial-alpha] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=2, scenario=partial-alpha] partial-alpha pixel binned');
      assert.strictEqual(output!.totalWeight, 1, '[cell=2, scenario=partial-alpha] weight = 1');
    },
    'input': { 'pixels': [[255, 0, 0, 128]] },
    'kind': 'edge',
    'name': 'partially-opaque pixel (alpha=128) is included in histogram'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=2, scenario=all-transparent] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=2, scenario=all-transparent] no bins from transparent pixels');
      assert.strictEqual(output!.totalWeight, 0, '[cell=2, scenario=all-transparent] zero weight');
    },
    'input': { 'pixels': [ImageFixture.pixel(0, 0, 0, 0), ImageFixture.pixel(0, 0, 0, 0), ImageFixture.pixel(0, 0, 0, 0)] },
    'kind': 'edge',
    'name': 'all-transparent image → zero bins, no error'
  }
];

await new ScenarioRunner<TransparentInput, TransparentOutput>(
  'GalleryHistogram :: cell-2 :: transparent-pixel-skipping',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [ImageFixture.imageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    });
    const totalWeight = state.colors.reduce((s, c) => {return s + (c.hints?.weight ?? 0);}, 0);
    return { 'colorCount': state.colors.length, 'totalWeight': totalWeight };
  }
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

type HistogramBitsInput = {
  readonly 'histogramBits': number;
  readonly 'pixels': readonly [number, number, number, number][];
};
abstract class HistogramBitsOutput {
  abstract readonly 'colorCount': number;
}

const histogramBitsScenarios: readonly ScenarioInterface<HistogramBitsInput, HistogramBitsOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=3bit] must not throw');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=3bit] at least one bin');
      assert.ok(output!.colorCount <= 4, '[cell=3, scenario=3bit] at most four bins (coarse)');
    },
    'input': {
      'histogramBits': 3,
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0), ImageFixture.pixel(0, 0, 255), ImageFixture.pixel(255, 255, 0)]
    },
    'kind': 'edge',
    'name': '3-bit quantisation produces at least 1 bin from 4-primary image'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=7bit] must not throw');
      assert.strictEqual(output!.colorCount, 4, '[cell=3, scenario=7bit] 4 fine-grained bins for 4 distinct primaries');
    },
    'input': {
      'histogramBits': 7,
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0), ImageFixture.pixel(0, 0, 255), ImageFixture.pixel(255, 255, 0)]
    },
    'kind': 'edge',
    'name': '7-bit quantisation treats 4 distinct primaries as separate bins'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bits-clamp-low] must not throw for bits=0');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=bits-clamp-low] at least one bin after clamp');
    },
    'input': {
      'histogramBits': 0,
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0)]
    },
    'kind': 'edge',
    'name': 'out-of-range bits (0) is clamped to 3 without error'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=3, scenario=bits-clamp-high] must not throw for bits=99');
      assert.ok(output!.colorCount >= 1, '[cell=3, scenario=bits-clamp-high] at least one bin after clamp');
    },
    'input': {
      'histogramBits': 99,
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0)]
    },
    'kind': 'edge',
    'name': 'out-of-range bits (99) is clamped to 7 without error'
  }
];

await new ScenarioRunner<HistogramBitsInput, HistogramBitsOutput>(
  'GalleryHistogram :: cell-3 :: histogram-bits-boundary',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [ImageFixture.imageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': { 'histogramBits': input.histogramBits } },
      'roles':     undefined,
      'runtime':   undefined
    });
    return { 'colorCount': state.colors.length };
  }
).run(histogramBitsScenarios);

// ---------------------------------------------------------------------------
// Cell 4 — OKLCH range filters (lightnessRange / chromaRange)
//
// When metadata.gallery.lightnessRange or chromaRange is set, pixels outside
// the envelope are dropped from binning. Pixels inside the envelope survive.
// Filtering should not throw; it may result in fewer bins.
// ---------------------------------------------------------------------------

type RangeFilterInput = {
  readonly 'chromaRange'?:    readonly [number, number];
  readonly 'expectedAtLeast': number;
  readonly 'expectedAtMost':  number;
  readonly 'lightnessRange'?: readonly [number, number];
  readonly 'pixels':          readonly [number, number, number, number][];
};
abstract class RangeFilterOutput {
  abstract readonly 'colorCount': number;
}

const rangeFilterScenarios: readonly ScenarioInterface<RangeFilterInput, RangeFilterOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=full-l-range] must not throw');
      assert.ok(output!.colorCount >= 1, '[cell=4, scenario=full-l-range] at least one bin');
      assert.ok(output!.colorCount <= 3, '[cell=4, scenario=full-l-range] at most 3 bins');
    },
    'input': {
      'expectedAtLeast': 1,
      'expectedAtMost': 3,
      'lightnessRange': [0, 1],
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0), ImageFixture.pixel(0, 0, 0)]
    },
    'kind': 'happy',
    'name': 'lightnessRange [0,1] (full) passes all pixels'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=high-l-range] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=4, scenario=high-l-range] only near-white survives');
    },
    'input': {
      'expectedAtLeast': 1,
      'expectedAtMost': 1,
      'lightnessRange': [0.9, 1],
      'pixels': [
        ImageFixture.pixel(255, 255, 255),  // very light — L ≈ 1.0, should pass
        ImageFixture.pixel(255, 0, 0),      // pure red — L ≈ 0.63, should fail lightness filter
        ImageFixture.pixel(0, 0, 0)        // black — L = 0, should fail
      ]
    },
    'kind': 'edge',
    'name': 'lightnessRange [0.9, 1] keeps only near-white pixels'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=low-c-range] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=4, scenario=low-c-range] only grey survives chroma filter');
    },
    'input': {
      'chromaRange': [0, 0.01],
      'expectedAtLeast': 1,
      'expectedAtMost': 1,
      'pixels': [
        ImageFixture.pixel(128, 128, 128),  // grey — C ≈ 0, should pass
        ImageFixture.pixel(255, 0, 0),      // red — C ≈ 0.26, should fail chroma filter
        ImageFixture.pixel(0, 0, 255)      // blue — C ≈ 0.31, should fail chroma filter
      ]
    },
    'kind': 'edge',
    'name': 'chromaRange [0, 0.01] keeps only near-neutral pixels (greys)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=4, scenario=impossible-range] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=4, scenario=impossible-range] all pixels filtered out');
    },
    'input': {
      'expectedAtLeast': 0,
      'expectedAtMost': 0,
      'lightnessRange': [1.1, 1.2],
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0)]
    },
    'kind': 'edge',
    'name': 'impossible range [1.1, 1.2] drops all pixels — zero bins, no throw'
  }
];

await new ScenarioRunner<RangeFilterInput, RangeFilterOutput>(
  'GalleryHistogram :: cell-4 :: oklch-range-filters',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const galleryMeta: Record<string, JsonValueType> = {};
    if (input.lightnessRange !== undefined) {galleryMeta.lightnessRange = [...input.lightnessRange];}
    if (input.chromaRange    !== undefined) {galleryMeta.chromaRange    = [...input.chromaRange];}
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [ImageFixture.imageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': galleryMeta },
      'roles':     undefined,
      'runtime':   undefined
    });
    return { 'colorCount': state.colors.length };
  }
).run(rangeFilterScenarios);

// ---------------------------------------------------------------------------
// Cell 5 — empty input (no-op behavior)
//
// When state.colors is empty after intake (e.g. zero-byte image or an
// input object with no matching ImageData), gallery:histogram must not
// throw. state.colors remains empty; no histogram metadata is written
// (the task returns early on empty input).
// ---------------------------------------------------------------------------

abstract class EmptyInputInput {
  abstract readonly 'colors': (JsonValueType | { 'data': Uint8ClampedArray; 'height': number; 'width': number })[];
}
abstract class EmptyInputOutput {
  abstract readonly 'colorCount': number;
}

const emptyInputScenarios: readonly ScenarioInterface<EmptyInputInput, EmptyInputOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=empty-colors] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=5, scenario=empty-colors] no bins');
    },
    'input': { 'colors': [] },
    'kind': 'edge',
    'name': 'empty colors array does not throw'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=5, scenario=zero-dimensions] must not throw');
      assert.strictEqual(output!.colorCount, 0, '[cell=5, scenario=zero-dimensions] zero dimensions = no pixels');
    },
    'input': { 'colors': [{ 'data': new Uint8ClampedArray(0), 'height': 0, 'width': 0 }] },
    'kind': 'edge',
    'name': 'zero-by-zero ImageData does not throw'
  }
];

await new ScenarioRunner<EmptyInputInput, EmptyInputOutput>(
  'GalleryHistogram :: cell-5 :: empty-input',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    input.colors,
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    });
    return { 'colorCount': state.colors.length };
  }
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

type GeometryInput = {
  readonly 'imageWidth'?: number;
  readonly 'pixels':      readonly [number, number, number, number][];
};
abstract class GeometryOutput {
  abstract readonly 'colorCount': number;
  abstract readonly 'totalWeight': number;
}

const geometryScenarios: readonly ScenarioInterface<GeometryInput, GeometryOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=1x1] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=1x1] one bin');
      assert.strictEqual(output!.totalWeight, 1, '[cell=6, scenario=1x1] weight = 1');
    },
    'input': { 'pixels': [ImageFixture.pixel(100, 150, 200)] },
    'kind': 'edge',
    'name': '1×1 image — single pixel produces one bin'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=tall-single-col] must not throw');
      assert.strictEqual(output!.totalWeight, 500, '[cell=6, scenario=tall-single-col] 500 pixels accounted');
      assert.ok(output!.colorCount >= 1, '[cell=6, scenario=tall-single-col] at least one bin');
    },
    'input': {
      'imageWidth': 1,
      'pixels': Array<null>(500).fill(null).map((_value, index) => {
        const pixel = ImageFixture.pixel(index % 256, (index * 2) % 256, (index * 3) % 256);
        return pixel;
      })
    },
    'kind': 'edge',
    'name': '1-wide × 500-tall image — all pixels accounted'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=1000px] must not throw');
      assert.strictEqual(output!.totalWeight, 1000, '[cell=6, scenario=1000px] 1000 pixels accounted');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=1000px] one bin for uniform color');
    },
    'input': {
      'pixels': Array<null>(1000).fill(null).map(() => { const pixel = ImageFixture.pixel(128, 0, 64); return pixel; })
    },
    'kind': 'edge',
    'name': '1000-pixel image — weight totals to 1000'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=black] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=black] one bin for black');
    },
    'input': { 'pixels': [ImageFixture.pixel(0, 0, 0)] },
    'kind': 'edge',
    'name': 'pure-black 1×1 image — black pixel binned (L ≈ 0)'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6, scenario=white] must not throw');
      assert.strictEqual(output!.colorCount, 1, '[cell=6, scenario=white] one bin for white');
    },
    'input': { 'pixels': [ImageFixture.pixel(255, 255, 255)] },
    'kind': 'edge',
    'name': 'pure-white 1×1 image — white pixel binned (L ≈ 1)'
  }
];

await new ScenarioRunner<GeometryInput, GeometryOutput>(
  'GalleryHistogram :: cell-6 :: image-geometry-extremes',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);
    const imageData = ImageFixture.imageData(input.pixels, input.imageWidth);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [imageData],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  undefined,
      'roles':     undefined,
      'runtime':   undefined
    });
    const totalWeight = state.colors.reduce((s, c) => {return s + (c.hints?.weight ?? 0);}, 0);
    return { 'colorCount': state.colors.length, 'totalWeight': totalWeight };
  }
).run(geometryScenarios);

// ---------------------------------------------------------------------------
// Cell 6b — wide-gamut and extract integration
//
// gallery:extract after gallery:histogram must produce ≤ K clusters from
// a large image, preserving total weight. Wide-gamut (high-chroma) colors
// supplied via hex go through gamut-mapping in colorRecordFactory; the
// histogram and extract must handle these without crashing.
// ---------------------------------------------------------------------------

type ExtractIntegrationInput = {
  readonly 'algorithm': 'median-cut' | 'delta-e';
  readonly 'k':         number;
  readonly 'pixels':    readonly [number, number, number, number][];
};
abstract class ExtractIntegrationOutput {
  abstract readonly 'resultCount': number;
  abstract readonly 'totalWeight': number;
}

const extractIntegrationScenarios: readonly ScenarioInterface<ExtractIntegrationInput, ExtractIntegrationOutput>[] = [
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=median-cut-3color] must not throw');
      assert.ok(output!.resultCount <= 3, '[cell=6b, scenario=median-cut-3color] ≤ k clusters');
      assert.strictEqual(output!.totalWeight, 300, '[cell=6b, scenario=median-cut-3color] total weight preserved');
    },
    'input': {
      'algorithm': 'median-cut',
      'k': 3,
      'pixels': [
        ...Array<null>(100).fill(null).map(() => { const pixel = ImageFixture.pixel(255, 0, 0); return pixel; }),
        ...Array<null>(100).fill(null).map(() => { const pixel = ImageFixture.pixel(0, 255, 0); return pixel; }),
        ...Array<null>(100).fill(null).map(() => { const pixel = ImageFixture.pixel(0, 0, 255); return pixel; })
      ]
    },
    'kind': 'happy',
    'name': 'median-cut reduces 300-pixel 3-color image to ≤ k=3 clusters'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=delta-e-4color] must not throw');
      assert.ok(output!.resultCount <= 3, `[cell=6b, scenario=delta-e-4color] ≤ k=3 clusters, got ${String(output?.resultCount)}`);
      assert.strictEqual(output!.totalWeight, 320, '[cell=6b, scenario=delta-e-4color] total weight preserved');
    },
    'input': {
      'algorithm': 'delta-e',
      'k': 3,
      'pixels': [
        ...Array<null>(80).fill(null).map(() => { const pixel = ImageFixture.pixel(200, 10, 10); return pixel; }),
        ...Array<null>(80).fill(null).map(() => { const pixel = ImageFixture.pixel(210, 20, 20); return pixel; }),
        ...Array<null>(80).fill(null).map(() => { const pixel = ImageFixture.pixel(10, 200, 10); return pixel; }),
        ...Array<null>(80).fill(null).map(() => { const pixel = ImageFixture.pixel(10, 10, 200); return pixel; })
      ]
    },
    'kind': 'happy',
    'name': 'delta-e reduces 320-pixel 4-color image to ≤ k=3 clusters'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=k=1] must not throw');
      assert.strictEqual(output!.resultCount, 1, '[cell=6b, scenario=k=1] exactly 1 cluster for k=1');
    },
    'input': {
      'algorithm': 'median-cut',
      'k': 1,
      'pixels': [
        ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0), ImageFixture.pixel(0, 0, 255),
        ImageFixture.pixel(255, 255, 0), ImageFixture.pixel(255, 0, 255), ImageFixture.pixel(0, 255, 255)
      ]
    },
    'kind': 'edge',
    'name': 'k=1 collapses all pixels to single representative'
  },
  {
    'assert': function(output, error) {
      assert.strictEqual(error, undefined, '[cell=6b, scenario=k-exceeds-bins] must not throw');
      assert.ok(output!.resultCount <= 2, '[cell=6b, scenario=k-exceeds-bins] cannot exceed available bins');
    },
    'input': {
      'algorithm': 'median-cut',
      'k': 100,
      'pixels': [ImageFixture.pixel(255, 0, 0), ImageFixture.pixel(0, 255, 0)]
    },
    'kind': 'edge',
    'name': 'k larger than bin count returns all bins (no phantom colors)'
  }
];

await new ScenarioRunner<ExtractIntegrationInput, ExtractIntegrationOutput>(
  'GalleryHistogram :: cell-6b :: extract-integration',
  (input) => {
    const engine = ImageFixture.engine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);
    const state = engine.run({
      'bypass':    undefined,
      'colors':    [ImageFixture.imageData(input.pixels)],
      'contrast':  undefined,
      'emit':      undefined,
      'maxColors': undefined,
      'metadata':  { 'gallery': { 'algorithm': input.algorithm, 'k': input.k } },
      'roles':     undefined,
      'runtime':   undefined
    });
    const totalWeight = state.colors.reduce((s, c) => {return s + (c.hints?.weight ?? 0);}, 0);
    return { 'resultCount': state.colors.length, 'totalWeight': totalWeight };
  }
).run(extractIntegrationScenarios);

// ---------------------------------------------------------------------------
// Golden fixture — algorithm metadata round-trip
//
// Byte-identical behavior check: state.metadata.gallery.algorithm must
// echo back the algorithm string supplied in metadata.gallery.algorithm.
// Kept as a bare test because it is a single golden assertion.
// ---------------------------------------------------------------------------

await test('GalleryHistogram :: golden :: algorithm string round-trips through state.metadata.gallery', () => {
  const engine = ImageFixture.engine();
  engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

  const pixels: [number, number, number, number][] = [
    [255, 0, 0, 255], [255, 0, 0, 255], [255, 0, 0, 255],
    [0, 255, 0, 255], [0, 255, 0, 255]
  ];
  const state = engine.run({
    'bypass':    undefined,
    'colors':    [ImageFixture.imageData(pixels)],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'gallery': { 'algorithm': 'median-cut', 'k': 2 } },
    'roles':     undefined,
    'runtime':   undefined
  });

  const meta = state.metadata.gallery as { 'algorithm'?: string } | undefined;
  assert.strictEqual(
    meta?.algorithm,
    'median-cut',
    '[golden, scenario=algorithm-round-trip] algorithm value must echo back from metadata'
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

await test('GalleryHistogram :: regression :: saturated hues survive extraction despite dominant near-black background', () => {
  const engine = ImageFixture.engine();
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
          background.push(ImageFixture.pixel(r * 8, g * 8, b * 8));
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
    [240, 130, 10]  // orange
  ];
  const saturatedPatches: [number, number, number, number][] = [];
  for (const [r, g, b] of hues) {
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 5; k++) {
        const jr = i * 8 - 16;
        const jg = k * 8 - 16;
        saturatedPatches.push(ImageFixture.pixel(
          Math.max(0, Math.min(255, r + jr)),
          Math.max(0, Math.min(255, g + jg)),
          b
        ));
      }
    }
  }
  const pixels = [...background, ...saturatedPatches];

  const state = engine.run({
    'bypass':    undefined,
    'colors':    [ImageFixture.imageData(pixels)],
    'contrast':  undefined,
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  {
      'gallery': {
        'algorithm': 'delta-e',
        'deltaECap': 128,
        'k':         8
      }
    },
    'roles':     undefined,
    'runtime':   undefined
  });

  const chromaticOutputs = state.colors.filter((c) => {return c.oklch.c >= 0.15;});
  assert.ok(
    chromaticOutputs.length >= 3,
    '[regression, scenario=black-bg-vs-saturated-hues] expected ≥3 high-chroma (c≥0.15) colors in output, ' +
      `got ${String(chromaticOutputs.length)} of ${String(state.colors.length)}: ${
        state.colors.map((c) => { const result = `${c.hex}(c=${c.oklch.c.toFixed(3)})`; return result; }).join(', ')}`
  );
});
