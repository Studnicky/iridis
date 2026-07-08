<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Syntax-highlighted code, colored by the ENGINE's resolved syntax-* roles.
 * The very tokens the engine derives (syntax-keyword/string/number/function/…)
 * are what paint this code — so the output panel demonstrates the syntax palette
 * it just generated. Single-pass tokenizer (no nested-replace corruption).
 */
const props = defineProps<{ code: string }>();
const { roles } = useIridis();

/** Resolve a syntax role with graceful fallbacks for sparser schema tiers. */
function role(...names: string[]): string {
  for (const n of names) { const v = roles.value[n]; if (v) return v; }
  return 'var(--ui-text)';
}
const colors = computed(() => ({
  'comment': role('syntax-comment', 'text-subtle', 'muted'),
  'string': role('syntax-string', 'success'),
  'number': role('syntax-number', 'warning'),
  'func': role('syntax-function', 'info', 'brand'),
  'attr': role('syntax-attribute', 'syntax-keyword', 'brand'),
  'keyword': role('syntax-keyword', 'brand'),
  'punc': role('syntax-punctuation', 'text-subtle', 'muted'),
  'type': role('syntax-type', 'info'),
}));

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TOKEN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9a-fA-F]{3,8}\b)|(--[a-zA-Z0-9-]+)|([a-zA-Z_][\w-]*(?=\s*\())|(-?\d+\.?\d*(?:px|rem|em|%|deg|s|ms)?\b)|([A-Z][a-zA-Z0-9]+\b)|([{}:;,()[\]])/g;

const html = computed(() => {
  const c = colors.value;
  const code = props.code;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code)) !== null) {
    out += esc(code.slice(last, m.index));
    const [full, comment, str, hex, cssvar, fn, num, type, punc] = m;
    let color = 'inherit';
    if (comment) color = c.comment;
    else if (str) color = c.string;
    else if (hex) color = c.string;
    else if (cssvar) color = c.attr;
    else if (fn) color = c.func;
    else if (num) color = c.number;
    else if (type) color = c.type;
    else if (punc) color = c.punc;
    out += `<span style="color:${color}">${esc(full)}</span>`;
    last = m.index + full.length;
  }
  out += esc(code.slice(last));
  return out;
});
</script>

<template>
  <pre class="code-block max-h-72 overflow-auto rounded-lg p-3 text-xs leading-relaxed"><code v-html="html" /></pre>
</template>

<style scoped>
.code-block {
  font-family: var(--font-mono);
  background: color-mix(in oklch, var(--ui-color-neutral-950, #0a0a0a) 70%, var(--ui-bg));
  border: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
}
</style>
