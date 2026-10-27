/** Receives the failure of an image lane, attributed to the lane that went idle just before the rejection. */
export interface PaletteSessionLaneFailureInterface {
  'combineFailed': (message: string) => void;
  'extractFailed': (imageId: string, message: string) => void;
}
