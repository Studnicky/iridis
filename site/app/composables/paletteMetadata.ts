import { JsonValue } from '@studnicky/types/browser';

import { VARIANT_CONFIG } from './variantConfig.ts';

/** Attaches the engine tonal-ramp configuration to every palette-resolution input. */
export class PaletteMetadata {
  public static withVariant<ValueType extends Record<string, unknown>>(metadata: ValueType): ValueType & { readonly 'core:variantConfig': ReturnType<typeof JsonValue.from> } {
    const result = { ...metadata, 'core:variantConfig': JsonValue.from(VARIANT_CONFIG) };
    return result;
  }
}
