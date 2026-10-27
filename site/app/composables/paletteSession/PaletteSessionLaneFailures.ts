import type { PaletteSessionLaneFailureInterface } from './interfaces/PaletteSessionLaneFailureInterface.ts';

/** Turns an image lane failure into the command that records it on the session. */
export class PaletteSessionLaneFailures implements PaletteSessionLaneFailureInterface {
  readonly #issue: (command: unknown) => void;

  public constructor(issue: (command: unknown) => void) {
    this.#issue = issue;
  }

  public combineFailed(message: string): void {
    this.#issue({ 'interaction': 'palette.image.combine.failed', 'payload': { 'message': message } });
  }

  public extractFailed(imageId: string, message: string): void {
    this.#issue({ 'interaction': 'palette.image.entry.failed', 'payload': { 'imageId': imageId, 'message': message } });
  }
}
