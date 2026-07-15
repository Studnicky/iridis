<script setup lang="ts">
import { computed } from 'vue';
import { globalVscodeTheme } from '~/composables/useVscodeTheme';
import CodeBlock from './CodeBlock.vue';
import type { SupportedLangType } from '~/composables/types/supportedLang.ts';

const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
  highlights?: number[];
  meta?: string;
  class?: string;
}>();

// Map Nuxt Content languages to our SupportedLangType
const langMap: Record<string, SupportedLangType> = {
  'js': 'javascript',
  'javascript': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'css': 'css',
  'json': 'json',
  'xml': 'xml',
  'html': 'html',
  'sh': 'bash',
  'bash': 'bash'
};
const lang = computed(() => langMap[props.language || ''] || 'bash');
</script>

<template>
  <CodeBlock
    :code="props.code || ''"
    :lang="lang"
    :vscode-theme="globalVscodeTheme"
  />
</template>
