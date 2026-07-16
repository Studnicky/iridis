<script setup lang="ts">
import { computed } from 'vue';
import { globalVscodeTheme } from '~/composables/globalVscodeTheme.ts';
import CodeBlock from './CodeBlock.vue';
import { resolveSupportedCodeLang } from './code/resolveSupportedCodeLang.ts';

const props = defineProps<{
  code?: string;
  language?: string;
  filename?: string;
  highlights?: number[];
  meta?: string;
  class?: string;
}>();

const lang = computed(() => resolveSupportedCodeLang(props.language));
</script>

<template>
  <CodeBlock
    :code="props.code || ''"
    :lang="lang"
    :vscode-theme="globalVscodeTheme"
    :caption="props.filename"
  />
</template>
