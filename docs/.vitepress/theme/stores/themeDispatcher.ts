/**
 * Single source of truth for the docs theme. State-machine dispatcher:
 * components emit actions, the reducer derives the next state, a single
 * projector layer translates that state to the DOM (html class,
 * localStorage, engine output).
 *
 * Components NEVER mutate state directly, NEVER write to the DOM, NEVER
 * observe each other — they dispatch actions and read projections.
 *
 *      ┌──────────┐ dispatch ┌─────────┐ projects ┌──────────┐
 *      │component │ ───────▶ │ reducer │ ───────▶ │  DOM /   │
 *      │(emitter) │          │         │          │  engine  │
 *      └──────────┘          └─────────┘          └──────────┘
 *           ▲                                           │
 *           └───────── reactive subscription ◀──────────┘
 *
 * VitePress's own appearance switch dispatches `setFraming` via a single
 * MutationObserver bridge — the ONLY place that observes the DOM. Every
 * other write is an explicit action. With one reducer + one projector
 * the effect order is explicit (action → state → project) so the dark
 * toggle is deterministic instead of timing-sensitive.
 */

import { reactive, watch } from 'vue';

import type { DocsConfigType } from '../schemas/docsConfig.schema.ts';
import { docsConfigDefaults } from '../schemas/docsConfig.schema.ts';
import { applyConfigToDocument } from './applyConfigToDocument.ts';

const STORAGE_KEY    = 'iridis-docs-config';
const VP_THEME_KEY   = 'vitepress-theme-appearance';

/* ─── State ─────────────────────────────────────────────────────────── */

const state = reactive<DocsConfigType>({ ...docsConfigDefaults });

/* ─── Actions ───────────────────────────────────────────────────────── */

type Action =
  | { 'type': 'init';                'next': Partial<DocsConfigType> }
  | { 'type': 'setFraming';          'framing':       'dark' | 'light' }
  | { 'type': 'setPaletteColors';    'colors':        readonly string[] }
  | { 'type': 'setContrastLevel';    'level':         'AA' | 'AAA' }
  | { 'type': 'setContrastAlgorithm';'algorithm':     'wcag21' | 'apca' }
  | { 'type': 'setColorSpace';       'colorSpace':    'srgb' | 'displayP3' }
  | { 'type': 'setRoleSchema';       'roleSchema':    'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16' }
  | { 'type': 'reset' };

/* ─── Reducer ───────────────────────────────────────────────────────── */

function reduce(action: Action): void {
  switch (action.type) {
    case 'init':
      Object.assign(state, action.next);
      return;
    case 'setFraming':
      state.framing = action.framing;
      return;
    case 'setPaletteColors':
      state.paletteColors = [...action.colors];
      return;
    case 'setContrastLevel':
      state.contrastLevel = action.level;
      return;
    case 'setContrastAlgorithm':
      state.contrastAlgorithm = action.algorithm;
      return;
    case 'setColorSpace':
      state.colorSpace = action.colorSpace;
      return;
    case 'setRoleSchema':
      state.roleSchema = action.roleSchema;
      return;
    case 'reset':
      Object.assign(state, docsConfigDefaults);
      return;
  }
}

/* ─── Public API ────────────────────────────────────────────────────── */

/** Run a typed action through the reducer. Synchronous; the projector
 *  effects fire on the next Vue reactivity tick. */
export function dispatch(action: Action): void {
  reduce(action);
}

/** Read-only projection of state. Components subscribe via Vue reactivity. */
export const themeStore: Readonly<DocsConfigType> = state;

/** Mutable proxy — write any field; the reducer is invoked under the hood.
 *  Provided for v-model bindings that expect a writeable target. */
export const themeStoreWritable: DocsConfigType = new Proxy(state, {
  set(target, prop: keyof DocsConfigType, value): boolean {
    switch (prop) {
      case 'framing':           dispatch({ 'type': 'setFraming',          'framing':   value as 'dark' | 'light' }); break;
      case 'paletteColors':     dispatch({ 'type': 'setPaletteColors',    'colors':    value as readonly string[] }); break;
      case 'contrastLevel':     dispatch({ 'type': 'setContrastLevel',    'level':     value as 'AA' | 'AAA' }); break;
      case 'contrastAlgorithm': dispatch({ 'type': 'setContrastAlgorithm','algorithm': value as 'wcag21' | 'apca' }); break;
      case 'colorSpace':        dispatch({ 'type': 'setColorSpace',       'colorSpace':value as 'srgb' | 'displayP3' }); break;
      case 'roleSchema':        dispatch({ 'type': 'setRoleSchema',       'roleSchema':value as 'iridis-4' | 'iridis-8' | 'iridis-12' | 'iridis-16' }); break;
      default:
        (target as Record<string, unknown>)[prop as string] = value;
    }
    return true;
  },
}) as DocsConfigType;

/** Resets every config field to the schema's declared default. */
export function resetTheme(): void {
  dispatch({ 'type': 'reset' });
}

/* ─── Hydration ─────────────────────────────────────────────────────── */

/** Validate persisted values against the current schema enum so a stale
 *  localStorage entry from an older deploy (e.g. roleSchema:'minimal' from
 *  before the iridis-N rename) doesn't poison the dispatcher. Drop any
 *  field whose value isn't in the current allowed set; the reducer's
 *  init action falls back to docsConfigDefaults for missing keys. */
function migratePersisted(raw: Partial<DocsConfigType>): Partial<DocsConfigType> {
  const out: Partial<DocsConfigType> = {};
  const validRoleSchemas: ReadonlySet<string> = new Set(['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16']);
  const validFramings:    ReadonlySet<string> = new Set(['dark', 'light']);
  const validLevels:      ReadonlySet<string> = new Set(['AA', 'AAA']);
  const validAlgorithms:  ReadonlySet<string> = new Set(['wcag21', 'apca']);
  const validSpaces:      ReadonlySet<string> = new Set(['srgb', 'displayP3']);

  if (typeof raw.roleSchema        === 'string' && validRoleSchemas.has(raw.roleSchema))        out.roleSchema        = raw.roleSchema;
  if (typeof raw.framing           === 'string' && validFramings.has(raw.framing))              out.framing           = raw.framing;
  if (typeof raw.contrastLevel     === 'string' && validLevels.has(raw.contrastLevel))          out.contrastLevel     = raw.contrastLevel;
  if (typeof raw.contrastAlgorithm === 'string' && validAlgorithms.has(raw.contrastAlgorithm))  out.contrastAlgorithm = raw.contrastAlgorithm;
  if (typeof raw.colorSpace        === 'string' && validSpaces.has(raw.colorSpace))             out.colorSpace        = raw.colorSpace;
  if (Array.isArray(raw.paletteColors) && raw.paletteColors.every((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))) {
    out.paletteColors = raw.paletteColors;
  }
  return out;
}

function readPersisted(): Partial<DocsConfigType> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as Partial<DocsConfigType>;
    return migratePersisted(parsed);
  } catch {
    return {};
  }
}

function readDomFraming(): 'dark' | 'light' | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/* ─── Projector — the ONLY thing that writes the DOM ────────────────── */

let observer: MutationObserver | null = null;

function projectToDom(framing: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  // Pause our MutationObserver while we mutate, so we don't recurse.
  if (observer) observer.disconnect();
  html.classList.toggle('dark', framing === 'dark');
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(VP_THEME_KEY, framing); } catch { /* noop */ }
  }
  if (observer) observer.observe(html, { 'attributes': true, 'attributeFilter': ['class'] });
}

function persistConfig(snapshot: DocsConfigType): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* noop */ }
}

/* ─── Boot ──────────────────────────────────────────────────────────── */

let booted = false;

/**
 * One-shot initialiser. Idempotent — wires the persistence/DOM watchers
 * once, hydrates state from localStorage and the current dom framing,
 * and starts the projector loop. Called by the theme's `enhanceApp` hook.
 */
export function bootThemeDispatcher(): void {
  if (booted) return;
  booted = true;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Hydrate: persisted config wins, then DOM framing wins over default.
  const persisted = readPersisted();
  const domFraming = readDomFraming();
  dispatch({
    'type': 'init',
    'next': {
      ...persisted,
      ...(domFraming !== null ? { 'framing': domFraming } : {}),
    },
  });

  // Bridge VitePress's appearance toggle. VitePress mutates html.dark
  // directly; we observe and dispatch back. This is the ONLY place that
  // turns DOM mutations into actions.
  observer = new MutationObserver(() => {
    const next = readDomFraming();
    if (next !== null && next !== state.framing) {
      dispatch({ 'type': 'setFraming', 'framing': next });
    }
  });
  observer.observe(document.documentElement, { 'attributes': true, 'attributeFilter': ['class'] });

  // Project: every state change triggers DOM + persistence + engine.
  watch(
    () => state.framing,
    (next) => projectToDom(next),
    { 'immediate': true },
  );
  watch(
    () => ({ ...state }),
    (snapshot) => {
      persistConfig(snapshot);
      void applyConfigToDocument(snapshot);
    },
    { 'deep': true, 'immediate': true },
  );
}
