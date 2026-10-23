import { SupportedLangEntity } from '~/composables/entities/SupportedLangEntity.ts';

export const resolveSupportedCodeLang = class SupportedCodeLangResolver {
  private static readonly contentLangToSupportedLang: Record<string, SupportedLangEntity.Type> = {
    'bash': SupportedLangEntity.intake('bash'),
    'css': SupportedLangEntity.intake('css'),
    'html': SupportedLangEntity.intake('html'),
    'javascript': SupportedLangEntity.intake('javascript'),
    'js': SupportedLangEntity.intake('javascript'),
    'json': SupportedLangEntity.intake('json'),
    'sh': SupportedLangEntity.intake('bash'),
    'ts': SupportedLangEntity.intake('typescript'),
    'typescript': SupportedLangEntity.intake('typescript'),
    'xml': SupportedLangEntity.intake('xml')
  };

  public static resolve(language: string | undefined): SupportedLangEntity.Type {
    const result = SupportedCodeLangResolver.contentLangToSupportedLang[language ?? ''] ?? SupportedLangEntity.intake('bash');
    return result;
  }
};
