import type { HueDirectionType } from '@studnicky/iridis-algebra';

/** Maps a normalized progress value (t in [0, 1]) to an eased progress value. */
export type EasingFunctionType = (t: number) => number;

export type SpringOptionsInterfaceType = {
  'damping'?:   number;
  'mass'?:      number;
  'stiffness'?: number;
};

export type CurveOptionsInterfaceType = {
  /** Roles whose hue interpolation should route through the green detour when it would otherwise cross the brown/gray dead zone. */
  'chromaticDetourRoles'?: readonly string[];
  'easing'?:               EasingFunctionType;
  'hueDirection'?:         HueDirectionType;
};

export type EnforceLevelType = 'aa' | 'aaa';

export type ContrastPairInputInterfaceType = {
  'algorithm'?:  'wcag21';
  'background':  string;
  'foreground':  string;
  'minRatio'?:   number;
};

export type EnforceOptionsInterfaceType = CurveOptionsInterfaceType & {
  'contrastPairs': readonly ContrastPairInputInterfaceType[];
  'level'?:        EnforceLevelType;
};
