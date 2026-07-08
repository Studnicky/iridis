/**
 * Shared iridis engine state for the demo. One engine, one reactive palette;
 * every feature section (additive seeds, image extraction, resolved roles,
 * color spaces, multi-output) reads and writes the same seeds, so changing the
 * palette anywhere re-themes the whole page through `engine.run()`.
 */

import { ref, computed, watch } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';

import { roleSchemaByName } from '../theme/roleSchemas.ts';
import { mapRolesToTokens, applyTokens } from '../theme/iridisProjector.ts';
import type { Framing, ResolvedRoles, ResolvedRole } from '../theme/iridisProjector.ts';

const COLOR_PIPELINE = [
  'intake:hex', 'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
] as const;

const IMAGE_PIPELINE = [
  'intake:imagePixels', 'gallery:histogram', 'gallery:extract', 'resolve:roles', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
] as const;

const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

/* ─── shared reactive state (module-level = one store for the app) ─── */
const seeds = ref<string[]>(['#7c3aed', '#06b6d4', '#f59e0b']);
const framing = ref<Framing>('dark');
const schemaName = ref<string>('iridis-16');
const contrastLevel = ref<'AA' | 'AAA'>('AA');
const resolvedRoles = ref<ResolvedRoles>({});
const metadata = ref<Record<string, unknown>>({});
const running = ref<boolean>(false);
const error = ref<string | null>(null);

const roleList = computed<Array<{ name: string } & ResolvedRole>>(() =>
  Object.entries(resolvedRoles.value).map(([name, r]) => ({ 'name': name, ...r })));

function rolesFromState(stateRoles: Record<string, { hex: string; oklch: { l: number; c: number; h: number } }>): ResolvedRoles {
  const out: ResolvedRoles = {};
  for (const [name, rec] of Object.entries(stateRoles)) {
    out[name] = { 'hex': rec.hex, 'oklch': { 'l': rec.oklch.l, 'c': rec.oklch.c, 'h': rec.oklch.h } };
  }
  return out;
}

async function run(): Promise<void> {
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-16'];
  if (!pair) return;
  running.value = true;
  error.value = null;
  try {
    engine.pipeline([...COLOR_PIPELINE]);
    const state = await engine.run({
      'colors':   seeds.value,
      'roles':    pair[framing.value],
      'contrast': { 'level': contrastLevel.value, 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
    });
    resolvedRoles.value = rolesFromState(state.roles as never);
    metadata.value = state.metadata as Record<string, unknown>;
    applyTokens(mapRolesToTokens(resolvedRoles.value, framing.value), framing.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

/** Decode an image file to raw pixels for `intake:imagePixels`. */
async function decodeToPixels(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
  const MAX = 160;
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

/** Run the image pipeline and adopt the extracted dominant colors as seeds. */
async function extractFromImage(fileOrUrl: File | string, k = 6): Promise<void> {
  if (typeof document === 'undefined') return;
  running.value = true;
  error.value = null;
  try {
    const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const pixels = await decodeToPixels(src);
    const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-16'];
    engine.pipeline([...IMAGE_PIPELINE]);
    const state = await engine.run({
      'colors':   [pixels],
      'roles':    pair![framing.value],
      'contrast': { 'level': contrastLevel.value, 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
      'metadata': { 'gallery': { 'k': k, 'algorithm': 'medianCut' } },
    });
    const dominant = (state.metadata['gallery:dominantColors'] as Array<{ hex: string }> | undefined) ?? [];
    const extracted = dominant.map((c) => c.hex).filter((hex) => /^#[0-9a-fA-F]{6}$/.test(hex));
    if (extracted.length > 0) seeds.value = extracted.slice(0, 8);
    else await run();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

/* additive-seed mutators */
function addSeed(hex = '#888888'): void { if (seeds.value.length < 8) seeds.value = [...seeds.value, hex]; }
function removeSeed(i: number): void { if (seeds.value.length > 1) seeds.value = seeds.value.filter((_, idx) => idx !== i); }
function setSeed(i: number, hex: string): void { seeds.value = seeds.value.map((s, idx) => (idx === i ? hex : s)); }

let booted = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleRun(): void {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void run(); }, 120);
}

export function useIridis() {
  if (!booted && typeof window !== 'undefined') {
    booted = true;
    void run();
    watch([seeds, framing, schemaName, contrastLevel], scheduleRun, { 'deep': true });
  }
  return {
    seeds, framing, schemaName, contrastLevel,
    resolvedRoles, roleList, metadata, running, error,
    run, addSeed, removeSeed, setSeed, extractFromImage,
  };
}
