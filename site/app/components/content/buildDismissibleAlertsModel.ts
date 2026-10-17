import { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';

class DismissibleAlertItem {
  public readonly colorIndex: number;
  public readonly id: number;
  public readonly title: string;

  public constructor(colorIndex: number, id: number) {
    this.colorIndex = colorIndex;
    this.id = id;
    this.title = `Dismissible ${buildDismissibleAlertsModel.resolveColor(colorIndex)} alert`;
  }
}

export const buildDismissibleAlertsModel = class DismissibleAlertsModel {
  public static readonly empty: readonly DismissibleAlertItem[] = [];

  public static append(
    alerts: readonly DismissibleAlertItem[],
    nextId: number
  ): readonly DismissibleAlertItem[] {
    const colorIndex = alerts.length % AliasColorEntity.Values.length;
    const result = [...alerts, new DismissibleAlertItem(colorIndex, nextId)];
    return result;
  }

  public static resolveColor(colorIndex: number): AliasColorEntity.Type {
    const color = AliasColorEntity.Values[colorIndex];
    if (color === undefined) {
      throw new RangeError(`Unknown alias color index: ${colorIndex}`);
    }
    return color;
  }
};
