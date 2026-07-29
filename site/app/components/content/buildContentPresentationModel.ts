export const buildContentPresentationModel = class ContentPresentationModel {
  public static readonly scrimBackgroundByStrength = {
    'medium': 'radial-gradient(ellipse 70% 80% at 50% 50%, color-mix(in oklch, var(--ui-bg) 55%, transparent) 0%, transparent 100%)',
    'soft': 'radial-gradient(ellipse 85% 130% at 50% 50%, color-mix(in oklch, var(--ui-bg) 80%, transparent) 0%, color-mix(in oklch, var(--ui-bg) 80%, transparent) 55%, transparent 100%)',
    'strong': 'radial-gradient(ellipse 85% 130% at 50% 50%, color-mix(in oklch, var(--ui-bg) 96%, transparent) 0%, color-mix(in oklch, var(--ui-bg) 96%, transparent) 55%, transparent 100%)'
  } as const;

  public static splitHeaderRowClass(align: 'center' | 'start'): string {
    if (align === 'center') {
      return 'flex flex-wrap items-center justify-between gap-3';
    }
    return 'flex flex-wrap items-start justify-between gap-3';
  }
};
