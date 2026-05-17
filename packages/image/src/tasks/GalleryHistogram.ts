import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { colorRecordFactory, getOrCreateMetadata } from '@studnicky/iridis';

/**
 * `gallery:histogram`
 *
 * Bucket every record in `state.colors` into a 5-bit-per-channel sRGB
 * histogram (32 768 bins). Replaces `state.colors` with one weighted
 * `ColorRecordInterface` per non-empty bin: the centroid is the
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
 *   - Records with `alpha === 0` are skipped — transparent pixels
 *     should not bias clustering.
 */

interface BinAccumulatorInterface {
  rSum:   number;
  gSum:   number;
  bSum:   number;
  aSum:   number;
  weight: number;
}

const DEFAULT_BITS_PER_CHANNEL = 5;

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

export class GalleryHistogram implements TaskInterface {
  readonly 'name' = 'gallery:histogram';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'gallery:histogram',
    'reads':       ['colors'],
    'writes':      ['colors', 'metadata.gallery.histogram'],
    'description': 'Quantise pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.colors.length === 0) {
      ctx.logger.warn('GalleryHistogram', 'run', 'state.colors is empty — nothing to histogram');
      return;
    }

    const galleryConfig = state.metadata['gallery'] as
      | { 'histogramBits'?: number; 'lightnessRange'?: readonly [number, number]; 'chromaRange'?: readonly [number, number] }
      | undefined;
    const rawBits = galleryConfig?.histogramBits ?? DEFAULT_BITS_PER_CHANNEL;
    const bits = Math.max(3, Math.min(7, Math.floor(rawBits)));
    const lRange = galleryConfig?.lightnessRange ?? [0, 1] as const;
    const cRange = galleryConfig?.chromaRange    ?? [0, 0.5] as const;

    const bins = new Map<number, BinAccumulatorInterface>();
    let totalPixels = 0;
    let droppedFiltered = 0;

    for (const c of state.colors) {
      if (c.alpha === 0) continue;
      // Range filters skip pixels outside the requested OKLCH lightness
      // or chroma envelope. Useful for ignoring black bars (low L) or
      // a near-neutral background (low C) so the cluster budget goes
      // toward the colors the user actually cares about.
      if (c.oklch.l < lRange[0] || c.oklch.l > lRange[1]) { droppedFiltered++; continue; }
      if (c.oklch.c < cRange[0] || c.oklch.c > cRange[1]) { droppedFiltered++; continue; }
      const w = (typeof c.hints?.weight === 'number' && c.hints.weight > 0) ? c.hints.weight : 1;
      const key = packBin(c.rgb.r, c.rgb.g, c.rgb.b, bits);
      const existing = bins.get(key);
      if (existing === undefined) {
        bins.set(key, {
          'rSum':   c.rgb.r * w,
          'gSum':   c.rgb.g * w,
          'bSum':   c.rgb.b * w,
          'aSum':   c.alpha * w,
          'weight': w,
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

    const records: ColorRecordInterface[] = [];
    const binSummary: { 'hex': string; 'weight': number }[] = [];
    for (const acc of bins.values()) {
      const r = acc.rSum / acc.weight;
      const g = acc.gSum / acc.weight;
      const b = acc.bSum / acc.weight;
      const a = acc.aSum / acc.weight;
      const record = colorRecordFactory.fromRgb(r, g, b, a, 'imagePixel', { 'weight': acc.weight });
      records.push(record);
      binSummary.push({ 'hex': record.hex, 'weight': acc.weight });
    }

    binSummary.sort((x, y) => y.weight - x.weight);

    const galleryMeta = getOrCreateMetadata(state, 'gallery');
    galleryMeta['histogram'] = {
      'bins':        binSummary,
      'totalPixels': totalPixels,
      'binCount':    binSummary.length,
    };

    state.colors.splice(0, state.colors.length, ...records);

    ctx.logger.info('GalleryHistogram', 'run', 'histogram built', {
      'inputPixels':     totalPixels,
      'bins':            binSummary.length,
      'bitsPerChannel':  bits,
      'droppedFiltered': droppedFiltered,
    });
  }
}

/** Singleton instance registered as the `gallery:histogram` pipeline task. */
export const galleryHistogram = new GalleryHistogram();
