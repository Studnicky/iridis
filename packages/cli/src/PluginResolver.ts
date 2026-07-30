import type { PluginInterface } from '@studnicky/iridis';

import { CliExitError } from '@studnicky/errors';

import type { FlagKeyEntity } from './entities/FlagKeyEntity.ts';

import { PLUGIN_PACKAGE_CONSTANTS } from './constants/PluginPackages.ts';

class PluginImporter {
  static async enableCapacitor(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-capacitor');
    return module.capacitorPlugin;
  }

  static async enableContrast(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-contrast');
    return module.contrastPlugin;
  }

  static async enableImage(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-image');
    return module.imagePlugin;
  }

  static async enableRdf(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-rdf');
    return module.rdfPlugin;
  }

  static async enableStylesheet(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-stylesheet');
    return module.stylesheetPlugin;
  }

  static async enableTailwind(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-tailwind');
    return module.tailwindPlugin;
  }

  static async enableVscode(): Promise<PluginInterface | null | undefined> {
    const module = await import('@studnicky/iridis-vscode');
    return module.vscodePlugin;
  }
}

const PLUGIN_IMPORTERS = {
  'enableCapacitor':  PluginImporter.enableCapacitor,
  'enableContrast':   PluginImporter.enableContrast,
  'enableImage':      PluginImporter.enableImage,
  'enableRdf':        PluginImporter.enableRdf,
  'enableStylesheet': PluginImporter.enableStylesheet,
  'enableTailwind':   PluginImporter.enableTailwind,
  'enableVscode':     PluginImporter.enableVscode
} satisfies Readonly<Record<FlagKeyEntity.Type, () => Promise<PluginInterface | null | undefined>>>;

export class PluginResolver {
  async resolve(config: Partial<Record<FlagKeyEntity.Type, boolean | undefined>>): Promise<readonly PluginInterface[]> {
    const plugins: PluginInterface[] = [];

    for (const flag of PLUGIN_PACKAGE_CONSTANTS.PLUGIN_FLAGS) {
      if (config[flag] !== true) {
        continue;
      }

      const packageName  = PLUGIN_PACKAGE_CONSTANTS.PACKAGES[flag];
      const exportName   = PLUGIN_PACKAGE_CONSTANTS.EXPORT_NAMES[flag];
      const plugin = await PLUGIN_IMPORTERS[flag]();

      if (plugin === undefined || plugin === null || typeof plugin.tasks !== 'function') {
        const error = new CliExitError(1);
        error.message = `Package ${packageName} does not export a valid plugin as '${exportName}'`;
        throw error;
      }

      plugins.push(plugin);
    }

    return plugins;
  }
}
