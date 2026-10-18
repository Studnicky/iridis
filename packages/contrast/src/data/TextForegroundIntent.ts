import type { ColorHintsInterfaceTypeEntity } from '@studnicky/iridis';

const TEXT_FOREGROUND_BY_INTENT: Readonly<Record<NonNullable<ColorHintsInterfaceTypeEntity.Type['intent']>, boolean>> = {
  'accent':     false,
  'background': false,
  'button':     false,
  'critical':   false,
  'link':       true,
  'muted':      true,
  'onAccent':   true,
  'onButton':   true,
  'positive':   false,
  'text':       true
};

export class TextForegroundIntent {
  static matches(hints: ColorHintsInterfaceTypeEntity.Type | undefined): boolean {
    const intent = hints?.intent;
    if (intent === undefined) {return false;}
    const result = TEXT_FOREGROUND_BY_INTENT[intent] === true;
    return result;
  }
}
