import type { OutputRowType } from '~/composables/types/outputRow.ts';
import type { SupportedLangType } from '~/composables/types/supportedLang.ts';
import { OUTPUT_FORMAT_INFO } from './outputFormatInfo.ts';

type OutputFormatInfo = (typeof OUTPUT_FORMAT_INFO)[string];

export type OutputFormatCardModel = {
  readonly code: string;
  readonly filename: string | undefined;
  readonly instruction: string;
  readonly lang: SupportedLangType;
  readonly previewLines: number | undefined;
};

const DEFAULT_OUTPUT_FORMAT_INSTRUCTION =
  'One engine.run(), every plugin format reads the same resolved roles — just written differently.';

export function buildOutputFormatCardModel(
  formatKey: string,
  row: OutputRowType | undefined
): OutputFormatCardModel {
  const info: OutputFormatInfo | undefined = OUTPUT_FORMAT_INFO[formatKey];
  return {
    'code': row?.text ?? '',
    'filename': info?.filename,
    'instruction': info?.instruction ?? DEFAULT_OUTPUT_FORMAT_INSTRUCTION,
    'lang': row?.lang ?? 'json',
    'previewLines': info?.previewLines
  };
}
