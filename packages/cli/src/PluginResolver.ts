import type { PluginInterface } from '@studnicky/iridis';

import { CliExitError } from '@studnicky/errors';

import type { CliConfigInterface } from './types/index.ts';

type FlagKey = keyof Pick<
  CliConfigInterface,
  | 'enableVscode'
  | 'enableStylesheet'
  | 'enableTailwind'
  | 'enableImage'
  | 'enableContrast'
  | 'enableCapacitor'
  | 'enableRdf'
>;

type PluginPackageMap = Readonly<Record<FlagKey, string>>;

const PLUGIN_PACKAGES: PluginPackageMap = {
  'enableCapacitor':  '@studnicky/iridis-capacitor',
  'enableContrast':   '@studnicky/iridis-contrast',
  'enableImage':      '@studnicky/iridis-image',
  'enableRdf':        '@studnicky/iridis-rdf',
  'enableStylesheet': '@studnicky/iridis-stylesheet',
  'enableTailwind':   '@studnicky/iridis-tailwind',
  'enableVscode':     '@studnicky/iridis-vscode'
} as const;

const PLUGIN_EXPORT_NAMES: Readonly<Record<FlagKey, string>> = {
  'enableCapacitor':  'capacitorPlugin',
  'enableContrast':   'contrastPlugin',
  'enableImage':      'imagePlugin',
  'enableRdf':        'rdfPlugin',
  'enableStylesheet': 'stylesheetPlugin',
  'enableTailwind':   'tailwindPlugin',
  'enableVscode':     'vscodePlugin'
} as const;

export class PluginResolver {
  async resolve(config: CliConfigInterface): Promise<readonly PluginInterface[]> {
    const plugins: PluginInterface[] = [];

    for (const flag of Object.keys(PLUGIN_PACKAGES) as FlagKey[]) {
      if (config[flag] !== true) {
        continue;
      }

      const packageName  = PLUGIN_PACKAGES[flag];
      const exportName   = PLUGIN_EXPORT_NAMES[flag];
      const pluginModule = await import(packageName) as Record<string, unknown>;
      const plugin       = pluginModule[exportName];

      if (plugin === undefined || plugin === null || typeof (plugin as PluginInterface).tasks !== 'function') {
        const error = new CliExitError(1);
        error.message = `Package ${packageName} does not export a valid plugin as '${exportName}'`;
        throw error;
      }

      plugins.push(plugin as PluginInterface);
    }

    return plugins;
  }
}
