import { SupportedLangInterfaceTypeEntity } from '~/composables/entities/SupportedLangInterfaceTypeEntity.ts';

export const resolveSupportedCodeLang = class SupportedCodeLangResolver {
  private static readonly contentLangToSupportedLang: Record<string, SupportedLangInterfaceTypeEntity.Type> = {
    'bash': SupportedLangInterfaceTypeEntity.intake('bash'),
    'css': SupportedLangInterfaceTypeEntity.intake('css'),
    'html': SupportedLangInterfaceTypeEntity.intake('html'),
    'javascript': SupportedLangInterfaceTypeEntity.intake('javascript'),
    'js': SupportedLangInterfaceTypeEntity.intake('javascript'),
    'json': SupportedLangInterfaceTypeEntity.intake('json'),
    'sh': SupportedLangInterfaceTypeEntity.intake('bash'),
    'ts': SupportedLangInterfaceTypeEntity.intake('typescript'),
    'typescript': SupportedLangInterfaceTypeEntity.intake('typescript'),
    'xml': SupportedLangInterfaceTypeEntity.intake('xml')
  };

  public static resolve(language: string | undefined): SupportedLangInterfaceTypeEntity.Type {
    const result = SupportedCodeLangResolver.contentLangToSupportedLang[language ?? ''] ?? SupportedLangInterfaceTypeEntity.intake('bash');
    return result;
  }
};
