import type { HueDirectionType } from '@studnicky/iridis-algebra';

/** Maps a normalized progress value (t in [0, 1]) to an eased progress value. */
export type EasingFunctionType = (t: number) => number;

export type SpringOptionsInterfaceType = {
  'damping':   number | undefined;
  'mass':      number | undefined;
  'stiffness': number | undefined;
};

export type CurveOptionsInterfaceType = {
  /** Roles whose hue interpolation should route through the green detour when it would otherwise cross the brown/gray dead zone. */
  'chromaticDetourRoles': string[] | undefined;
  'easing':               EasingFunctionType | undefined;
  'hueDirection':         HueDirectionType | undefined;
};

export type EnforceLevelType = 'aa' | 'aaa';

export type ContrastPairInputInterfaceType = {
  'algorithm':  'wcag21' | undefined;
  'background':  string;
  'foreground':  string;
  'minRatio':   number | undefined;
};

export type EnforceOptionsInterfaceType = CurveOptionsInterfaceType & {
  'contrastPairs': ContrastPairInputInterfaceType[];
  'level':        EnforceLevelType | undefined;
};
