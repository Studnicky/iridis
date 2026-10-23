<script setup lang="ts">
import { IridisUiEvent } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { buildSchemaComplianceSummaries } from './schema/buildSchemaComplianceSummaries.ts';
import { ContrastChoiceModels } from './contrastChoiceModels.ts';
import SchemaSelector from './SchemaSelector.vue';

/**
 * Schema & Compliance — role-count schema, color space, and contrast
 * strictness. A Refine-stage carousel card: it configures how the engine
 * resolves and validates roles, the same stage that assigns them (Palette).
 * All CVD auto-correct/preview controls live in the CVD vision card instead
 * — not duplicated here. Per-relation hue-derivation algorithms live in
 * their own Derivation Relations card (see DerivationRelations.vue).
 */
const {
  schemaName, contrastStrictness, cvdMode, nonMandatoryLevel, colorSpace,
  contrastReport
} = useIridis();
const { send } = useIridisUiMachine();
const { activateTarget } = useNavigationTargets();

/** Pass/fail summary badge for the selected contrast standard. */
const stageSummaries = computed(() => {
  const result = buildSchemaComplianceSummaries.build(contrastReport.value.compliance, {
    'cvdMode': cvdMode.value,
    'nonMandatoryLevel': nonMandatoryLevel.value
  });
  return result;
});

function updateColorSpace(colorSpace: 'displayP3' | 'srgb'): void {
  send(colorSpace === 'displayP3' ? IridisUiEvent.displayP3ColorSpace() : IridisUiEvent.setSrgbColorSpace());
  activateTarget('pairingPreview');
}

function updateContrastStrictness(strictness: number): void {
  send(IridisUiEvent.setContrastStrictness(strictness));
}

function updateCvdMode(value: string): void {
  send(IridisUiEvent.setCvdMode(value));
}

function updateNonMandatoryLevel(value: string): void {
  send(IridisUiEvent.setNonMandatoryLevel(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <!-- LEFT COLUMN: Schema & Color Space -->
      <div class="space-y-4">
        <SectionIntro title="Role schema">
          <template #body>
            <span>How many roles to resolve — <strong class="text-highlighted">iridis-4</strong> is the minimal set, <strong class="text-highlighted">iridis-32</strong> resolves the full token surface this site renders.</span>
          </template>
          <SchemaSelector
            :model-value="schemaName"
            @update:model-value="send(IridisUiEvent.setSchema($event))"
          />
        </SectionIntro>

        <SectionIntro
          title="Color Space"
          body="The color space used when exporting CSS variables."
        >
          <AppSelect
            :model-value="colorSpace"
            :items="[{ label: 'sRGB', value: 'srgb' }, { label: 'Display P3', value: 'displayP3' }]"
            class="w-full"
            @update:model-value="updateColorSpace"
          />
          <FieldHelpText class="mt-0">
            <strong class="text-highlighted">Display P3</strong> allows for much wider gamut colors on compatible displays.
          </FieldHelpText>
        </SectionIntro>
      </div>

      <!-- RIGHT COLUMN: Contrast Target -->
      <div class="space-y-4">
        <ContrastStrictnessControl
          :strictness="contrastStrictness"
          @update="updateContrastStrictness"
        />
        <ContrastChoiceControl
          :model="ContrastChoiceModels.nonMandatoryLevel"
          :selected="nonMandatoryLevel"
          @update="updateNonMandatoryLevel"
        />
        <ContrastChoiceControl
          :model="ContrastChoiceModels.cvdMode"
          :selected="cvdMode"
          @update="updateCvdMode"
        />
        <div class="flex justify-end">
          <UButton
            label="Open CVD panel"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="activateTarget('cvd')"
          />
        </div>
      </div>
    </div>

    <SchemaComplianceFooter :stage-summaries="stageSummaries" />
  </div>
</template>
