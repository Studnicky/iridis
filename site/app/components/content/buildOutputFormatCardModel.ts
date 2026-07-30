import type { OutputRowType } from '~/composables/types/outputRow.ts';
import type { SupportedLangType } from '~/composables/types/supportedLang.ts';

import { OUTPUT_FORMAT_INFO } from './outputFormatInfo.ts';

class OutputFormatCardModel {
  public readonly code: string;
  public readonly filename: string | undefined;
  public readonly instruction: string;
  public readonly lang: SupportedLangType.Type;
  public readonly previewLines: number | undefined;

  public constructor(
    code: string,
    filename: string | undefined,
    instruction: string,
    lang: SupportedLangType.Type,
    previewLines: number | undefined
  ) {
    this.code = code;
    this.filename = filename;
    this.instruction = instruction;
    this.lang = lang;
    this.previewLines = previewLines;
  }
}

export const buildOutputFormatCardModel = class OutputFormatCardModelBuilder {
  private static readonly defaultInstruction =
    'One engine.run(), every plugin format reads the same resolved roles — just written differently.';

  public static build(
    formatKey: string,
    row: OutputRowType | undefined
  ): OutputFormatCardModel {
    const info = OUTPUT_FORMAT_INFO[formatKey];
    return new OutputFormatCardModel(
      row?.text ?? '',
      info?.filename,
      info?.instruction ?? OutputFormatCardModelBuilder.defaultInstruction,
      row?.lang ?? 'json',
      info?.previewLines
    );
  }
};
