import type { AliasColorType } from '~/theme/types/aliasColor.ts';

class DismissibleAlertItem {
  public readonly color: AliasColorType.Type;
  public readonly id: number;
  public readonly title: string;

  public constructor(color: AliasColorType.Type, id: number) {
    this.color = color;
    this.id = id;
    this.title = `Dismissible ${color} alert`;
  }
}

export const buildDismissibleAlertsModel = class DismissibleAlertsModel {
  public static readonly empty: readonly DismissibleAlertItem[] = [];

  public static append(
    alerts: readonly DismissibleAlertItem[],
    colors: readonly AliasColorType.Type[],
    nextId: number
  ): readonly DismissibleAlertItem[] {
    const color = colors.at(alerts.length % colors.length);
    if (color === undefined) {
      throw new RangeError('Dismissible alerts require at least one color.');
    }
    return [...alerts, new DismissibleAlertItem(color, nextId)];
  }
};
