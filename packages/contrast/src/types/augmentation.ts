export interface WcagPairResultInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  'wcag21' | 'apca';
  readonly 'required':   number;
  readonly 'before':     number;
  readonly 'after':      number;
  readonly 'pass':       boolean;
}

export interface WcagPairResultSetInterface {
  readonly 'pairs': readonly WcagPairResultInterface[];
}

export interface ApcaPairResultInterface {
  readonly 'foreground': string;
  readonly 'background': string;
  readonly 'algorithm':  'apca';
  readonly 'requiredLc': number;
  readonly 'beforeLc':   number;
  readonly 'afterLc':    number;
  readonly 'pass':       boolean;
}

export interface ApcaPairResultSetInterface {
  readonly 'pairs': readonly ApcaPairResultInterface[];
}

export interface CvdPairWarningInterface {
  readonly 'foreground':                 string;
  readonly 'background':                 string;
  readonly 'cvdType':                    'protanopia' | 'deuteranopia' | 'tritanopia';
  readonly 'originalLuminanceContrast':  number;
  readonly 'simulatedLuminanceContrast': number;
  readonly 'drop':                       number;
  readonly 'threshold':                  number;
}

export interface CvdResultSetInterface {
  readonly 'warnings': readonly CvdPairWarningInterface[];
}

export interface WcagMetaSlotInterface {
  'aa'?:   WcagPairResultSetInterface;
  'aaa'?:  WcagPairResultSetInterface;
  'apca'?: ApcaPairResultSetInterface;
  'cvd'?:  CvdResultSetInterface;
}

declare module '@studnicky/iridis' {
  interface PluginMetadataRegistry {
    'wcag': WcagMetaSlotInterface;
  }
}
