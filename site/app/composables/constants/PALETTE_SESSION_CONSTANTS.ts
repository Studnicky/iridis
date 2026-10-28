export namespace PALETTE_SESSION_CONSTANTS {
  /** Quiet period before a schema-feasibility check runs after the inputs it derives from change. */
  export const FEASIBILITY_DEBOUNCE_MS = 180;

  /** The single debounce key of the schema-feasibility lane. */
  export const FEASIBILITY_KEY = 'schema-feasibility';

  /** Base-36 radix of the timestamp that makes an image id unique across page loads. */
  export const IMAGE_ID_RADIX = 36;

  /** Longest edge, in pixels, an uploaded image is downscaled to before extraction. */
  export const IMAGE_MAXIMUM_DIMENSION = 180;

  /** Display name of the bundled sample image. */
  export const SAMPLE_IMAGE_NAME = 'Sample';

  /** Quiet period before an image's changed settings re-extract it. */
  export const SETTINGS_DEBOUNCE_MS = 180;

  /** Nuxt state key that carries the server-resolved palette snapshot to the client. */
  export const SNAPSHOT_STATE_KEY = 'iridis-palette-snapshot';

  /** Length of the colour-transition window, slightly longer than `--iridis-tune` (150 ms). */
  export const THEME_TRANSITION_MS = 180;
}
