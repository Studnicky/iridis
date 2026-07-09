<script setup lang="ts">
import { EffectCoverflow, Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

/**
 * 3D coverflow carousel of the engine's semantic scales — pure layout/presentation
 * around ScaleCard (the content). Without JS, Swiper never mounts, so the static
 * fallback renders the same ScaleCards as a centered, scroll-snapped row: same
 * composition (a horizontal run of same-sized cards) as the eventual carousel,
 * so gaining Swiper is an enhancement (motion/depth) rather than a layout swap.
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
        <ScaleCard :alias="a" />
      </SwiperSlide>
    </Swiper>
    <template #fallback>
      <div class="palette-static">
        <div
          v-for="a in aliases"
          :key="a.key"
          class="carousel-slide static-slide"
        >
          <ScaleCard :alias="a" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.carousel-slide {
  width: 340px;
  max-width: 82vw;
  height: 260px;
}
.palette-static {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0 calc(50% - 170px) 1rem;
}
.static-slide {
  flex: none;
  scroll-snap-align: center;
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
