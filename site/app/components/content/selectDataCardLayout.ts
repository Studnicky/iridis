import type { ThemeDefinitionInterfaceType } from '~/theme/ThemeDefinitionInterfaceType.ts';

type CardLayoutMode = Exclude<ThemeDefinitionInterfaceType['dataLayout'], 'table'>;

export function selectDataCardLayout<T extends Record<CardLayoutMode, unknown>>(
  dataLayout: ThemeDefinitionInterfaceType['dataLayout'],
  layouts: T
): T[CardLayoutMode] | undefined {
  return dataLayout === 'table' ? undefined : layouts[dataLayout];
}
