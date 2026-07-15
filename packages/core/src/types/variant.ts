/** Shape of a single variant configuration entry (read by derive:variant). */
export type VariantConfigInterfaceType = {
  'invertLightness': boolean;
  'lightnessOffset': number | undefined;
  /**
   * Absolute target OKLCH lightness for every role in this variant. Takes
   * precedence over `lightnessOffset`. Lets a caller request a fixed tonal
   * step (e.g. an 11-stop 50→950 scale) resolved through the engine's own
   * `colorRecordFactory` rather than computing the ramp downstream.
   */
  'lightnessTarget': number | undefined;
  'name':            string;
};
