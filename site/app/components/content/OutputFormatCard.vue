<script setup lang="ts">
import { computed } from 'vue';
import { useMultiOutput } from '~/composables/useMultiOutput.ts';
import { globalVscodeTheme } from '~/composables/globalVscodeTheme.ts';
import { buildOutputFormatCardModel } from './buildOutputFormatCardModel.ts';

/**
 * One Stylesheets-stage carousel card per output format — `formatKey` is one of
 * outputFormatCards.ts's OUTPUT_FORMAT_CARDS keys (minus its 'output-'
 * prefix), matching useMultiOutput()'s `outputsByKey` keys 1:1.
 */
const props = defineProps<{ formatKey: string }>();
const { outputsByKey } = useMultiOutput();
const cardModel = computed(() => buildOutputFormatCardModel(
  props.formatKey,
  outputsByKey.value[props.formatKey]
));
</script>

<template>
  <div class="space-y-3">
    <SectionIntro :body="cardModel.instruction" />
    <CodeBlock
      :code="cardModel.code"
      :lang="cardModel.lang"
      :vscode-theme="globalVscodeTheme"
      :caption="cardModel.filename"
      :preview-lines="cardModel.previewLines"
    />
  </div>
</template>
