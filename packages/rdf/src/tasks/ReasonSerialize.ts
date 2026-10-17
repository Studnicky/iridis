import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody, LogFault } from '@studnicky/logger/node';
import { JsonValue } from '@studnicky/types/node';
import { Parser, Store, Writer } from 'n3';

import type { SerializationFormatEntity } from '../entities/SerializationFormatEntity.ts';

class Format {
  static resolve(raw: JSONSchema7Type | undefined): SerializationFormatEntity.Type {
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
  static from(serializedGraph: string, writer: Writer): string {
    const store = new Store(new Parser({ 'format': 'N-Quads' }).parse(serializedGraph));

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

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Serialize rdf:reasoningGraph to Turtle / TriG / N-Quads / JSON-LD',
    'name':        'reason:serialize',
    'reads':       ['rdf:reasoningGraph', 'rdf:format'],
    'writes':      ['rdf:serialized']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const graph = state.outputs['rdf:reasoningGraph'];
    if (typeof graph !== 'string') {
      context.logger.warn(
        LogBody.create({ 'component': 'ReasonSerialize', 'context': {}, 'message': 'rdf:reasoningGraph is absent; run reason:annotate first', 'operation': 'run', 'status': LOG_STATUS.SKIPPED })
      );

      return;
    }

    const format = Format.resolve(JsonValue.from(state.metadata['rdf:format']));

    context.logger.debug(
      LogBody.create({ 'component': 'ReasonSerialize', 'context': { 'format': format }, 'message': 'serializing graph', 'operation': 'run', 'status': LOG_STATUS.SUCCESS })
    );

    let serialized: string;

    try {
      const writer = new Writer({ 'format': format });
      serialized = SerializedStore.from(graph, writer);
    } catch (error) {
      context.logger.error(
        LogFault.create({ 'component': 'ReasonSerialize', 'context': {}, 'message': error instanceof Error ? error.message : String(error), 'name': error instanceof Error ? error.name : 'Error', 'operation': 'run', 'status': LOG_STATUS.FAILED })
      );

      return;
    }

    state.outputs['rdf:serialized'] = serialized;

    context.logger.info(
      LogBody.create({ 'component': 'ReasonSerialize', 'context': { 'format': format, 'length': serialized.length }, 'message': 'serialization complete', 'operation': 'run', 'status': LOG_STATUS.SUCCESS })
    );
  }
}

export const reasonSerialize = new ReasonSerialize();
