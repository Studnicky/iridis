<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useColorMode } from '#imports';
import {
  buildMermaidRenderErrorMarkup,
  createMermaidRenderId,
} from './mermaid/buildMermaidViewModel.ts';
import { MermaidExplorer } from './mermaid/MermaidExplorer.ts';
import { mermaidThemeSignature, renderMermaidDiagram } from './mermaid/renderMermaidDiagram.ts';

const props = defineProps<{
  code: string;
}>();

const svgContent = ref('');
const renderId = createMermaidRenderId();
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
    MermaidExplorer.enhance(viewportRef.value as unknown as Parameters<typeof MermaidExplorer.enhance>[0]);
  });
};

const renderMermaid = async () => {
  const seq = ++renderSeq;
  if (!props.code) return;
  const themeSignature = mermaidThemeSignature();
  if (lastRenderedCode === props.code && lastRenderedThemeSignature === themeSignature) {
    return;
  }

  try {
    const rendered = await renderMermaidDiagram(renderId, props.code);
    if (seq !== renderSeq) return;

    svgContent.value = rendered;
    if (viewportRef.value !== null) {
      viewportRef.value.dataset['dagExplorerRender'] = String(seq);
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
    svgContent.value = buildMermaidRenderErrorMarkup(e);
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
    v-html="svgContent"
  />
</template>
