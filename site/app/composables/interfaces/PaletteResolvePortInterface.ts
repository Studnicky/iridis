import type { PaletteResolveEnvelopeInterfaceTypeEntity } from '../entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';

/** Transport to a palette resolve host; replies and failures arrive through the listeners registered by `listen`. */
export interface PaletteResolvePortInterface {
  'listen': (onReply: (data: unknown) => void, onFailure: (message: string) => void) => void;
  'post': (envelope: PaletteResolveEnvelopeInterfaceTypeEntity.Type) => void;
  'terminate': () => void;
}
