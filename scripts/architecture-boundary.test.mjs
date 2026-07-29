import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { ESLint } from 'eslint';

const cliSourceUrl = new URL('../packages/cli/src/PluginResolver.ts', import.meta.url);
const cliSourcePath = fileURLToPath(cliSourceUrl);
const multiOutputTestUrl = new URL('../site/test/multiOutput.test.ts', import.meta.url);
const multiOutputTestPath = fileURLToPath(multiOutputTestUrl);

const architectureViolations = (result) => {
  return result.messages.filter(({ ruleId }) => {
    return ruleId === '@studnicky/layer-import-boundary';
  });
};

test('site imports outside package layers do not register invalid boundary listeners', async () => {
  const eslint = new ESLint({ 'cwd': fileURLToPath(new URL('..', import.meta.url)) });
  const [result] = await eslint.lintFiles([multiOutputTestPath]);
  assert.equal(result.fatalErrorCount, 0);
  assert.deepEqual(architectureViolations(result), []);
});

test('static and dynamic imports produce one boundary result each', async () => {
  const eslint = new ESLint({ 'cwd': fileURLToPath(new URL('..', import.meta.url)) });
  const cases = [
    { 'expected': 0, 'source': "import '@studnicky/iridis-capacitor';\n" },
    { 'expected': 1, 'source': "import '@studnicky/iridis-anima';\n" },
    { 'expected': 0, 'source': "await import('@studnicky/iridis-capacitor');\n" },
    { 'expected': 1, 'source': "await import('@studnicky/iridis-anima');\n" }
  ];
  for (const fixture of cases) {
    const [result] = await eslint.lintText(fixture.source, { 'filePath': cliSourcePath });
    const violations = architectureViolations(result);
    assert.equal(violations.length, fixture.expected, fixture.source.trim());
    if (fixture.expected === 1) {
      assert.match(violations[0].message, /Layer 'cli' may not import from layer 'anima'/u);
    }
  }
});
