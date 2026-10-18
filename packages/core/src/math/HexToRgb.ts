import { colorRecordFactory } from './ColorRecordFactory.ts';

/** Singleton instance registered as the `hexToRgb` math primitive. */
export const hexToRgb = {
  'apply': colorRecordFactory.fromHex,
  'name':  'hexToRgb'
};
