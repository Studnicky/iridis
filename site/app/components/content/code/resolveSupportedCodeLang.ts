import type { SupportedLangType } from '~/composables/types/supportedLang.ts';

const CONTENT_LANG_TO_SUPPORTED_LANG: Record<string, SupportedLangType> = {
  bash: 'bash',
  css: 'css',
  html: 'html',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  sh: 'bash',
  ts: 'typescript',
  typescript: 'typescript',
  xml: 'xml'
};

export function resolveSupportedCodeLang(language: string | undefined): SupportedLangType {
  return CONTENT_LANG_TO_SUPPORTED_LANG[language ?? ''] ?? 'bash';
}
