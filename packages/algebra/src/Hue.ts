const HUE_PERIOD = 360;

/** Hue-circle arithmetic: values are always wrapped into [0, 360). */
class Hue {
  static normalize(h: number): number {
    return ((h % HUE_PERIOD) + HUE_PERIOD) % HUE_PERIOD;
  }
}

export { Hue };
