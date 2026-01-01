import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('applyBpmnTheme injects label font and fill rules', async () => {
  const appJs = await fs.readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');

  assert.ok(
    /fill:\s*\$\{labelFill\}\s*!important;/.test(appJs),
    'label rule should use labelFill placeholder'
  );
  assert.ok(
    /font-family:\s*\$\{labelFontFamily\};/.test(appJs),
    'label font family should flow from theme'
  );
  assert.ok(
    /font-weight:\s*400\s*!important;/.test(appJs),
    'label font weight should be explicitly set'
  );
});
