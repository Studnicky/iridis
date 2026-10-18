import type { OutputRowInterfaceTypeEntity } from '~/composables/entities/OutputRowInterfaceTypeEntity.ts';

import { OUTPUT_FORMAT_INFO } from './outputFormatInfo.ts';

class OutputFormatCardModel {
  public readonly code: string;
  public readonly filename: string | undefined;
  public readonly instruction: string;
  public readonly language: string;
  public readonly previewLines: number | undefined;

  public constructor(
    code: string,
    instruction: string,
    language: string,
    options: {
      readonly 'filename': string | undefined;
      readonly 'previewLines': number | undefined;
    }
  ) {
    this.code = code;
    this.filename = options.filename;
    this.instruction = instruction;
    this.language = language;
    this.previewLines = options.previewLines;
  }
}

export const buildOutputFormatCardModel = class OutputFormatCardModelBuilder {
  private static readonly defaultInstruction =
    'One engine.run(), every plugin format reads the same resolved roles — just written differently.';

  public static build(
    formatKey: string,
    row: OutputRowInterfaceTypeEntity.Type | undefined
  ): OutputFormatCardModel {
    const info = OUTPUT_FORMAT_INFO[formatKey];
    const result = new OutputFormatCardModel(
      row?.text ?? '',
      info?.instruction ?? OutputFormatCardModelBuilder.defaultInstruction,
      row?.language ?? 'json',
      {
        'filename': info?.filename,
        'previewLines': info?.previewLines
      }
    );
    return result;
  }
};
