import { Engine }       from '@studnicky/iridis/engine';
import { coreTasks }    from '@studnicky/iridis/tasks';
import type { PaletteStateInterface } from '@studnicky/iridis/model';
import { ConfigLoader }  from './ConfigLoader.ts';
import { PluginResolver } from './PluginResolver.ts';
import { OutputWriter }  from './OutputWriter.ts';

/**
 * Collects the union of `state.outputs.*` slot names that the given pipeline
 * tasks declare they will write. Manifest `writes` entries use dot-notation
 * (`outputs.cssVars`); only entries prefixed with `outputs.` contribute a
 * slot name. Entries without that prefix (e.g. `colors`, `roles`) are top-
 * level state keys that do not map to `output.files` and are skipped.
 */
function collectWrittenSlots(engine: Engine, pipeline: readonly string[]): Set<string> {
  const slots = new Set<string>();
  for (const name of pipeline) {
    const task = engine.tasks.resolve(name);
    for (const entry of task.manifest?.writes ?? []) {
      if (entry.startsWith('outputs.')) {
        slots.add(entry.slice('outputs.'.length));
      }
    }
  }
  return slots;
}

export class Cli {
  async run(configPath: string): Promise<{ readonly 'state': PaletteStateInterface; readonly 'outputsWritten': readonly string[] }> {
    const loader   = new ConfigLoader();
    const resolver = new PluginResolver();
    const writer   = new OutputWriter();

    const config  = await loader.load(configPath);
    const plugins = await resolver.resolve(config);

    const engine = new Engine();

    for (const task of coreTasks) {
      engine.tasks.register(task);
    }
    for (const plugin of plugins) {
      engine.adopt(plugin);
    }

    engine.pipeline(config.pipeline);

    const declaredFileKeys = Object.keys(config.output.files);
    if (declaredFileKeys.length > 0) {
      const writtenSlots  = collectWrittenSlots(engine, config.pipeline);
      const unwrittenKeys = declaredFileKeys.filter((k) => !writtenSlots.has(k));

      if (unwrittenKeys.length > 0) {
        const produced = writtenSlots.size > 0
          ? `Slots produced by this pipeline: ${[...writtenSlots].join(', ')}.`
          : 'No tasks in this pipeline produce any output slots.';
        throw new Error(
          `Config error: output.files references slot(s) that no pipeline task writes: ${unwrittenKeys.join(', ')}. ${produced}`,
        );
      }
    }

    const state          = await engine.run(config.input);
    const outputsWritten = await writer.write(state, config);

    return { 'state': state, 'outputsWritten': outputsWritten };
  }
}
