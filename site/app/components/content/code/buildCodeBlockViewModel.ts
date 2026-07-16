export const CODE_BLOCK_COPY_RESET_DELAY_MS = 1500;

export type CodeBlockPreviewStateType = {
  expandedByDefault: boolean;
  isLong: boolean;
  totalLines: number;
};

export function buildCodeBlockPreviewState(code: string, previewLines: number | undefined): CodeBlockPreviewStateType {
  const totalLines = code ? code.split('\n').length : 0;
  const isLong = previewLines !== undefined && totalLines > previewLines;
  return {
    expandedByDefault: !isLong,
    isLong,
    totalLines
  };
}
