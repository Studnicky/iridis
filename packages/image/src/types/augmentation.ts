import type { ColorRecordInterface } from '@studnicky/iridis';

/**
 * Algorithm selector for `gallery:extract`. The `median-cut` value runs
 * the weighted median-cut primitive (fast, sub-millisecond on typical
 * histogram inputs). The `delta-e` value runs the agglomerative deltaE
 * merger (slower, O(N² log N), but groups visually-similar bins more
 * faithfully). Default when unset: `median-cut`.
 */
export type GalleryAlgorithmType = 'median-cut' | 'delta-e';

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'gallery': {
      'k'?:                  number;
      'algorithm'?:          GalleryAlgorithmType;
      'histogramBits'?:      number;     // bits per channel, 3..7
      'deltaECap'?:          number;     // max records fed into delta-e merger
      'harmonizeThreshold'?: number;     // deltaE below which accent gets nudged off frame
      'lightnessRange'?:     readonly [number, number];   // [min, max], 0..1, filter pixels outside
      'chromaRange'?:        readonly [number, number];   // [min, max], 0..0.4, filter pixels outside
      'dominantColors'?:     ColorRecordInterface[];
      'harmonized'?:         boolean;
      'harmonizeDetails'?: {
        readonly 'before':   string;
        readonly 'after':    string;
        readonly 'deltaE':   number;
        readonly 'hueShift': number;
      };
      'histogram'?: {
        readonly 'bins':        readonly { readonly 'hex': string; readonly 'weight': number }[];
        readonly 'totalPixels': number;
        readonly 'binCount':    number;
      };
    };
  }
}
