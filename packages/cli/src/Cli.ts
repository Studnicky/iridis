import { Engine }       from '@studnicky/iridis/engine';
import { mathBuiltins } from '@studnicky/iridis/math';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { PaletteStateInterface } from '@studnicky/iridis/model';
import { ConfigLoader }  from './ConfigLoader.ts';
import { PluginResolver } from './PluginResolver.ts';
import { OutputWriter }  from './OutputWriter.ts';

export class Cli {
  async run(configPath: string): Promise<{ readonly 'state': PaletteStateInterface; readonly 'outputsWritten': readonly string[] }> {
    const loader   = new ConfigLoader();
    const resolver = new PluginResolver();
    const writer   = new OutputWriter();

    const config  = await loader.load(configPath);
    const plugins = await resolver.resolve(config);

    const engine = new Engine();

    for (const primitive of mathBuiltins) {
      engine.math.register(primitive);
    }
    for (const task of coreTasks) {
      engine.tasks.register(task);
    }
    for (const plugin of plugins) {
      engine.adopt(plugin);
    }

    engine.pipeline(config.pipeline);

    const state          = await engine.run(config.input);
    const outputsWritten = await writer.write(state, config);

    return { 'state': state, 'outputsWritten': outputsWritten };
  }
}
