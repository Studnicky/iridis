import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';
import type { JsonValueType } from '@studnicky/types';

import { LogBody, LogFault } from '@studnicky/logger/builders';
import { LOG_STATUS }        from '@studnicky/logger/constants';
import { JsonValue }         from '@studnicky/types';
import { Writer }            from 'n3';

import type { SerializationFormatEntity } from '../entities/SerializationFormatEntity.ts';
import type { IterableStoreInterface } from '../interfaces/IterableStoreInterface.ts';

class Format {
  static resolve(raw: JsonValueType | undefined): SerializationFormatEntity.Type {
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
  static from(store: IterableStoreInterface, format: SerializationFormatEntity.Type): string {
    const writer = new Writer({ 'format': format });

    for (const quad of store) {
      writer.addQuad(quad);
    }

    // n3's Writer.end invokes its callback synchronously for in-memory string
    // output (no I/O), so the result is available before end() returns.
    let result = '';
    let failure: Error | null = null;
    writer.end((error: Error | null, output: string) => {
      if (error instanceof Error) {failure = error;}
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
    'phase':       undefined,
    'reads':       ['rdf:reasoningGraph', 'rdf:format'],
    'requires':    undefined,
    'writes':      ['rdf:serialized']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const graph = state.outputs['rdf:reasoningGraph'] as IterableStoreInterface | undefined;
    if (graph === undefined) {
      context.logger.warn(
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

    const format = Format.resolve(JsonValue.from(state.metadata['rdf:format']));

    context.logger.debug(
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
    } catch (error) {
      context.logger.error(
        LogFault.create()
          .component('ReasonSerialize')
          .operation('run')
          .status(LOG_STATUS.FAILED)
          .fromError(error instanceof Error ? error : new Error(String(error)))
          .context({})
          .build()
      );

      return;
    }

    state.outputs['rdf:serialized'] = serialized;

    context.logger.info(
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
