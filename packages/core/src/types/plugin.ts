import type { TaskInterface } from './pipeline.ts';

/** A JSON Schema object contributed by a plugin for output/metadata slot validation. */
export type JSONSchema = Record<string, unknown>;

export interface PluginSchemaContributionInterface {
  readonly outputs?:  Readonly<Record<string, JSONSchema>>;
  readonly metadata?: Readonly<Record<string, JSONSchema>>;
}

export interface PluginInterface {
  readonly name:    string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
  schemas?(): PluginSchemaContributionInterface;
}
