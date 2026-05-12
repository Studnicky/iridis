import type { ColorRecordInterface } from '@studnicky/iridis';

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'gallery': {
      'k'?:                number;
      'dominantColors'?:   ColorRecordInterface[];
      'harmonized'?:       boolean;
      'harmonizeDetails'?: {
        readonly 'before':   string;
        readonly 'after':    string;
        readonly 'deltaE':   number;
        readonly 'hueShift': number;
      };
    };
  }
}
