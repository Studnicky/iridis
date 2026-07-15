/** A raw seed entry: a plain hex string, or an hex+role pin (drives ResolveRoles' hint match). */
export type SeedInputType = string | { 'hex': string; 'role'?: string };
