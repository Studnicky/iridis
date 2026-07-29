/** A raw seed entry: a plain hex string, or an hex+role pin (drives ResolveRoles' hint match). */
export namespace SeedInputType {
  export type Type = string | { 'hex': string; 'role': string };
}
