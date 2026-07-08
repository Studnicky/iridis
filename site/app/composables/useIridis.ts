/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import { ref, computed, watch } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import type { RoleSchemaInterface, RoleDefinitionInterface } from '@studnicky/iridis/model';

import { roleSchemaByName } from '../theme/roleSchemas.ts';
import { mapEngineToTokens, applyTokens, SHADE_KEYS } from '../theme/iridisProjector.ts';
import type { Framing, RoleHexMap, ScaleMap } from '../theme/iridisProjector.ts';

export type Mode = 'picker' | 'image';
export interface HistogramBin { readonly hex: string; readonly weight: number }
export interface RoleView { readonly name: string; readonly hex: string; readonly l: number; readonly c: number; readonly h: number }

/** Absolute OKLCH lightness per shade — resolved through the engine, not here. */
const SHADE_L: Record<number, number> = {
  50: 0.985, 100: 0.955, 200: 0.915, 300: 0.855, 400: 0.775, 500: 0.685,
  600: 0.595, 700: 0.505, 800: 0.415, 900: 0.335, 950: 0.235,
};
const VARIANT_CONFIG = SHADE_KEYS.map((s) => ({ 'name': `s${s}`, 'invertLightness': false, 'lightnessTarget': SHADE_L[s] as number }));

/**
 * Absolute target hues declared onto the schema's semantic roles. This is schema
 * authoring (a `hue` field the engine resolves), NOT color computation — the
 * engine still produces the actual color, inheriting each role's chroma/lightness
 * character from `derivedFrom` while pinning the hue so success stays green, etc.
 */
const SEMANTIC_HUE: Record<string, number> = { 'success': 150, 'warning': 85, 'error': 27, 'info': 250 };

const COLOR_PIPELINE = [
  'intake:hex', 'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant',
];
const IMAGE_PIPELINE = [
  'intake:imagePixels', 'gallery:histogram', 'gallery:extract', 'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant',
];

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

/** Author hue targets onto the schema's semantic roles (engine resolves them). */
function withSemanticHues(schema: RoleSchemaInterface): RoleSchemaInterface {
  return {
    ...schema,
    'roles': schema.roles.map((r: RoleDefinitionInterface) =>
      (SEMANTIC_HUE[r.name] !== undefined)
        ? { ...r, 'hue': SEMANTIC_HUE[r.name] }
        : r),
  };
}

/* ─── shared reactive state ─── */
const mode = ref<Mode>('picker');
const pickerSeeds = ref<string[]>(['#7c3aed', '#06b6d4', '#f59e0b']);
const imageSeeds = ref<string[]>([]);
const framing = ref<Framing>('dark');
const schemaName = ref<string>('iridis-32');
const contrastLevel = ref<'AA' | 'AAA'>('AA');

const roles = ref<RoleHexMap>({});
const roleViews = ref<RoleView[]>([]);
const scales = ref<ScaleMap>({});
const histogram = ref<HistogramBin[]>([]);
const running = ref<boolean>(false);
const error = ref<string | null>(null);

const activeSeeds = computed<string[]>(() => (mode.value === 'image' ? imageSeeds.value : pickerSeeds.value));

function ingest(state: { roles: Record<string, { hex: string; oklch: { l: number; c: number; h: number } }>; variants: Record<string, Record<string, { hex: string }>> }): void {
  const roleHex: RoleHexMap = {};
  const views: RoleView[] = [];
  for (const [name, r] of Object.entries(state.roles)) {
    roleHex[name] = r.hex;
    views.push({ 'name': name, 'hex': r.hex, 'l': r.oklch.l, 'c': r.oklch.c, 'h': r.oklch.h });
  }
  const sc: ScaleMap = {};
  for (const s of SHADE_KEYS) {
    const variant = state.variants[`s${s}`];
    if (!variant) continue;
    const perShade: RoleHexMap = {};
    for (const [name, rec] of Object.entries(variant)) perShade[name] = rec.hex;
    sc[s] = perShade;
  }
  roles.value = roleHex;
  roleViews.value = views;
  scales.value = sc;
  applyTokens(mapEngineToTokens(roleHex, sc), framing.value);
}

async function run(): Promise<void> {
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
  if (!pair || activeSeeds.value.length === 0) return;
  running.value = true;
  error.value = null;
  try {
    engine.pipeline([...COLOR_PIPELINE]);
    const state = await engine.run({
      'colors':   activeSeeds.value,
      'roles':    withSemanticHues(pair[framing.value]),
      'contrast': { 'level': contrastLevel.value, 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
      'metadata': { 'core:variantConfig': VARIANT_CONFIG },
    });
    ingest(state as never);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

async function decodeToPixels(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
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
  if (!ctx) throw new Error('no 2D context');
  ctx.drawImage(img, 0, 0, w, h);
  return { 'data': ctx.getImageData(0, 0, w, h).data, 'width': w, 'height': h };
}

/** Run the image pipeline: capture histogram, dominant seeds; switch to image mode. */
async function extractFromImage(fileOrUrl: File | string, k = 6): Promise<void> {
  if (typeof document === 'undefined') return;
  running.value = true;
  error.value = null;
  try {
    const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const pixels = await decodeToPixels(src);
    const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
    engine.pipeline([...IMAGE_PIPELINE]);
    const state = await engine.run({
      'colors':   [pixels],
      'roles':    withSemanticHues(pair![framing.value]),
      'contrast': { 'level': contrastLevel.value, 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
      'metadata': { 'gallery': { 'k': k, 'algorithm': 'medianCut' }, 'core:variantConfig': VARIANT_CONFIG },
    });
    const hist = (state.metadata['gallery:histogram'] as { bins?: HistogramBin[] } | undefined)?.bins ?? [];
    histogram.value = [...hist].sort((a, b) => b.weight - a.weight).slice(0, 96);
    const dominant = (state.metadata['gallery:dominantColors'] as Array<{ hex: string }> | undefined) ?? [];
    imageSeeds.value = dominant.map((c) => c.hex).filter((hex) => /^#[0-9a-fA-F]{6}$/.test(hex)).slice(0, 8);
    mode.value = 'image';
    ingest(state as never);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

function addSeed(hex = '#888888'): void { if (pickerSeeds.value.length < 8) pickerSeeds.value = [...pickerSeeds.value, hex]; }
function removeSeed(i: number): void { if (pickerSeeds.value.length > 1) pickerSeeds.value = pickerSeeds.value.filter((_, idx) => idx !== i); }
function setSeed(i: number, hex: string): void { pickerSeeds.value = pickerSeeds.value.map((s, idx) => (idx === i ? hex : s)); }

let booted = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(): void {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void run(); }, 120);
}

export function useIridis() {
  if (!booted && typeof window !== 'undefined') {
    booted = true;
    void run();
    watch([pickerSeeds, imageSeeds, framing, schemaName, contrastLevel, mode], schedule, { 'deep': true });
  }
  return {
    mode, pickerSeeds, imageSeeds, activeSeeds, framing, schemaName, contrastLevel,
    roles, roleViews, scales, histogram, running, error,
    run, addSeed, removeSeed, setSeed, extractFromImage,
  };
}
