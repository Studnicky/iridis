/** How a batch of image sources enters the session. */
export interface PaletteSessionImageSourceOptionsInterface {
  /** Applies each entry-add command; an image-mode dispatcher selects image mode first. */
  'dispatch': (command: unknown) => Promise<void>;
  /** Display name per source; a source without one is named after its file. */
  'names'?: readonly string[];
}
