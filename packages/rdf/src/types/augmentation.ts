declare module '@studnicky/iridis' {
  interface PluginOutputsRegistry {
    'reasoning': {
      'serialized'?: string;
    };
  }

  interface PluginMetadataRegistry {
    'reasoning': {
      'format'?: string;
    };
  }
}

export type {};
