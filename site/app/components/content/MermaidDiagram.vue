<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useColorMode } from '#imports';
import { buildMermaidViewModel } from './mermaid/buildMermaidViewModel.ts';
import { MermaidExplorer } from './mermaid/MermaidExplorer.ts';
import { renderMermaidDiagram } from './mermaid/renderMermaidDiagram.ts';
import { trustedMarkupRenderer } from './trustedMarkupRenderer.ts';

const props = defineProps<{
  code: string;
}>();

const renderId = buildMermaidViewModel.createRenderId();
const colorMode = useColorMode();
const viewportRef = ref<HTMLElement | null>(null);
let renderRaf: number | null = null;
let explorerRaf: number | null = null;
let renderSeq = 0;
let lastRenderedCode = '';
let lastRenderedThemeSignature = '';

const activateExplorer = (): void => {
  if (!viewportRef.value) return;

  if (explorerRaf !== null) return;
  explorerRaf = requestAnimationFrame(() => {
    explorerRaf = null;
    if (viewportRef.value === null) return;
    MermaidExplorer.enhance(viewportRef.value);
  });
};

const renderMermaid = async () => {
  const seq = ++renderSeq;
  if (!props.code) return;
  const themeSignature = renderMermaidDiagram.themeSignature();
  if (lastRenderedCode === props.code && lastRenderedThemeSignature === themeSignature) {
    return;
  }

  try {
    const rendered = await renderMermaidDiagram.render(renderId, props.code);
    if (seq !== renderSeq) return;

    const viewport = viewportRef.value;
    if (viewport === null) {
      return;
    }
    const result = trustedMarkupRenderer.render(viewport, rendered, 'svg');
    if (!result.accepted) {
      return;
    }
    if (result.changed) {
      viewport.dataset['dagExplorerRender'] = String(seq);
    }
    lastRenderedCode = props.code;
    lastRenderedThemeSignature = themeSignature;

    nextTick(() => {
      if (seq !== renderSeq) return;
      activateExplorer();
    });
  } catch (e) {
    if (seq !== renderSeq) return;
    console.error('Mermaid render error:', e);
    if (viewportRef.value !== null) {
      trustedMarkupRenderer.renderError(viewportRef.value, e);
    }
  }
};

const queueRender = (): void => {
  if (renderRaf !== null) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = null;
    void renderMermaid();
  });
};

onMounted(() => {
  queueRender();
});

watch([() => props.code, () => colorMode.value], () => {
  queueRender();
});

onBeforeUnmount(() => {
  renderSeq += 1;
  if (renderRaf !== null) {
    cancelAnimationFrame(renderRaf);
  }
  if (explorerRaf !== null) {
    cancelAnimationFrame(explorerRaf);
    explorerRaf = null;
  }
});
</script>

<template>
  <div
    ref="viewportRef"
    class="dagonizer-mermaid"
  />
</template>
