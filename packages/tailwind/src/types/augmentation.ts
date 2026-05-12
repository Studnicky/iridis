import type { TailwindOutputInterface } from './index.ts';

declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'tailwind': TailwindOutputInterface;
  }

  interface PluginMetadataRegistry {
    'cssVarPrefix': string;
  }
}
