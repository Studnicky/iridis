<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { highlightCode } from '~/theme/Highlighter.ts';
import type { SupportedLangType } from '~/theme/Highlighter.ts';

/**
 * Real multi-language syntax highlighting (Shiki: CSS, JSON, JS/TS, XML) using
 * a genuine VS Code theme object as the color source — not a static Shiki
 * theme, but `theme.vscodeTheme`: the live output of this site's own
 * emit:vscodeThemeJson task (MultiOutput.vue runs the full vscode plugin
 * pipeline once per palette change and hands the result down). Highlighting
 * different output languages this way still stays 100% engine-derived: the
 * theme changes the moment a seed changes, same as everything else on the
 * page, because it IS the engine's output, just reused as Shiki's input.
 */
const props = defineProps<{ code: string; lang: SupportedLangType; vscodeTheme: object }>();

const html = ref<string>('');

watchEffect(async () => {
  const code = props.code;
  const lang = props.lang;
  const theme = props.vscodeTheme;
  html.value = await highlightCode(code, lang, theme);
});

/** Copy-to-clipboard lives here (not the caller) since this component already owns `code`. */
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
async function copy(): Promise<void> {
  if (!props.code) {return;}
  await navigator.clipboard.writeText(props.code);
  copied.value = true;
  if (copiedTimer !== undefined) {clearTimeout(copiedTimer);}
  copiedTimer = setTimeout(() => { copied.value = false; }, 1500);
}
</script>

<template>
  <div class="code-block-wrap">
    <UButton
      :icon="copied ? 'i-material-symbols-check-rounded' : 'i-material-symbols-content-copy-rounded'"
      color="neutral"
      variant="soft"
      size="xs"
      class="code-block-copy"
      :aria-label="copied ? 'Copied' : 'Copy to clipboard'"
      @click="copy"
    />
    <div
      class="code-block max-h-[28rem] overflow-auto rounded-lg text-xs leading-relaxed [&_pre]:rounded-lg [&_pre]:p-3"
      v-html="html"
    />
  </div>
</template>

<style scoped>
.code-block-wrap { position: relative; }
.code-block-copy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  backdrop-filter: blur(4px);
}
.code-block {
  font-family: var(--font-mono);
  border: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
}
/* Shiki re-tokenizes the whole block on every palette change; the global
   unison color transition (main.css) staggers across hundreds of spans and
   reads as a flickering double-color smear instead of a clean recolor. */
.code-block :deep(*) {
  transition: none;
}
</style>
