/** HSL conversion result. Hue 0-360, saturation/lightness 0-1, alpha 0-1.
 *  Distinct from `RgbInterfaceType` so callers can keep the channel semantics
 *  in their type system instead of overloading triple-number tuples. */
export type HslResultInterfaceType = {
  'alpha': number;
  'h':     number;
  'l':     number;
  's':     number;
};
