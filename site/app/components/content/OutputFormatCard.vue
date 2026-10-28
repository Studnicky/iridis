<script setup lang="ts">
import { computed } from 'vue';
import { OutputKeyEntity } from '~/composables/entities/OutputKeyEntity.ts';
import { OutputRowEntity } from '~/composables/entities/OutputRowEntity.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { globalVscodeTheme } from '~/composables/globalVscodeTheme.ts';
import { buildOutputFormatCardModel } from './buildOutputFormatCardModel.ts';
import { resolveSupportedCodeLang } from './code/resolveSupportedCodeLang.ts';

/**
 * One Stylesheets-stage carousel card per output format — `formatKey` is one of
 * outputFormatCards.ts's OUTPUT_FORMAT_CARDS keys (minus its 'output-'
 * prefix), matching useIridis()'s `outputsByKey` keys 1:1.
 */
const props = defineProps<{ formatKey: string }>();
const { outputsByKey } = useIridis();
const cardModel = computed(() => {
  const row = outputsByKey.value[OutputKeyEntity.intake(props.formatKey)];
  return buildOutputFormatCardModel.build(props.formatKey, OutputRowEntity.validate(row) ? row : undefined);
});
</script>

<template>
  <div class="space-y-3">
    <SectionIntro :body="cardModel.instruction" />
    <CodeBlock
      :code="cardModel.code"
      :lang="resolveSupportedCodeLang.resolve(cardModel.language)"
      :vscode-theme="globalVscodeTheme"
      :caption="cardModel.filename"
      :preview-lines="cardModel.previewLines"
    />
  </div>
</template>
