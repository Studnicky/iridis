import type { AliasColorType } from '~/theme/types/aliasColor.ts';

export type DismissibleAlertItem = {
  readonly color: AliasColorType;
  readonly id: number;
  readonly title: string;
};

export function appendDismissibleAlert(
  alerts: readonly DismissibleAlertItem[],
  colors: readonly AliasColorType[],
  nextId: number
): readonly DismissibleAlertItem[] {
  const color = colors[alerts.length % colors.length]!;
  return [
    ...alerts,
    {
      color,
      id: nextId,
      title: `Dismissible ${color} alert`
    }
  ];
}

export function removeDismissibleAlert(
  alerts: readonly DismissibleAlertItem[],
  id: number
): readonly DismissibleAlertItem[] {
  return alerts.filter((alert) => {
    return alert.id !== id;
  });
}
