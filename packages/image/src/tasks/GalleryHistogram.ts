import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { colorRecordFactory } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

/**
 * `gallery:histogram`
 *
 * Bucket every record in `state.colors` into a 5-bit-per-channel sRGB
 * histogram (32 768 bins). Replaces `state.colors` with one weighted
 * `ColorRecordInterfaceType` per non-empty bin: the centroid is the
 * weighted-mean RGB of the bin's contributors, and `hints.weight` is
 * the count. Downstream clustering tasks (median-cut, deltaE-merge)
 * read `hints.weight` and proportionally cluster by pixel density.
 *
 * Records also flow through `metadata.gallery.histogram`:
 *   bins:        readonly { 'hex': string; 'weight': number }[]
 *   totalPixels: number    (sum of weights ≈ original pixel count)
 *
 * Design notes:
 *   - 5-bit packing → 32 768 max bins, more than enough to disambiguate
 *     visually-distinct colours while staying cheap for the deltaE-merge
 *     reducer (which is O(N²) over bins).
 *   - Input weights are respected: a record that arrives with
 *     `hints.weight = w` contributes `w` to its bin, not `1`. Callers
 *     can therefore stack histograms.
 *   - Records with `alpha === 0` are skipped; transparent pixels
 *     should not bias clustering.
 */

type BinAccumulatorInterface = {
  'aSum':   number;
  'bSum':   number;
  'gSum':   number;
  'rSum':   number;
  'weight': number;
};

const DEFAULT_BITS_PER_CHANNEL = 5;

/** Accepts either a single range or a list of ranges (union) so callers who only need one envelope don't have to wrap it. */
type RangeOrRangesType = readonly [number, number] | readonly (readonly [number, number])[];

class RangeList {
  static to(range: RangeOrRangesType): readonly (readonly [number, number])[] {
    return typeof range[0] === 'number' ? [range as readonly [number, number]] : range as readonly (readonly [number, number])[];
  }
}

/** True if `v` falls inside any range in the list — multiple ranges are a union, not required to be contiguous. */
function inAnyRange(v: number, ranges: readonly (readonly [number, number])[]): boolean {
  const result = ranges.some(([lo, hi]) => {return v >= lo && v <= hi;});
  return result;
}

function packBin(r: number, g: number, b: number, bits: number): number {
  // r,g,b are sRGB 0..1 floats; quantise to (2^bits) levels per channel
  // and pack into a single integer key.
  const levels = 1 << bits;
  const denom = 256 / levels;
  const ri = Math.min(levels - 1, Math.floor((r * 255) / denom));
  const gi = Math.min(levels - 1, Math.floor((g * 255) / denom));
  const bi = Math.min(levels - 1, Math.floor((b * 255) / denom));
  return (ri << (2 * bits)) | (gi << bits) | bi;
}

class GalleryHistogram implements TaskInterface {
  readonly 'name' = 'gallery:histogram';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Quantise pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid.',
    'name':        'gallery:histogram',
    'reads':       ['colors'],
    'writes':      ['colors', 'metadata.gallery:histogram']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.colors.length === 0) {
      ctx.logger.warn(
        LogBody.create()
          .component('GalleryHistogram')
          .operation('run')
          .status(LOG_STATUS.INVALID)
          .message('state.colors is empty; nothing to histogram')
          .context({})
          .build()
      );
      return;
    }

    const galleryConfig = state.metadata.gallery as
      | { 'chromaRange'?: RangeOrRangesType; 'histogramBits'?: number; 'lightnessRange'?: RangeOrRangesType; }
      | undefined;
    const rawBits = galleryConfig?.histogramBits ?? DEFAULT_BITS_PER_CHANNEL;
    const bits = Math.max(3, Math.min(7, Math.floor(rawBits)));
    const lRanges = RangeList.to(galleryConfig?.lightnessRange ?? [0, 1] as const);
    const cRanges = RangeList.to(galleryConfig?.chromaRange    ?? [0, 0.5] as const);

    const bins = new Map<number, BinAccumulatorInterface>();
    let totalPixels = 0;
    let droppedFiltered = 0;

    for (const c of state.colors) {
      if (c.alpha === 0) {continue;}
      // Range filters skip pixels outside the requested OKLCH lightness
      // or chroma envelope(s). Useful for ignoring black bars (low L) or
      // a near-neutral background (low C) so the cluster budget goes
      // toward the colors the user actually cares about. Each envelope is a
      // UNION of ranges — e.g. two disjoint lightness bands can both be kept
      // at once without also keeping the midtones between them.
      if (!inAnyRange(c.oklch.l, lRanges)) { droppedFiltered++; continue; }
      if (!inAnyRange(c.oklch.c, cRanges)) { droppedFiltered++; continue; }
      const w = (typeof c.hints?.weight === 'number' && c.hints.weight > 0) ? c.hints.weight : 1;
      const key = packBin(c.rgb.r, c.rgb.g, c.rgb.b, bits);
      const existing = bins.get(key);
      if (existing === undefined) {
        bins.set(key, {
          'aSum':   c.alpha * w,
          'bSum':   c.rgb.b * w,
          'gSum':   c.rgb.g * w,
          'rSum':   c.rgb.r * w,
          'weight': w
        });
      } else {
        existing.rSum   += c.rgb.r * w;
        existing.gSum   += c.rgb.g * w;
        existing.bSum   += c.rgb.b * w;
        existing.aSum   += c.alpha * w;
        existing.weight += w;
      }
      totalPixels += w;
    }

    const records: ColorRecordInterfaceType[] = [];
    const binSummary: { 'hex': string; 'weight': number }[] = [];
    for (const acc of bins.values()) {
      const r = acc.rSum / acc.weight;
      const g = acc.gSum / acc.weight;
      const b = acc.bSum / acc.weight;
      const a = acc.aSum / acc.weight;
      const record = colorRecordFactory.fromRgb(r, g, b, { 'alpha': a, 'hints': { 'weight': acc.weight }, 'sourceFormat': 'imagePixel' });
      records.push(record);
      binSummary.push({ 'hex': record.hex, 'weight': acc.weight });
    }

    binSummary.sort((x, y) => {return y.weight - x.weight;});

    state.metadata['gallery:histogram'] = {
      'binCount':    binSummary.length,
      'bins':        binSummary,
      'totalPixels': totalPixels
    };

    state.colors.splice(0, state.colors.length, ...records);

    ctx.logger.info(
      LogBody.create()
        .component('GalleryHistogram')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('histogram built')
        .context({
          'bins':            binSummary.length,
          'bitsPerChannel':  bits,
          'droppedFiltered': droppedFiltered,
          'inputPixels':     totalPixels
        })
        .build()
    );
  }
}

/** Singleton instance registered as the `gallery:histogram` pipeline task. */
export const galleryHistogram = new GalleryHistogram();
