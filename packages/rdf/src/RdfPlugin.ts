import type {
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { reasonAnnotate }  from './tasks/ReasonAnnotate.ts';
import { reasonSerialize } from './tasks/ReasonSerialize.ts';

/**
 * RdfPlugin
 *
 * Annotates the palette with RDF triples (n3 Store → state.graph) and
 * serializes the graph to the requested format.
 *
 * Peer dependency: `n3` (optional, browser-safe pure-JS).
 * If n3 is absent, tasks log an error and skip — they do not throw.
 */
export class RdfPlugin implements PluginInterface {
  readonly 'name'    = 'rdf';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [reasonAnnotate, reasonSerialize];
  }
}

export const rdfPlugin = new RdfPlugin();
