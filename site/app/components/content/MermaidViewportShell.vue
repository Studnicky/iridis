<script setup lang="ts">
import { createCameraDpadMachine } from './viz/CameraControls.ts';
import { createViewportStatus } from './viz/ViewportStatus.ts';

const props = withDefaults(defineProps<{
  expanded: boolean;
  scale: number;
  dragging: boolean;
  svgContent: string;
}>(), {});

const emit = defineEmits<{
  toggleExpand: [];
  wheel: [event: WheelEvent];
  pointerdown: [event: PointerEvent];
  pointermove: [event: PointerEvent];
  pointerup: [event: PointerEvent];
  pointerleave: [event: PointerEvent];
  zoomIn: [];
  zoomOut: [];
  panUp: [];
  panDown: [];
  panLeft: [];
  panRight: [];
  centre: [];
  fit: [];
}>();

const viewportRef = defineModel<HTMLElement | null>('viewportRef', { default: null });

const dpadMachine = createCameraDpadMachine({
  'getZoomLevel': () => props.scale,
  'getHint': () => createViewportStatus(props.scale, 'inline', 'drag · wheel').hint,
  'can': (action) => action !== 'close',
  'zoomIn': () => { emit('zoomIn'); },
  'zoomOut': () => { emit('zoomOut'); },
  'pan': (direction) => {
    switch (direction) {
      case 'up': emit('panUp'); break;
      case 'down': emit('panDown'); break;
      case 'left': emit('panLeft'); break;
      case 'right': emit('panRight'); break;
    }
  },
  'centre': () => { emit('centre'); },
  'fit': () => { emit('fit'); },
  'expand': () => { emit('toggleExpand'); },
}, 'inline');
</script>

<template>
  <Teleport to="body">
    <div
      v-if="expanded"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
      @click="emit('toggleExpand')"
    />
  </Teleport>

  <Teleport
    to="body"
    :disabled="!expanded"
  >
    <div
      class="my-8 w-full border border-default bg-elevated/30 shadow-sm relative group select-none transition-all duration-300 flex flex-col overflow-hidden"
      :class="expanded ? 'fixed inset-6 z-[9999] rounded-xl bg-elevated shadow-2xl' : 'h-[500px] rounded-xl'"
    >
      <div
        ref="viewportRef"
        class="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
        @wheel="emit('wheel', $event)"
        @pointerdown="emit('pointerdown', $event)"
        @pointermove="emit('pointermove', $event)"
        @pointerup="emit('pointerup', $event)"
        @pointerleave="emit('pointerleave', $event)"
      >
        <div
          class="origin-top-left absolute top-0 left-0"
          :style="{ transform: `translate(var(--diagram-translate-x), var(--diagram-translate-y)) scale(var(--diagram-scale))`, transition: dragging ? 'none' : 'transform 75ms ease-out' }"
        >
          <div
            class="mermaid-container [&_svg]:max-w-none [&_svg]:w-auto [&_svg]:h-auto"
            v-html="svgContent"
          />
        </div>
      </div>

      <div class="absolute bottom-4 right-4 z-10">
        <GraphDpad
          :machine="dpadMachine"
        />
      </div>
    </div>
  </Teleport>
</template>
