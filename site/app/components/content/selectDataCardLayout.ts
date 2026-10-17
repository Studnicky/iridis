import type { DataLayoutStrategy } from '~/theme/DataLayoutStrategy.ts';

export const selectDataCardLayout = class DataCardLayoutSelector {
  public static select<GridType, ListType, PixelType>(
    dataLayout: DataLayoutStrategy,
    grid: GridType,
    list: ListType,
    pixel: PixelType
  ): GridType | ListType | PixelType | undefined {
    const result = dataLayout.select<GridType | ListType | PixelType | undefined>(
      grid,
      list,
      pixel,
      undefined
    );
    return result;
  }
};
