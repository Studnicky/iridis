import type { RoleViewType } from './roleView.ts';

export type ContrastPairingType = {
  'background': Pick<RoleViewType, 'hex' | 'name'>;
  'complianceLabel': string;
  'foreground': Pick<RoleViewType, 'hex' | 'name'>;
  'key': 'darkOnLight' | 'lightOnDark' | 'lowContrast';
  'label': string;
  'ratio': number;
};
