import type { ImageExtractionResultEntity } from '../../entities/ImageExtractionResultEntity.ts';

/** The lane outcome stamped onto an image entry; an absent `error` or `label` is omitted from the entry. */
export interface PaletteSessionEntryOutcomeInterface {
  'error': string | undefined;
  'extraction'?: ImageExtractionResultEntity.Type;
  'label': string | undefined;
  'status': string;
}
