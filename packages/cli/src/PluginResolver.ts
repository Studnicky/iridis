import type { PluginInterface } from '@studnicky/iridis';
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
  'enableVscode':     '@studnicky/iridis-vscode',
  'enableStylesheet': '@studnicky/iridis-stylesheet',
  'enableTailwind':   '@studnicky/iridis-tailwind',
  'enableImage':      '@studnicky/iridis-image',
  'enableContrast':   '@studnicky/iridis-contrast',
  'enableCapacitor':  '@studnicky/iridis-capacitor',
  'enableRdf':        '@studnicky/iridis-rdf',
} as const;

const PLUGIN_EXPORT_NAMES: Readonly<Record<FlagKey, string>> = {
  'enableVscode':     'vscodePlugin',
  'enableStylesheet': 'stylesheetPlugin',
  'enableTailwind':   'tailwindPlugin',
  'enableImage':      'imagePlugin',
  'enableContrast':   'contrastPlugin',
  'enableCapacitor':  'capacitorPlugin',
  'enableRdf':        'reasoningPlugin',
} as const;

export class PluginResolver {
  async resolve(config: CliConfigInterface): Promise<readonly PluginInterface[]> {
    const plugins: PluginInterface[] = [];

    for (const flag of Object.keys(PLUGIN_PACKAGES) as FlagKey[]) {
      if (!config[flag]) {
        continue;
      }

      const packageName  = PLUGIN_PACKAGES[flag];
      const exportName   = PLUGIN_EXPORT_NAMES[flag];
      const pluginModule = await import(packageName) as Record<string, unknown>;
      const plugin       = pluginModule[exportName];

      if (!plugin || typeof (plugin as PluginInterface).tasks !== 'function') {
        throw new Error(`Package ${packageName} does not export a valid plugin as '${exportName}'`);
      }

      plugins.push(plugin as PluginInterface);
    }

    return plugins;
  }
}
