<script setup lang="ts">
import { EffectCoverflow, Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

/**
 * 3D coverflow carousel of the engine's semantic scales. Each slide is a glowing
 * glass card showing one alias's full 50→950 ramp (read live from the engine's
 * --ui-color-* variables) plus sample components in that color. Spin, swipe, drag.
 */
const aliases = [
  { 'key': 'primary', 'label': 'Primary' },
  { 'key': 'secondary', 'label': 'Secondary' },
  { 'key': 'success', 'label': 'Success' },
  { 'key': 'warning', 'label': 'Warning' },
  { 'key': 'error', 'label': 'Error' },
  { 'key': 'info', 'label': 'Info' },
  { 'key': 'neutral', 'label': 'Neutral' },
];
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<template>
  <ClientOnly>
    <Swiper
      :modules="[EffectCoverflow, Autoplay, Navigation, Pagination]"
      effect="coverflow"
      :grab-cursor="true"
      :centered-slides="true"
      slides-per-view="auto"
      :loop="true"
      :coverflow-effect="{ rotate: 38, stretch: 0, depth: 180, modifier: 1.1, slideShadows: false }"
      :autoplay="{ delay: 3400, disableOnInteraction: false, pauseOnMouseEnter: true }"
      :pagination="{ clickable: true }"
      class="palette-carousel !pb-12"
    >
      <SwiperSlide
        v-for="a in aliases"
        :key="a.key"
        class="carousel-slide"
      >
        <div
          class="glass scanlines float h-full p-5"
          :style="{ '--glow': `var(--ui-color-${a.key}-500)` }"
        >
          <div class="mb-3 flex items-center justify-between">
            <span
              class="font-display text-sm font-bold uppercase tracking-widest glow-text"
              :style="{ color: `var(--ui-color-${a.key}-400)` }"
            >{{ a.label }}</span>
            <span
              class="h-3 w-3 rounded-full pulse"
              :style="{ backgroundColor: `var(--ui-color-${a.key}-500)` }"
            />
          </div>

          <div class="mb-4 grid grid-cols-11 gap-0.5 overflow-hidden rounded-lg">
            <div
              v-for="s in shades"
              :key="s"
              class="h-14"
              :style="{ backgroundColor: `var(--ui-color-${a.key}-${s})` }"
              :title="`${a.key}-${s}`"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              :color="a.key === 'neutral' ? 'neutral' : (a.key as never)"
              size="xs"
            >
              Solid
            </UButton>
            <UButton
              :color="a.key === 'neutral' ? 'neutral' : (a.key as never)"
              variant="soft"
              size="xs"
            >
              Soft
            </UButton>
            <UButton
              :color="a.key === 'neutral' ? 'neutral' : (a.key as never)"
              variant="outline"
              size="xs"
            >
              Line
            </UButton>
            <UBadge
              :color="a.key === 'neutral' ? 'neutral' : (a.key as never)"
              variant="soft"
              size="sm"
            >
              500
            </UBadge>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
    <template #fallback>
      <div class="h-72 animate-pulse rounded-2xl bg-elevated" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.carousel-slide {
  width: 340px;
  max-width: 82vw;
  height: 260px;
}
.palette-carousel :deep(.swiper-pagination-bullet) {
  background: var(--ui-primary);
  opacity: 0.4;
}
.palette-carousel :deep(.swiper-pagination-bullet-active) {
  opacity: 1;
  box-shadow: 0 0 10px var(--ui-primary);
}
</style>
