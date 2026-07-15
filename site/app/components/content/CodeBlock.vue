<script setup lang="ts">
import { ref, watch } from 'vue';
import { highlightCode } from '~/theme/highlightCode.ts';
import type { SupportedLangType } from '~/composables/types/supportedLang.ts';

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

// Top-level await so SSR/prerender waits for the highlighted HTML before
// serializing the page — a fire-and-forget watch() never resolves in time
// for a static-generate snapshot, leaving code blocks empty for crawlers
// and no-JS clients even though hydration would eventually fill them in.
const html = ref<string>(await highlightCode(props.code, props.lang, props.vscodeTheme));

watch(
  () => [props.code, props.lang, props.vscodeTheme],
  async ([code, lang, theme]) => {
    html.value = await highlightCode(code as string, lang as SupportedLangType, theme as object);
  },
  { deep: true }
);

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
    <div class="code-block-toolbar">
      <UButton
        :icon="copied ? 'i-material-symbols-check-rounded' : 'i-material-symbols-content-copy-rounded'"
        :label="copied ? 'Copied' : 'Copy'"
        :color="copied ? 'success' : 'primary'"
        variant="solid"
        size="sm"
        @click="copy"
      />
    </div>
    <div
      class="code-block max-h-[28rem] overflow-auto text-xs leading-relaxed [&_pre]:rounded-none [&_pre]:p-3"
      v-html="html"
    />
  </div>
</template>

<style scoped>
/* One bordered panel, two stacked regions — a toolbar strip up top (the copy
   button lives here, never over the scrollable area) and the scrollable code
   below it. No absolute positioning, so there is no scrollbar/corner overlap
   to fight: the button's containment is structural, not coordinate math. */
.code-block-wrap {
  display: flex;
  flex-direction: column;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in oklch, var(--ui-primary) 18%, transparent);
  overflow: hidden;
}
.code-block-toolbar {
  display: flex;
  justify-content: flex-end;
  flex: none;
  padding: 0.4rem 0.5rem;
  background: color-mix(in oklch, var(--ui-bg-elevated) 70%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 14%, transparent);
}
.code-block {
  font-family: var(--font-mono);
}
/* Shiki re-tokenizes the whole block on every palette change; the global
   unison color transition (main.css) staggers across hundreds of spans and
   reads as a flickering double-color smear instead of a clean recolor. */
.code-block :deep(*) {
  transition: none;
}
</style>
