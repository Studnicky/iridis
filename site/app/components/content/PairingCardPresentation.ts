export class PairingCardPresentation {
  public static readonly compact = new PairingCardPresentation(
    'rounded-md',
    'p-2',
    'truncate text-xs font-semibold',
    'hidden',
    'hidden',
    'flex items-center justify-center border-t border-default bg-elevated px-1 py-1'
  );

  public static readonly expanded = new PairingCardPresentation(
    '',
    'space-y-1 p-4',
    'text-base font-semibold',
    'text-sm',
    'flex flex-wrap items-center justify-between gap-1.5 border-t border-default bg-elevated px-3 py-2 text-xs',
    'hidden'
  );

  public constructor(
    public readonly rootClass: string,
    public readonly sampleClass: string,
    public readonly titleClass: string,
    public readonly detailClass: string,
    public readonly metadataClass: string,
    public readonly compactBadgeClass: string
  ) {}
}
