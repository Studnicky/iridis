// `cli` is the iridis binary, not a plugin: no PluginInterface singleton is exported.
// The exported classes compose into the `iridis` bin entry at `./src/main.ts`.
export { Cli }              from './Cli.ts';
export { ConfigLoader }     from './ConfigLoader.ts';
export { PluginResolver }   from './PluginResolver.ts';
export { OutputWriter }     from './OutputWriter.ts';
export { CliConfigSchema }  from './CliConfigSchema.ts';
export type { CliConfigInterface } from './types/index.ts';
