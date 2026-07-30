import type { FlagKeyEntity } from '../entities/FlagKeyEntity.ts';
import type { PluginPackageMapEntity } from '../entities/PluginPackageMapEntity.ts';

/**
 * The package name and export name each optional plugin flag resolves to.
 * Grouped under one frozen object so `PluginResolver` has a single import
 * for both maps.
 */
export const PLUGIN_PACKAGE_CONSTANTS = {
  'EXPORT_NAMES': {
    'enableCapacitor':  'capacitorPlugin',
    'enableContrast':   'contrastPlugin',
    'enableImage':      'imagePlugin',
    'enableRdf':        'rdfPlugin',
    'enableStylesheet': 'stylesheetPlugin',
    'enableTailwind':   'tailwindPlugin',
    'enableVscode':     'vscodePlugin'
  } satisfies PluginPackageMapEntity.Type,
  'PACKAGES': {
    'enableCapacitor':  '@studnicky/iridis-capacitor',
    'enableContrast':   '@studnicky/iridis-contrast',
    'enableImage':      '@studnicky/iridis-image',
    'enableRdf':        '@studnicky/iridis-rdf',
    'enableStylesheet': '@studnicky/iridis-stylesheet',
    'enableTailwind':   '@studnicky/iridis-tailwind',
    'enableVscode':     '@studnicky/iridis-vscode'
  } satisfies PluginPackageMapEntity.Type,
  'PLUGIN_FLAGS': [
    'enableCapacitor',
    'enableContrast',
    'enableImage',
    'enableRdf',
    'enableStylesheet',
    'enableTailwind',
    'enableVscode'
  ] satisfies readonly FlagKeyEntity.Type[]
} as const;
