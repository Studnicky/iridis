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

abstract class BinAccumulator {
  abstract 'aSum': number;
  abstract 'bSum': number;
  abstract 'gSum': number;
  abstract 'rSum': number;
  abstract 'weight': number;
}

const DEFAULT_BITS_PER_CHANNEL = 5;

class RangeList {
  static to(
    range: readonly [number, number] | readonly (readonly [number, number])[]
  ): readonly (readonly [number, number])[] {
    return typeof range[0] === 'number' ? [range as readonly [number, number]] : range as readonly (readonly [number, number])[];
  }

  static contains(ranges: readonly (readonly [number, number])[], value: number): boolean {
    for (const [lowerBound, upperBound] of ranges) {
      if (value >= lowerBound && value <= upperBound) {return true;}
    }
    return false;
  }
}

class HistogramMath {
  static packBin(red: number, green: number, blue: number, bits: number): number {
    const levels = 1 << bits;
    const denominator = 256 / levels;
    const redIndex = Math.min(levels - 1, Math.floor((red * 255) / denominator));
    const greenIndex = Math.min(levels - 1, Math.floor((green * 255) / denominator));
    const blueIndex = Math.min(levels - 1, Math.floor((blue * 255) / denominator));
    return (redIndex << (2 * bits)) | (greenIndex << bits) | blueIndex;
  }
}

class GalleryHistogram implements TaskInterface {
  readonly 'name' = 'gallery:histogram';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Quantise pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid.',
    'name':        'gallery:histogram',
    'phase':       undefined,
    'reads':       ['colors'],
    'requires':    undefined,
    'writes':      ['colors', 'metadata.gallery:histogram']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (state.colors.length === 0) {
      context.logger.warn(
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
      | {
        'chromaRange'?: readonly [number, number] | readonly (readonly [number, number])[];
        'histogramBits'?: number;
        'lightnessRange'?: readonly [number, number] | readonly (readonly [number, number])[];
      }
      | undefined;
    const rawBits = galleryConfig?.histogramBits ?? DEFAULT_BITS_PER_CHANNEL;
    const bits = Math.max(3, Math.min(7, Math.floor(rawBits)));
    const lRanges = RangeList.to(galleryConfig?.lightnessRange ?? [0, 1] as const);
    const cRanges = RangeList.to(galleryConfig?.chromaRange    ?? [0, 0.5] as const);

    const bins = new Map<number, BinAccumulator>();
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
      const lightnessInRange = RangeList.contains(lRanges, c.oklch.l);
      if (!lightnessInRange) { droppedFiltered++; continue; }
      const chromaInRange = RangeList.contains(cRanges, c.oklch.c);
      if (!chromaInRange) { droppedFiltered++; continue; }
      const w = (typeof c.hints?.weight === 'number' && c.hints.weight > 0) ? c.hints.weight : 1;
      const key = HistogramMath.packBin(c.rgb.r, c.rgb.g, c.rgb.b, bits);
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
      const record = colorRecordFactory.fromRgb(r, g, b, { 'alpha': a, 'hints': { 'intent': undefined, 'role': undefined, 'weight': acc.weight }, 'sourceFormat': 'imagePixel' });
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

    context.logger.info(
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
