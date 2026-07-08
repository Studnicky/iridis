<script setup lang="ts">
import { computed } from 'vue';
import { colorRecordFactory, ensureContrast } from '@studnicky/iridis';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Syntax-highlighted code whose colors are contrast-enforced by iridis itself.
 * Each token color starts from the engine's resolved syntax-* role, then is run
 * through `ensureContrast` against THIS block's background at the active target
 * ratio (AAA = 7, AA = 4.5). So the highlighting isn't just engine-colored — it
 * is provably compliant, which is the whole point of the demo. Single-pass
 * tokenizer (no nested-replace corruption).
 */
const props = defineProps<{ code: string }>();
const { roles, contrastLevel } = useIridis();

/** Raw resolved syntax role with graceful fallbacks for sparser tiers. */
function role(...names: string[]): string {
  for (const n of names) { const v = roles.value[n]; if (v) return v; }
  return roles.value['text'] ?? '#e6e6e6';
}

const bgHex = computed<string>(() => role('code-bg', 'bg-soft', 'surface', 'background'));
const target = computed<number>(() => (contrastLevel.value === 'AAA' ? 7 : 4.5));

/** Lift a color until it meets the target ratio against this block's bg. */
function compliant(hex: string): string {
  try {
    const fg = colorRecordFactory.fromHex(hex);
    const bg = colorRecordFactory.fromHex(bgHex.value);
    return ensureContrast.apply(fg, bg, target.value, 'wcag21').hex;
  } catch {
    return hex;
  }
}

const colors = computed(() => ({
  'comment': compliant(role('syntax-comment', 'text-subtle', 'muted')),
  'string': compliant(role('syntax-string', 'success')),
  'number': compliant(role('syntax-number', 'warning')),
  'func': compliant(role('syntax-function', 'info', 'brand')),
  'attr': compliant(role('syntax-attribute', 'syntax-keyword', 'brand')),
  'keyword': compliant(role('syntax-keyword', 'brand')),
  'punc': compliant(role('syntax-punctuation', 'text-subtle', 'muted')),
  'type': compliant(role('syntax-type', 'info')),
  'text': compliant(role('text')),
}));

const TOKEN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9a-fA-F]{3,8}\b)|(--[a-zA-Z0-9-]+)|([a-zA-Z_][\w-]*(?=\s*\())|(-?\d+\.?\d*(?:px|rem|em|%|deg|s|ms)?\b)|([A-Z][a-zA-Z0-9]+\b)|([{}:;,()[\]])/g;

type ColorSpanType = { 'color': string; 'text': string };

const spans = computed<ColorSpanType[]>(() => {
  const c = colors.value;
  const code = props.code;
  const out: ColorSpanType[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    out.push({ 'color': c.text, 'text': code.slice(last, m.index) });
    const [full, comment, str, hex, cssvar, fn, num, type, punc] = m;
    let color = c.text;
    if (comment) color = c.comment;
    else if (str) color = c.string;
    else if (hex) color = c.string;
    else if (cssvar) color = c.attr;
    else if (fn) color = c.func;
    else if (num) color = c.number;
    else if (type) color = c.type;
    else if (punc) color = c.punc;
    out.push({ 'color': color, 'text': full });
    last = m.index + full.length;
  }
  out.push({ 'color': c.text, 'text': code.slice(last) });
  return out;
});
</script>

<template>
  <pre
    class="code-block max-h-72 overflow-auto rounded-lg p-3 text-xs leading-relaxed"
    :style="{ backgroundColor: bgHex }"
  ><code><span
    v-for="(span, i) in spans"
    :key="i"
    :style="{ color: span.color }"
  >{{ span.text }}</span></code></pre>
</template>

<style scoped>
.code-block {
  font-family: var(--font-mono);
  border: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
}
</style>
