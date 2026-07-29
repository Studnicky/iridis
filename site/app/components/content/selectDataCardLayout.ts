import type { ThemeDefinitionInterfaceType } from '~/theme/ThemeDefinitionInterfaceType.ts';

export const selectDataCardLayout = class DataCardLayoutSelector {
  public static select<T extends Record<Exclude<ThemeDefinitionInterfaceType['dataLayout'], 'table'>, unknown>>(
    dataLayout: ThemeDefinitionInterfaceType['dataLayout'],
    layouts: T
  ): T[Exclude<ThemeDefinitionInterfaceType['dataLayout'], 'table'>] | undefined {
    if (dataLayout === 'table') {
      return undefined;
    }
    return layouts[dataLayout];
  }
};
