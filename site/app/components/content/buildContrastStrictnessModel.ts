export type ContrastStrictnessOption = {
  readonly value: number;
  readonly label: 'AA' | 'AAA' | 'APCA';
  readonly active: boolean;
};

export type ContrastStrictnessModel = {
  readonly body: string;
  readonly options: readonly ContrastStrictnessOption[];
};

const CONTRAST_STRICTNESS_OPTIONS = [
  { value: 0, label: 'AA' },
  { value: 1, label: 'AAA' },
  { value: 2, label: 'APCA' }
] as const;

export function buildContrastStrictnessModel(strictness: number): ContrastStrictnessModel {
  return {
    'body': strictness === 0
      ? 'AA is the WCAG 2.1 minimum: 4.5:1 (3:1 for large text).'
      : strictness === 1
        ? 'AAA is the enhanced WCAG 2.1 level: 7:1 (4.5:1 for large text).'
        : 'APCA is the modern perceptual contrast algorithm (target Lc).',
    'options': CONTRAST_STRICTNESS_OPTIONS.map((option) => ({
      ...option,
      'active': option.value === strictness
    }))
  };
}
