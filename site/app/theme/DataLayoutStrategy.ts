/** Selected layout implementation carried by a theme instead of a layout token. */
export class DataLayoutStrategy {
  static readonly grid = new DataLayoutStrategy((grid) => { return grid; });
  static readonly list = new DataLayoutStrategy((_grid, list) => { return list; });
  static readonly pixel = new DataLayoutStrategy((_grid, _list, pixel) => { return pixel; });
  static readonly table = new DataLayoutStrategy((_grid, _list, _pixel, table) => { return table; });

  private constructor(
    private readonly selectLayout: <ValueType>(grid: ValueType, list: ValueType, pixel: ValueType, table: ValueType) => ValueType
  ) {}

  select<ValueType>(grid: ValueType, list: ValueType, pixel: ValueType, table: ValueType): ValueType {
    const result = this.selectLayout(grid, list, pixel, table);
    return result;
  }
}
