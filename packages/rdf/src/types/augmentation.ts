/**
 * Structural interface for an n3 Store or any iterable quad container.
 * Quads are typed as unknown to avoid cross-package type conflicts between
 * @types/n3 and @rdfjs/types under exactOptionalPropertyTypes.
 */
export interface IterableStoreInterface {
  [Symbol.iterator](): Iterator<unknown>;
}

declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'reasoning': {
      'serialized'?: string;
      'graph'?:      IterableStoreInterface;
    };
  }

  interface PluginMetadataRegistry {
    'reasoning': {
      'format'?: string;
    };
  }
}

export type {};
