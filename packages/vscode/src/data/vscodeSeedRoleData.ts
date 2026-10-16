export const vscodeSeedRoleData = {
  'roleTiers': [
    { 'roleNames': ['background', 'foreground', 'keyword', 'error'], 'tier': 4 },
    { 'roleNames': ['background', 'foreground', 'keyword', 'error', 'type', 'function', 'number', 'constant'], 'tier': 8 },
    { 'roleNames': [
      'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
      'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success'
    ], 'tier': 16 },
    { 'roleNames': [
      'background', 'foreground', 'surface', 'muted', 'keyword', 'type', 'function', 'variable',
      'string', 'number', 'constant', 'comment', 'error', 'warning', 'info', 'success',
      'accent', 'onAccent', 'accentHover', 'link', 'selection', 'selectionList', 'buttonSecondary',
      'findMatch', 'bracketMatch', 'hover', 'border', 'guide', 'guideActive', 'chrome', 'chromeInactive',
      'chromeForeground', 'inputBackground', 'ansiBlack', 'ansiRed', 'ansiGreen', 'ansiYellow', 'ansiBlue',
      'ansiMagenta', 'ansiCyan', 'ansiWhite', 'ansiBrightBlack', 'ansiBrightRed', 'ansiBrightGreen',
      'ansiBrightYellow', 'ansiBrightBlue', 'ansiBrightMagenta', 'ansiBrightCyan', 'ansiBrightWhite',
      'gitAdded', 'gitModified', 'gitDeleted', 'gitUntracked', 'gitConflicting', 'diffInserted', 'diffRemoved',
      'bracketLevel1', 'bracketLevel2', 'bracketLevel3', 'bracketLevel4', 'bracketLevel5', 'bracketLevel6',
      'widgetBackground', 'widgetBorder'
    ], 'tier': 64 }
  ]
} as const;
