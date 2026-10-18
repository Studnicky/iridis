import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { CliExitError } from '@studnicky/errors/node';
import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';

import { ConfigLoader }   from './ConfigLoader.ts';
import { OutputWriter }   from './OutputWriter.ts';
import { PluginResolver } from './PluginResolver.ts';

/**
 * Collects the union of `state.outputs.*` slot names that a pipeline's tasks
 * declare they will write. Manifest `writes` entries use dot-notation
 * (`outputs.cssVars`); only entries prefixed with `outputs.` contribute a
 * slot name. Entries without that prefix (e.g. `colors`, `roles`) are top-
 * level state keys that do not map to `output.files` and are skipped.
 */
class WrittenSlotCollector {
  static collect(engine: Engine, pipeline: readonly string[]): Set<string> {
    const slots = new Set<string>();
    for (let pipelineIndex = 0; pipelineIndex < pipeline.length; pipelineIndex += 1) {
      const name = pipeline[pipelineIndex];
      if (name === undefined) {
        continue;
      }
      const task = engine.tasks.resolve(name);
      const writes = task.manifest?.writes ?? [];
      for (let writeIndex = 0; writeIndex < writes.length; writeIndex += 1) {
        const entry = writes[writeIndex];
        if (entry?.startsWith('outputs.') === true) {
          slots.add(entry.slice('outputs.'.length));
        }
      }
    }
    return slots;
  }
}

export class Cli {
  async run(configPath: string): Promise<{ readonly 'outputsWritten': readonly string[]; readonly 'state': PaletteStateInterface; }> {
    const loader   = new ConfigLoader();
    const resolver = new PluginResolver();
    const writer   = new OutputWriter();

    const config  = await loader.load(configPath);
    const plugins = await resolver.resolve(config);

    const engine = new Engine();

    for (let taskIndex = 0; taskIndex < coreTasks.length; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    for (let pluginIndex = 0; pluginIndex < plugins.length; pluginIndex += 1) {
      const plugin = plugins[pluginIndex];
      if (plugin !== undefined) {
        engine.adopt(plugin);
      }
    }

    engine.pipeline(config.pipeline);

    const declaredFileKeys = Object.keys(config.output.files);
    if (declaredFileKeys.length > 0) {
      const writtenSlots  = WrittenSlotCollector.collect(engine, config.pipeline);
      const unwrittenKeys = declaredFileKeys.filter((key) => {
        const isUnwritten = !writtenSlots.has(key);
        return isUnwritten;
      });

      if (unwrittenKeys.length > 0) {
        const produced = writtenSlots.size > 0
          ? `Slots produced by this pipeline: ${[...writtenSlots].join(', ')}.`
          : 'No tasks in this pipeline produce any output slots.';
        const error = new CliExitError(1);
        error.message = `Config error: output.files references slot(s) that no pipeline task writes: ${unwrittenKeys.join(', ')}. ${produced}`;
        throw error;
      }
    }

    const state          = engine.run(config.input);
    const outputsWritten = await writer.write(state, config);
    const result = { 'outputsWritten': outputsWritten, 'state': state };
    return result;
  }
}
