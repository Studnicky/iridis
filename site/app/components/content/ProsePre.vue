<script setup lang="ts">
import { computed } from 'vue';
import { globalVscodeTheme } from '~/composables/useVscodeTheme';
import CodeBlock from './CodeBlock.vue';
import type { SupportedLangType } from '~/theme/Highlighter';

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
  'ts': 'javascript',
  'typescript': 'javascript',
  'css': 'css',
  'json': 'json',
  'xml': 'xml',
  'html': 'xml'
};
const lang = computed(() => langMap[props.language || ''] || 'javascript');
</script>

<template>
  <CodeBlock :code="props.code || ''" :lang="lang" :vscode-theme="globalVscodeTheme" />
</template>
