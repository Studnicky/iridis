import { Writer } from 'n3';
import type { Quad } from 'n3';

import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { getOrCreateMetadata, getOrCreateOutput } from '@studnicky/iridis';
import type { IterableStoreInterface } from '../types/augmentation.ts';

type SerializationFormatType = 'Turtle' | 'TriG' | 'N-Quads' | 'application/ld+json';

function resolveFormat(raw: unknown): SerializationFormatType {
  if (typeof raw !== 'string') {
    return 'Turtle';
  }
  const lower = raw.toLowerCase();

  if (lower === 'trig'   || lower === 'application/trig')                         return 'TriG';
  if (lower === 'nquads' || lower === 'n-quads' || lower === 'application/n-quads') return 'N-Quads';
  if (lower === 'jsonld' || lower === 'json-ld' || lower === 'application/ld+json') return 'application/ld+json';

  return 'Turtle';
}

function serializeStore(store: IterableStoreInterface, format: SerializationFormatType): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ 'format': format });

    for (const quad of store) {
      // quad is typed as unknown in IterableStoreInterface to avoid cross-package
      // @types/n3 vs @rdfjs/types conflicts; the store is always an n3 Store here.
      writer.addQuad(quad as Quad);
    }

    writer.end((err, result) => {
      if (err) {
        reject(err);

        return;
      }
      resolve(result);
    });
  });
}

export class ReasonSerialize implements TaskInterface {
  readonly 'name' = 'reason:serialize';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'reason:serialize',
    'reads':       ['outputs.reasoning.graph', 'metadata.reasoning.format'],
    'writes':      ['outputs.reasoning.serialized'],
    'description': 'Serialize outputs.reasoning.graph to Turtle / TriG / N-Quads / JSON-LD',
  };

  async run(state: PaletteStateInterface, ctx: PipelineContextInterface): Promise<void> {
    const graph = state.outputs.reasoning?.graph;
    if (!graph) {
      ctx.logger.warn('ReasonSerialize', 'run', 'outputs.reasoning.graph is absent — run reason:annotate first');

      return;
    }

    const reasoningMeta = getOrCreateMetadata(state, 'reasoning');
    const format        = resolveFormat(reasoningMeta['format']);

    ctx.logger.debug('ReasonSerialize', 'run', 'serializing graph', { 'format': format });

    let serialized: string;

    try {
      serialized = await serializeStore(graph, format);
    } catch (err) {
      ctx.logger.error('ReasonSerialize', 'run', 'serialization failed', { 'error': err });

      return;
    }

    const reasoning = getOrCreateOutput(state, 'reasoning');
    reasoning['serialized'] = serialized;

    ctx.logger.info('ReasonSerialize', 'run', 'serialization complete', {
      'format': format,
      'length': serialized.length,
    });
  }
}

export const reasonSerialize = new ReasonSerialize();
