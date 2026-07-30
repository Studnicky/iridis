import type { RoleViewType } from './roleView.ts';

export declare class ContrastPairingType {
  'background': RoleViewType;
  'complianceLabel': string;
  'foreground': RoleViewType;
  'key': 'darkOnLight' | 'lightOnDark' | 'lowContrast';
  'label': string;
  'ratio': number;
}
