import type { ColorSampleType } from '~/composables/types/colorSample.ts';

import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';

class LiveMotionSwatch {
  public readonly hex: string;
  public readonly role: string;

  public constructor(hex: string, role: string) {
    this.hex = hex;
    this.role = role;
  }
}

class NamedAnimation {
  public readonly class: string | undefined;
  public readonly duration: string;
  public readonly kind: 'dot' | 'orbit' | 'sonar' | 'radar' | 'chroma';
  public readonly label: string;
  public readonly note: string;

  public constructor(
    animationClass: string | undefined,
    duration: string,
    kind: NamedAnimation['kind'],
    label: string,
    note: string
  ) {
    this.class = animationClass;
    this.duration = duration;
    this.kind = kind;
    this.label = label;
    this.note = note;
  }
}

export const buildMotionShowcaseModel = class MotionShowcaseModelBuilder {
  private static readonly defaultEase = 'cubic-bezier(0.33, 0, 0.2, 1)';

  private static readonly liveRoles = ALIAS_COLOR_NAMES.filter((alias) => {
    return alias !== 'neutral';
  });

  public static readonly easePresets: Readonly<Record<string, string>> = Object.freeze({
    'Bouncy': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    'Ease in/out': 'ease-in-out',
    'Linear': 'linear',
    'Smooth (default)': MotionShowcaseModelBuilder.defaultEase,
    'Snappy': 'cubic-bezier(0.16, 1, 0.3, 1)'
  });

  public static readonly namedAnimations: readonly NamedAnimation[] = [
    new NamedAnimation('pulse', '3s', 'dot', 'pulse-glow', 'carousel arrows, active dot'),
    new NamedAnimation('float', '7s', 'dot', 'float', 'hero logo, floating orbs'),
    new NamedAnimation('spin-slow', '26s', 'dot', 'spin', 'ambient background accent'),
    new NamedAnimation('glass', '4s', 'dot', 'sheen', 'every glass panel’s top edge'),
    new NamedAnimation(undefined, '2.2-3.8s', 'orbit', 'orbit', 'three roles, three independent rings'),
    new NamedAnimation(undefined, '2.4s', 'sonar', 'sonar', 'success/warning/error/primary in sequence'),
    new NamedAnimation(undefined, '2.6s', 'radar', 'radar', 'primary bleeding into secondary, one sweep'),
    new NamedAnimation(undefined, '4s', 'chroma', 'chroma', 'the accent hue cycling the full wheel')
  ];

  public static buildLiveMotionSwatches(
    colorStreamHistory: Record<string, readonly ColorSampleType[] | undefined>
  ): LiveMotionSwatch[] {
    const result: LiveMotionSwatch[] = [];
    for (const role of MotionShowcaseModelBuilder.liveRoles) {
      const samples = colorStreamHistory[role];
      const last = samples?.[samples.length - 1];
      result.push(new LiveMotionSwatch(
        last?.hex ?? `var(--ui-color-${role}-500)`,
        role
      ));
    }
    return result;
  }

  public static resolveEase(key: string): string {
    return MotionShowcaseModelBuilder.easePresets[key]
      ?? MotionShowcaseModelBuilder.defaultEase;
  }
};
