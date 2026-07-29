import type { SupportedLangType } from '~/composables/types/supportedLang.ts';

export const resolveSupportedCodeLang = class SupportedCodeLangResolver {
  private static readonly contentLangToSupportedLang: Record<string, SupportedLangType.Type> = {
    'bash': 'bash',
    'css': 'css',
    'html': 'html',
    'javascript': 'javascript',
    'js': 'javascript',
    'json': 'json',
    'sh': 'bash',
    'ts': 'typescript',
    'typescript': 'typescript',
    'xml': 'xml'
  };

  public static resolve(language: string | undefined): SupportedLangType.Type {
    return SupportedCodeLangResolver.contentLangToSupportedLang[language ?? ''] ?? 'bash';
  }
};
