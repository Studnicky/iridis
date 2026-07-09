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
