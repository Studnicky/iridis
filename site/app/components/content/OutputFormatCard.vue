<script setup lang="ts">
import { computed } from 'vue';
import { useMultiOutput } from '~/composables/useMultiOutput.ts';
import { globalVscodeTheme } from '~/composables/useVscodeTheme.ts';

/**
 * One Stylesheets-stage carousel card per output format — `formatKey` is one of
 * CarouselSections.ts's OUTPUT_FORMAT_CARDS keys (minus its 'output-'
 * prefix), matching useMultiOutput()'s `outputsByKey` keys 1:1.
 */
const props = defineProps<{ formatKey: string }>();
const { outputsByKey } = useMultiOutput();
const row = computed(() => outputsByKey.value[props.formatKey]);
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted">
      One <span class="font-mono text-[10px]">engine.run()</span>, every plugin format reads the same resolved roles — just written differently.
    </p>
    <CodeBlock
      :code="row?.text || ''"
      :lang="row?.lang || 'json'"
      :vscode-theme="globalVscodeTheme"
    />
  </div>
</template>
