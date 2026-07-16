<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { buildCvdReport, CVD_TYPES, cvdTypeLabel } from './cvd/buildCvdVisionModel.ts';

/**
 * The CVD home — everything color-vision-deficiency-related lives here, not
 * split across cards: auto-correcting the palette itself, previewing what it
 * looks like under each condition (a real SVG filter, see
 * CvdPreviewOverlay.vue — display-only, never touches the palette), what each
 * condition actually is, and the resulting warnings report. Always usable, no
 * enable step — enforce:cvdSimulate itself runs unconditionally (see
 * useIridis.ts's REQUIRED_COLOR_STAGES).
 */
const { cvdCorrect, cvdPreviewTypes, contrastReport, send } = useIridis();

const cvdReport = computed(() => {
  return buildCvdReport(contrastReport.value.cvd);
});
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <SectionIntro>
        <template #body>
          Color vision deficiency (CVD) checking runs on every palette, always — see
          <code class="font-mono text-xs">enforce:cvdSimulate</code> in the Pipeline card. Auto-correct
          below adjusts the palette itself; the preview toggles further down only change how this
          page looks to you — they never touch the palette.
        </template>
      </SectionIntro>

      <ControlStrip
        title="Auto-correct CVD failures"
        description="Always-on — adjusts the palette itself, not just a preview."
      >
        <USwitch
          :model-value="cvdCorrect"
          @update:model-value="($event) => send({ 'cvdCorrect': $event as boolean, 'type': IridisUiActionType.SET_CVD_CORRECT })"
        />
      </ControlStrip>

      <SplitHeader>
        <PanelHeading
          title="Simulate CVD vision"
          as="span"
        />
        <template #meta>
          <UButton
            v-if="cvdPreviewTypes.size > 0"
            label="Clear"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="send({ 'type': IridisUiActionType.CVD_CLEAR_PREVIEWS })"
          />
        </template>
      </SplitHeader>

      <div class="grid gap-3 sm:grid-cols-2">
        <CvdTypeCard
          v-for="t in CVD_TYPES"
          :key="t.value"
          :type="t"
          :previewing="cvdPreviewTypes.has(t.value)"
          @toggle="($event) => send({ 'cvdType': $event, 'type': IridisUiActionType.CVD_TOGGLE_PREVIEW })"
        />
      </div>

      <CvdWarningsPanel
        :report="cvdReport"
        :cvd-type-label="cvdTypeLabel"
      />

      <div class="space-y-1 border-t border-default pt-3 text-xs text-muted">
        <p>
          Pick any combination above — real CVD isn't always one condition, and previewing
          multiple at once layers their filters together.
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <ExternalResourceLink
            href="https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness"
            compact
          >
            National Eye Institute: Color Blindness ↗
          </ExternalResourceLink>
          <ExternalResourceLink
            href="https://www.colourblindawareness.org/colour-blindness/types-of-colour-blindness/"
            compact
          >
            Colour Blind Awareness: Types of Colour Blindness ↗
          </ExternalResourceLink>
        </div>
      </div>
    </div>
  </UCard>
</template>
