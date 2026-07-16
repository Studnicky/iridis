type SplitHeaderAlign = 'center' | 'start';
type ScrimStrength = 'soft' | 'medium' | 'strong';

const SPLIT_HEADER_ROW_CLASS: Record<SplitHeaderAlign, string> = {
  'center': 'flex flex-wrap items-center justify-between gap-3',
  'start': 'flex flex-wrap items-start justify-between gap-3'
};

const SCRIM_BACKGROUND_BY_STRENGTH: Record<ScrimStrength, string> = {
  'soft': 'radial-gradient(ellipse 85% 130% at 50% 50%, color-mix(in oklch, var(--ui-bg) 80%, transparent) 0%, color-mix(in oklch, var(--ui-bg) 80%, transparent) 55%, transparent 100%)',
  'medium': 'radial-gradient(ellipse 70% 80% at 50% 50%, color-mix(in oklch, var(--ui-bg) 55%, transparent) 0%, transparent 100%)',
  'strong': 'radial-gradient(ellipse 85% 130% at 50% 50%, color-mix(in oklch, var(--ui-bg) 96%, transparent) 0%, color-mix(in oklch, var(--ui-bg) 96%, transparent) 55%, transparent 100%)'
};

export function splitHeaderRowClass(align: SplitHeaderAlign): string {
  return SPLIT_HEADER_ROW_CLASS[align];
}

export function scrimBackground(strength: ScrimStrength): string {
  return SCRIM_BACKGROUND_BY_STRENGTH[strength];
}
