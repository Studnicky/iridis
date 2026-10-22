<script setup lang="ts">
import { computed } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from 'reka-ui';
import { useIridis } from '~/composables/useIridis.ts';
import { buildPipelineStageModel } from './pipeline/buildPipelineStageModel.ts';

type PipelineStageType = {
  label: string;
  description: string;
  optionalControl: object | undefined;
  reads: string[];
  value: string;
  writes: string[];
};

const props = defineProps<{ stage: PipelineStageType }>();

const { enabledOptionalStages, contrastReport } = useIridis();

const stageModel = computed(() => buildPipelineStageModel.build(
  props.stage.value,
  enabledOptionalStages.value,
  contrastReport.value
));
</script>

<template>
  <AccordionItem
    :value="stage.value"
    class="border-b border-default"
  >
    <AccordionHeader class="flex items-center gap-2">
      <AccordionTrigger class="flex flex-1 items-center gap-2 py-3 text-left hover:text-highlighted">
        <span class="font-medium">{{ stage.label }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
        />
      </AccordionTrigger>
      <UBadge
        v-if="stage.optionalControl !== undefined"
        :color="stageModel.isEnabled ? 'primary' : 'neutral'"
        :variant="stageModel.isEnabled ? 'soft' : 'subtle'"
        size="sm"
      >
        {{ stageModel.isEnabled ? 'enabled' : 'disabled' }}
      </UBadge>
      <UBadge
        v-else
        color="neutral"
        variant="subtle"
        size="sm"
      >
        required
      </UBadge>
    </AccordionHeader>
    <AccordionContent class="pb-4">
      <p class="mb-2 text-sm text-muted">
        {{ stage.description }}
      </p>
      <div class="flex flex-wrap gap-3 text-xs">
        <div v-if="stage.reads.length">
          <span class="text-dimmed">reads </span>
          <UBadge
            v-for="readKey in stage.reads"
            :key="readKey"
            color="neutral"
            variant="soft"
            size="xs"
            class="mr-1 font-mono"
          >
            {{ readKey }}
          </UBadge>
        </div>
        <div v-if="stage.writes.length">
          <span class="text-dimmed">writes </span>
          <UBadge
            v-for="writeKey in stage.writes"
            :key="writeKey"
            color="primary"
            variant="soft"
            size="xs"
            class="mr-1 font-mono"
          >
            {{ writeKey }}
          </UBadge>
        </div>
      </div>

      <p
        v-if="stageModel.isCvdStage"
        class="mt-3 text-xs text-muted"
      >
        Failing pairs are always auto-corrected: the correction adjusts the palette itself.
      </p>

      <div
        v-if="stageModel.contrastSummary !== undefined"
        class="mt-3 text-xs text-muted"
      >
        {{ stageModel.contrastSummary }}
      </div>
      <BadgeSummaryRow
        v-if="stageModel.cvdWarningCount !== undefined"
        class="mt-3"
      >
        <UBadge
          color="neutral"
          variant="soft"
          size="xs"
        >
          {{ stageModel.cvdWarningCount }} warnings
        </UBadge>
        <UBadge
          v-if="stageModel.cvdCorrectionText !== undefined"
          color="primary"
          variant="soft"
          size="xs"
        >
          {{ stageModel.cvdCorrectionText }}
        </UBadge>
      </BadgeSummaryRow>
    </AccordionContent>
  </AccordionItem>
</template>
