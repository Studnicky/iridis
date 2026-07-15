import type { TaskInterface } from './pipeline.ts';

/** A JSON Schema object contributed by a plugin for output/metadata slot validation. */
export type JSONSchemaType = Record<string, unknown>;

export interface PluginSchemaContributionInterface {
  readonly 'metadata': Readonly<Record<string, JSONSchemaType>> | undefined;
  readonly 'outputs':  Readonly<Record<string, JSONSchemaType>> | undefined;
}

export interface PluginInterface {
  readonly 'name':    string;
  schemas?(): PluginSchemaContributionInterface;
  tasks(): readonly TaskInterface[];
  readonly 'version': string;
}
