/** Histogram output written by gallery:histogram. */
export abstract class GalleryHistogramSlotInterfaceType {
  abstract 'binCount': number;
  abstract 'bins': { 'hex': string; 'weight': number }[];
  abstract 'totalPixels': number;
}
