<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { highlightCode } from '~/theme/highlightCode.ts';
import type { SupportedLangType } from '~/composables/types/supportedLang.ts';
import { buildCodeBlockPreviewState, CODE_BLOCK_COPY_RESET_DELAY_MS } from './code/buildCodeBlockViewModel.ts';

/**
 * Real multi-language syntax highlighting (Shiki: CSS, JSON, JS/TS, XML) using
 * a genuine VS Code theme object as the color source — not a static Shiki
 * theme, but `theme.vscodeTheme`: the live output of this site's own
 * emit:vscodeThemeJson task (MultiOutput.vue runs the full vscode plugin
 * pipeline once per palette change and hands the result down). Highlighting
 * different output languages this way still stays 100% engine-derived: the
 * theme changes the moment a seed changes, same as everything else on the
 * page, because it IS the engine's output, just reused as Shiki's input.
 *
 * `caption` frames the block as a concrete deliverable file (e.g.
 * `theme.css`) instead of an unlabeled dump — rendered as a file-tab label
 * on the toolbar. `previewLines` optionally clamps the initial scroll height
 * for long formats (JSON, RDF, Android XML) behind a "Show full file"
 * disclosure; Copy always copies the full `code`, regardless of preview state.
 */
const props = defineProps<{ code: string; lang: SupportedLangType; vscodeTheme: object; caption?: string; previewLines?: number }>();

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
  copiedTimer = setTimeout(() => { copied.value = false; }, CODE_BLOCK_COPY_RESET_DELAY_MS);
}

/** Line count drives both the "N lines" disclosure label and whether the preview clamp applies at all — a short file with a `previewLines` prop still renders fully open. */
const previewState = computed(() => buildCodeBlockPreviewState(props.code, props.previewLines));
const expanded = ref(previewState.value.expandedByDefault);
</script>

<template>
  <div class="code-block-wrap">
    <div class="code-block-toolbar">
      <span
        v-if="caption"
        class="code-block-caption"
      >
        <UIcon
          name="i-material-symbols-description-outline-rounded"
          class="size-3.5 shrink-0"
        />
        <span class="truncate">{{ caption }}</span>
      </span>
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
      class="code-block overflow-auto text-xs leading-relaxed [&_pre]:rounded-none [&_pre]:p-3"
      :class="previewState.isLong && !expanded ? 'max-h-40' : 'max-h-[28rem]'"
      v-html="html"
    />
    <button
      v-if="previewState.isLong"
      type="button"
      class="code-block-expander"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span>{{ expanded ? 'Show less' : `Show full file (${previewState.totalLines} lines)` }}</span>
      <UIcon
        name="i-material-symbols-keyboard-arrow-down-rounded"
        class="size-4 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
      />
    </button>
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
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex: none;
  padding: 0.4rem 0.5rem;
  background: color-mix(in oklch, var(--ui-bg-elevated) 70%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 14%, transparent);
}
/* File-tab label — pushed left by `margin-right: auto` so the Copy button
   stays pinned right whether or not a caption is present. */
.code-block-caption {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-right: auto;
  min-width: 0;
  max-width: 60%;
  padding: 0.2rem 0.55rem;
  border-radius: 0.3rem;
  background: color-mix(in oklch, var(--ui-bg) 60%, transparent);
  border: 1px solid color-mix(in oklch, var(--ui-primary) 14%, transparent);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--ui-text-muted);
}
.code-block {
  font-family: var(--font-mono);
}
/* Preview-clamp disclosure footer, styled to match the toolbar strip above
   the scroll area rather than floating over it. */
.code-block-expander {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  flex: none;
  width: 100%;
  padding: 0.35rem 0.5rem;
  background: color-mix(in oklch, var(--ui-bg-elevated) 70%, transparent);
  border-top: 1px solid color-mix(in oklch, var(--ui-primary) 14%, transparent);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.code-block-expander:hover {
  color: var(--ui-text-highlighted);
}
/* Shiki re-tokenizes the whole block on every palette change; the global
   unison color transition (main.css) staggers across hundreds of spans and
   reads as a flickering double-color smear instead of a clean recolor. */
.code-block :deep(*) {
  transition: none;
}
</style>
