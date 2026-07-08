/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type { RoleDefinitionInterfaceType, RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import { coreTasks, Engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import { computed, ref, watch } from 'vue';

import type {
  FramingType, GalleryAlgorithmType, HistogramBinType, ModeType, RoleHexMapType, RoleViewType, ScaleMapType
} from './types/index.ts';

import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';

/** Absolute OKLCH lightness per shade — resolved through the engine, not here. */
const SHADE_L: Record<number, number> = {
  '100': 0.955, '200': 0.915, '300': 0.855, '400': 0.775, '50': 0.985, '500': 0.685,
  '600': 0.595, '700': 0.505, '800': 0.415, '900': 0.335, '950': 0.235
};
const VARIANT_CONFIG = Tokens.SHADE_KEYS.map((s) => {return { 'invertLightness': false, 'lightnessTarget': SHADE_L[s]!, 'name': `s${s}` };});

/**
 * Semantic hue targets, applied as a BOUNDED nudge (the engine rotates each role
 * toward the target by at most SEMANTIC_HUE_CLAMP degrees). This keeps success/
 * warning/error/info rooted in the actual palette — a red-dominant image yields
 * warm-leaning semantics rather than pure green/blue that appear nowhere in it.
 * Schema authoring; the engine still resolves the real color.
 */
const SEMANTIC_HUE: Record<string, number> = { 'error': 27, 'info': 250, 'success': 150, 'warning': 85 };
const SEMANTIC_HUE_CLAMP = 55;

const COLOR_PIPELINE = [
  'intake:hex', 'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant'
];
const IMAGE_PIPELINE = [
  'intake:imagePixels', 'gallery:histogram', 'gallery:extract', 'gallery:harmonize',
  'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant'
];

const engine = new Engine();
for (const t of coreTasks) {engine.tasks.register(t);}
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

/** Author hue targets onto the schema's semantic roles (engine resolves them). */
function withSemanticHues(schema: RoleSchemaInterfaceType): RoleSchemaInterfaceType {
  return {
    ...schema,
    'roles': schema.roles.map((r: RoleDefinitionInterfaceType) =>
    {return (SEMANTIC_HUE[r.name] !== undefined)
      ? { ...r, 'hue': SEMANTIC_HUE[r.name], 'hueClamp': SEMANTIC_HUE_CLAMP }
      : r;})
  };
}

/* ─── shared reactive state ─── */
const mode = ref<ModeType>('picker');
const pickerSeeds = ref<string[]>(['#7c3aed', '#06b6d4', '#f59e0b']);
const imageSeeds = ref<string[]>([]);
const framing = ref<FramingType>('dark');
const schemaName = ref<string>('iridis-32');
const contrastLevel = ref<'AA' | 'AAA'>('AAA');

const roles = ref<RoleHexMapType>({});
const roleViews = ref<RoleViewType[]>([]);
const scales = ref<ScaleMapType>({});
const histogram = ref<HistogramBinType[]>([]);
const running = ref<boolean>(false);
const error = ref<string | null>(null);

/* Image-extraction controls (mirror the engine's gallery config knobs). */
const imgAlgorithm = ref<GalleryAlgorithmType>('median-cut');
const imgK = ref<number>(8);
const imgHistogramBits = ref<number>(5);
const imgDeltaECap = ref<number>(128);
const imgHarmonize = ref<number>(10);
const imgLightnessRange = ref<[number, number]>([0, 1]);
const imgChromaRange = ref<[number, number]>([0, 0.5]);
const lastImageSrc = ref<string | null>(null);

const activeSeeds = computed<string[]>(() => {return (mode.value === 'image' ? imageSeeds.value : pickerSeeds.value);});

function ingest(state: { 'roles': Record<string, { 'hex': string; 'oklch': { 'c': number; 'h': number; 'l': number; } }>; 'variants': Record<string, Record<string, { 'hex': string }>> }): void {
  const roleHex: RoleHexMapType = {};
  const views: RoleViewType[] = [];
  for (const [name, r] of Object.entries(state.roles)) {
    roleHex[name] = r.hex;
    views.push({ 'c': r.oklch.c, 'h': r.oklch.h, 'hex': r.hex, 'l': r.oklch.l, 'name': name });
  }
  const sc: ScaleMapType = {};
  for (const s of Tokens.SHADE_KEYS) {
    const variant = state.variants[`s${s}`];
    if (variant === undefined) {continue;}
    const perShade: RoleHexMapType = {};
    for (const [name, rec] of Object.entries(variant)) {perShade[name] = rec.hex;}
    sc[s] = perShade;
  }
  roles.value = roleHex;
  roleViews.value = views;
  scales.value = sc;
  Tokens.apply(Tokens.mapFromEngine(roleHex, sc), framing.value);
}

function run(): void {
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
  if (pair === undefined || activeSeeds.value.length === 0) {return;}
  running.value = true;
  error.value = null;
  try {
    engine.pipeline([...COLOR_PIPELINE]);
    const state = engine.run({
      'colors':   activeSeeds.value,
      'contrast': { 'algorithm': 'wcag21', 'level': contrastLevel.value },
      'metadata': { 'core:variantConfig': VARIANT_CONFIG },
      'roles':    withSemanticHues(pair[framing.value]),
      'runtime':  { 'colorSpace': 'srgb', 'framing': framing.value }
    });
    ingest(state);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

/** Decode an image source into raw pixel data, downscaled for the gallery pipeline. */
class ToPixels {
  static async decode(src: string): Promise<{ 'data': Uint8ClampedArray; 'height': number; 'width': number; }> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => { const result = resolve(); return result; };
      img.onerror = () => { const result = reject(new Error('Image load failed')); return result; };
      img.src = src;
    });
    const MAX = 180;
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = long > MAX ? MAX / long : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { 'willReadFrequently': true });
    if (ctx === null) {throw new Error('no 2D context');}
    ctx.drawImage(img, 0, 0, w, h);
    return { 'data': ctx.getImageData(0, 0, w, h).data, 'height': h, 'width': w };
  }
}

/** Extracts dominant seeds and histogram data from a decoded image. */
class FromImage {
  /** Run the image pipeline: capture histogram, dominant seeds; switch to image mode. */
  static async extract(fileOrUrl: File | string): Promise<void> {
    if (typeof document === 'undefined') {return;}
    running.value = true;
    error.value = null;
    try {
      const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      lastImageSrc.value = src;
      const pixels = await ToPixels.decode(src);
      const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
      engine.pipeline([...IMAGE_PIPELINE]);
      const state = engine.run({
        'colors':   [pixels],
        'contrast': { 'algorithm': 'wcag21', 'level': contrastLevel.value },
        'metadata': {
          'core:variantConfig': VARIANT_CONFIG,
          'gallery': {
            'algorithm':          imgAlgorithm.value,
            'chromaRange':        [...imgChromaRange.value] as [number, number],
            'deltaECap':          imgDeltaECap.value,
            'harmonizeThreshold': imgHarmonize.value,
            'histogramBits':      imgHistogramBits.value,
            'k':                  imgK.value,
            'lightnessRange':     [...imgLightnessRange.value] as [number, number]
          }
        },
        'roles':    withSemanticHues(pair![framing.value]),
        'runtime':  { 'colorSpace': 'srgb', 'framing': framing.value }
      });
      const hist = (state.metadata['gallery:histogram'] as { 'bins'?: HistogramBinType[] } | undefined)?.bins ?? [];
      histogram.value = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
      const dominant = (state.metadata['gallery:dominantColors'] as { 'hex': string }[] | undefined) ?? [];
      imageSeeds.value = dominant.map((c) => { const result = c.hex; return result; }).filter((hex) => { const result = /^#[0-9a-fA-F]{6}$/.test(hex); return result; }).slice(0, 8);
      mode.value = 'image';
      ingest(state);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      running.value = false;
    }
  }
}

function addSeed(hex = '#888888'): void { if (pickerSeeds.value.length < 8) {pickerSeeds.value = [...pickerSeeds.value, hex];} }
function removeSeed(i: number): void { if (pickerSeeds.value.length > 1) {pickerSeeds.value = pickerSeeds.value.filter((_, idx) => {return idx !== i;});} }

/** Overwrites one picker seed by index. */
class Seed {
  static set(i: number, hex: string): void { pickerSeeds.value = pickerSeeds.value.map((s, idx) => {return (idx === i ? hex : s);}); }
}

let booted = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(): void {
  if (typeof window === 'undefined') {return;}
  if (timer !== undefined) {clearTimeout(timer);}
  timer = setTimeout(() => { run(); }, 120);
}

let extractTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleReextract(): void {
  if (typeof window === 'undefined' || lastImageSrc.value === null || mode.value !== 'image') {return;}
  if (extractTimer !== undefined) {clearTimeout(extractTimer);}
  extractTimer = setTimeout(() => { void FromImage.extract(lastImageSrc.value!); }, 180);
}

export function useIridis() {
  if (!booted && typeof window !== 'undefined') {
    booted = true;
    run();
    watch([pickerSeeds, imageSeeds, framing, schemaName, contrastLevel, mode], schedule, { 'deep': true });
    watch([imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleReextract, { 'deep': true });
  }
  return {
    'activeSeeds': activeSeeds, 'addSeed': addSeed, 'contrastLevel': contrastLevel, 'error': error, 'extractFromImage': FromImage.extract, 'framing': framing, 'histogram': histogram,
    'imageSeeds': imageSeeds, 'imgAlgorithm': imgAlgorithm, 'imgChromaRange': imgChromaRange, 'imgDeltaECap': imgDeltaECap, 'imgHarmonize': imgHarmonize, 'imgHistogramBits': imgHistogramBits,
    'imgK': imgK, 'imgLightnessRange': imgLightnessRange, 'mode': mode, 'pickerSeeds': pickerSeeds, 'removeSeed': removeSeed, 'roles': roles, 'roleViews': roleViews,
    'run': run, 'running': running, 'scales': scales, 'schemaName': schemaName, 'setSeed': Seed.set
  };
}
