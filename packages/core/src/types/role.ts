import type { ColorIntentType } from './color.ts';

export type ContrastAlgorithmType = 'wcag21' | 'apca';

export interface RoleDefinitionInterface {
  readonly name:           string;
  readonly description?:   string;
  readonly intent?:        ColorIntentType;
  readonly required?:      boolean;
  readonly derivedFrom?:   string;
  readonly lightnessRange?: readonly [number, number];
  readonly chromaRange?:    readonly [number, number];
  readonly hueOffset?:      number;
}

export interface ContrastPairInterface {
  readonly foreground: string;
  readonly background: string;
  readonly minRatio:   number;
  readonly algorithm?: ContrastAlgorithmType;
}

export interface RoleSchemaInterface {
  readonly name:           string;
  readonly description?:   string;
  readonly roles:          readonly RoleDefinitionInterface[];
  readonly contrastPairs?: readonly ContrastPairInterface[];
}
