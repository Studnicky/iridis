import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';
import type { Quad } from 'n3';

import { LogBody, LogFault } from '@studnicky/logger/builders';
import { LOG_STATUS }        from '@studnicky/logger/constants';
import { Writer }            from 'n3';

import type { IterableStoreInterface } from '../types/augmentation.ts';

type SerializationFormatType = 'Turtle' | 'TriG' | 'N-Quads' | 'application/ld+json';

class Format {
  static resolve(raw: unknown): SerializationFormatType {
    if (typeof raw !== 'string') {
      return 'Turtle';
    }
    const lower = raw.toLowerCase();

    if (lower === 'trig'   || lower === 'application/trig')                         {return 'TriG';}
    if (lower === 'nquads' || lower === 'n-quads' || lower === 'application/n-quads') {return 'N-Quads';}
    if (lower === 'jsonld' || lower === 'json-ld' || lower === 'application/ld+json') {return 'application/ld+json';}

    return 'Turtle';
  }
}

class SerializedStore {
  static from(store: IterableStoreInterface, format: SerializationFormatType): string {
    const writer = new Writer({ 'format': format });

    for (const quad of store) {
      // quad is typed as unknown in IterableStoreInterface to avoid cross-package
      // @types/n3 vs @rdfjs/types conflicts; the store is always an n3 Store here.
      writer.addQuad(quad as Quad);
    }

    // n3's Writer.end invokes its callback synchronously for in-memory string
    // output (no I/O), so the result is available before end() returns.
    let result = '';
    let failure: Error | null = null;
    writer.end((err: unknown, output: unknown) => {
      if (err instanceof Error) {failure = err;}
      else if (typeof output === 'string') {result = output;}
    });
    if (failure !== null) {throw failure;}
    return result;
  }
}

class ReasonSerialize implements TaskInterface {
  readonly 'name' = 'reason:serialize';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Serialize rdf:reasoningGraph to Turtle / TriG / N-Quads / JSON-LD',
    'name':        'reason:serialize',
    'reads':       ['rdf:reasoningGraph', 'rdf:format'],
    'writes':      ['rdf:serialized']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const graph = state.outputs['rdf:reasoningGraph'] as IterableStoreInterface | undefined;
    if (graph === undefined) {
      ctx.logger.warn(
        LogBody.create()
          .component('ReasonSerialize')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('rdf:reasoningGraph is absent; run reason:annotate first')
          .context({})
          .build()
      );

      return;
    }

    const format = Format.resolve(state.metadata['rdf:format']);

    ctx.logger.debug(
      LogBody.create()
        .component('ReasonSerialize')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('serializing graph')
        .context({ 'format': format })
        .build()
    );

    let serialized: string;

    try {
      serialized = SerializedStore.from(graph, format);
    } catch (err) {
      ctx.logger.error(
        LogFault.create()
          .component('ReasonSerialize')
          .operation('run')
          .status(LOG_STATUS.FAILED)
          .fromError(err instanceof Error ? err : new Error(String(err)))
          .context({})
          .build()
      );

      return;
    }

    state.outputs['rdf:serialized'] = serialized;

    ctx.logger.info(
      LogBody.create()
        .component('ReasonSerialize')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('serialization complete')
        .context({
          'format': format,
          'length': serialized.length
        })
        .build()
    );
  }
}

export const reasonSerialize = new ReasonSerialize();
