<script setup lang="ts">
import { computed } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from 'reka-ui';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { buildPipelineStageModel } from './pipeline/buildPipelineStageModel.ts';

type PipelineStageType = {
  label: string;
  description: string;
  optional: boolean;
  reads: string[];
  value: string;
  writes: string[];
};

const props = defineProps<{ stage: PipelineStageType }>();

const { enabledOptionalStages, cvdCorrect, contrastReport } = useIridis();
const { send } = useIridisUiMachine();

const stageModel = computed(() => buildPipelineStageModel(
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
        v-if="stage.optional"
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

      <ControlStrip
        v-if="stageModel.isCvdStage"
        class="mt-3"
        title="Auto-correct failing pairs"
      >
        <USwitch
          :model-value="cvdCorrect"
          @update:model-value="send({ type: IridisUiActionType.SET_CVD_CORRECT, cvdCorrect: $event as boolean })"
        />
      </ControlStrip>

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
