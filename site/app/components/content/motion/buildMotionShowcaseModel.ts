import type { ColorSampleType } from '~/composables/types/colorSampleType.ts';

import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';

class LiveMotionSwatch {
  public readonly hex: string;
  public readonly role: string;

  public constructor(hex: string, role: string) {
    this.hex = hex;
    this.role = role;
  }
}

class DotAnimationPreview {
  public isChroma(): boolean {return false;}
  public isDot(): boolean {return true;}
  public isOrbit(): boolean {return false;}
  public isRadar(): boolean {return false;}
  public isSonar(): boolean {return false;}
}

class OrbitAnimationPreview {
  public isChroma(): boolean {return false;}
  public isDot(): boolean {return false;}
  public isOrbit(): boolean {return true;}
  public isRadar(): boolean {return false;}
  public isSonar(): boolean {return false;}
}

class SonarAnimationPreview {
  public isChroma(): boolean {return false;}
  public isDot(): boolean {return false;}
  public isOrbit(): boolean {return false;}
  public isRadar(): boolean {return false;}
  public isSonar(): boolean {return true;}
}

class RadarAnimationPreview {
  public isChroma(): boolean {return false;}
  public isDot(): boolean {return false;}
  public isOrbit(): boolean {return false;}
  public isRadar(): boolean {return true;}
  public isSonar(): boolean {return false;}
}

class ChromaAnimationPreview {
  public isChroma(): boolean {return true;}
  public isDot(): boolean {return false;}
  public isOrbit(): boolean {return false;}
  public isRadar(): boolean {return false;}
  public isSonar(): boolean {return false;}
}

class NamedAnimation {
  public readonly class: string | undefined;
  public readonly duration: string;
  public readonly preview: DotAnimationPreview | OrbitAnimationPreview | SonarAnimationPreview | RadarAnimationPreview | ChromaAnimationPreview;
  public readonly label: string;
  public readonly note: string;

  public constructor(
    animationClass: string | undefined,
    duration: string,
    preview: NamedAnimation['preview'],
    label: string,
    note: string
  ) {
    this.class = animationClass;
    this.duration = duration;
    this.preview = preview;
    this.label = label;
    this.note = note;
  }
}

export const buildMotionShowcaseModel = class MotionShowcaseModelBuilder {
  private static readonly defaultEase = 'cubic-bezier(0.33, 0, 0.2, 1)';

  private static readonly liveRoles = ALIAS_COLOR_NAMES.filter((alias) => {
    const result = alias !== 'neutral';
    return result;
  });

  public static readonly easePresets: Readonly<Record<string, string>> = Object.freeze({
    'Bouncy': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    'Ease in/out': 'ease-in-out',
    'Linear': 'linear',
    'Smooth (default)': MotionShowcaseModelBuilder.defaultEase,
    'Snappy': 'cubic-bezier(0.16, 1, 0.3, 1)'
  });

  public static readonly namedAnimations: readonly NamedAnimation[] = [
    new NamedAnimation('pulse', '3s', new DotAnimationPreview(), 'pulse-glow', 'carousel arrows, active dot'),
    new NamedAnimation('float', '7s', new DotAnimationPreview(), 'float', 'hero logo, floating orbs'),
    new NamedAnimation('spin-slow', '26s', new DotAnimationPreview(), 'spin', 'ambient background accent'),
    new NamedAnimation('glass', '4s', new DotAnimationPreview(), 'sheen', 'every glass panel’s top edge'),
    new NamedAnimation(undefined, '2.2-3.8s', new OrbitAnimationPreview(), 'orbit', 'three roles, three independent rings'),
    new NamedAnimation(undefined, '2.4s', new SonarAnimationPreview(), 'sonar', 'success/warning/error/primary in sequence'),
    new NamedAnimation(undefined, '2.6s', new RadarAnimationPreview(), 'radar', 'primary bleeding into secondary, one sweep'),
    new NamedAnimation(undefined, '4s', new ChromaAnimationPreview(), 'chroma', 'the accent hue cycling the full wheel')
  ];

  public static buildLiveMotionSwatches(
    colorStreamHistory: Record<string, readonly ColorSampleType[] | undefined>
  ): LiveMotionSwatch[] {
    const result: LiveMotionSwatch[] = [];
    for (let index = 0; index < MotionShowcaseModelBuilder.liveRoles.length; index += 1) {
      const role = MotionShowcaseModelBuilder.liveRoles[index];
      if (role === undefined) {continue;}
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
    const result = MotionShowcaseModelBuilder.easePresets[key]
      ?? MotionShowcaseModelBuilder.defaultEase;
    return result;
  }
};
