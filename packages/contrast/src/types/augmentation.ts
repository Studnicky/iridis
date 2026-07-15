// Contrast plugin interface definitions.
// Module augmentation on PluginMetadataRegistry has been replaced with
// explicit schema contribution via ContrastPlugin.schemas().

export type WcagPairResultInterfaceType = {
  'after':      number;
  'algorithm':  'wcag21' | 'apca';
  'background': string;
  'before':     number;
  'foreground': string;
  'pass':       boolean;
  'required':   number;
};

export type WcagPairResultSetInterfaceType = {
  'pairs': WcagPairResultInterfaceType[];
};

export type ApcaPairResultInterfaceType = {
  'afterLc':    number;
  'algorithm':  'apca';
  'background': string;
  'beforeLc':   number;
  'foreground': string;
  'pass':       boolean;
  'requiredLc': number;
};

export type ApcaPairResultSetInterfaceType = {
  'pairs': ApcaPairResultInterfaceType[];
};

export type CvdPairWarningInterfaceType = {
  'background':                 string;
  'cvdType':                    string;
  'drop':                       number;
  'dropThreshold':              number;
  'foreground':                 string;
  'minSimulatedContrast':       number;
  'originalLuminanceContrast':  number;
  'simulatedLuminanceContrast': number;
};

export type CvdCorrectionInterfaceType = {
  'background':         string;
  'cvdTypesFixed':      string[];
  'cvdTypesRemaining':  string[];
  'foreground':         string;
};

export type CvdResultSetInterfaceType = {
  'corrections'?: CvdCorrectionInterfaceType[];
  'warnings':     CvdPairWarningInterfaceType[];
};

export type WcagMetaSlotInterfaceType = {
  'aa'?:   WcagPairResultSetInterfaceType;
  'aaa'?:  WcagPairResultSetInterfaceType;
  'apca'?: ApcaPairResultSetInterfaceType;
  'cvd'?:  CvdResultSetInterfaceType;
};

/** Known `state.metadata` keys written by the contrast enforcement tasks. */
export type ContrastMetadataInterfaceType = {
  'contrast:aa'?:   WcagPairResultSetInterfaceType;
  'contrast:aaa'?:  WcagPairResultSetInterfaceType;
  'contrast:apca'?: ApcaPairResultSetInterfaceType;
  'contrast:cvd'?:  CvdResultSetInterfaceType;
};

/** Type-safe accessor for a known contrast `state.metadata` key, returning `undefined` when unset. */
export function getContrastMetadata<K extends keyof ContrastMetadataInterfaceType>(
  metadata: Record<string, unknown>,
  key: K
): ContrastMetadataInterfaceType[K] {
  const result = metadata[key] as ContrastMetadataInterfaceType[K];
  return result;
}
