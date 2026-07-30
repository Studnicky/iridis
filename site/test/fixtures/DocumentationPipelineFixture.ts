export class DocumentationPipelineFixture {
  static readonly DOCUMENTS = [
    '../../packages/capacitor/README.md',
    '../../packages/cli/README.md',
    '../../packages/contrast/README.md',
    '../../packages/rdf/README.md',
    '../../packages/stylesheet/README.md',
    '../../packages/tailwind/README.md',
    '../../packages/vscode/README.md',
    '../content/04-engine-api.md',
    '../content/07-cli-usage.md',
    '../content/08-vscode-theme-recipe.md'
  ] as const;

  static readonly FENCED_CODE_PATTERN = /^```(ts|json)\n([\s\S]*?)^```$/gmu;
}
