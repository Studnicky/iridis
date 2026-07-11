import { C as ResourceMeta, S as Manifest, n as precomputeDependencies, t as PrecomputedData, w as defineManifest } from "./precompute-CAi6lu1x.cjs";
import { Manifest as Manifest$1 } from "vite";

//#region src/vite.d.ts
declare function normalizeViteManifest(manifest: Manifest$1 | Manifest): Manifest;
//#endregion
//#region src/webpack.d.ts
type Identifier = string;
type OutputPath = string;
interface WebpackClientManifest {
  publicPath: string;
  all: Array<OutputPath>;
  initial: Array<OutputPath>;
  async: Array<OutputPath>;
  modules: Record<Identifier, Array<number>>;
  hasNoCssVersion?: {
    [file: string]: boolean;
  };
}
declare function normalizeWebpackManifest(manifest: WebpackClientManifest): Manifest;
//#endregion
export { Manifest, type PrecomputedData, ResourceMeta, defineManifest, normalizeViteManifest, normalizeWebpackManifest, precomputeDependencies };