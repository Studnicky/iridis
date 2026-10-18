import type {
  PluginInterface,
  TaskInterface
} from '@studnicky/iridis';

import { PluginSchemaContributionInterfaceEntity } from '@studnicky/iridis';

import { reasonAnnotate }  from './tasks/ReasonAnnotate.ts';
import { reasonSerialize } from './tasks/ReasonSerialize.ts';

/**
 * RdfPlugin
 *
 * Annotates the palette as N-Quads under outputs['rdf:reasoningGraph'] and
 * serializes that graph to the requested format under outputs['rdf:serialized'].
 *
 * Slot registry (flat colon-namespaced keys):
 *   outputs['rdf:reasoningGraph'] — serialized N-Quads string written by reason:annotate
 *   outputs['rdf:serialized']     — serialized Turtle/TriG/N-Quads/JSON-LD string
 *   metadata['rdf:format']        — format hint read by reason:serialize
 *
 * Peer dependency: `n3` (optional, browser-safe pure-JS).
 * If n3 is absent, tasks log an error and skip; they do not throw.
 */
export class RdfPlugin implements PluginInterface {
  readonly 'name'    = 'rdf';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [reasonAnnotate, reasonSerialize];
  }

  schemas(): PluginSchemaContributionInterfaceEntity.Type {
    const result = PluginSchemaContributionInterfaceEntity.create({
      'metadata': {
        'rdf:format': { 'description': 'Serialization format hint for reason:serialize (string; invalid values fall back to Turtle)' }
      },
      'outputs': {
        'rdf:reasoningGraph': { 'description': 'Serialized N-Quads RDF triples for the palette', 'type': 'string' },
        'rdf:serialized':     { 'description': 'Serialized RDF graph (Turtle / TriG / N-Quads / JSON-LD)', 'type': 'string' }
      }
    });
    return result;
  }
}
