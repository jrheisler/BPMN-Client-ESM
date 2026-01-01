import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// ensure theme.js doesn't attempt network fetch
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

test('injected BPMN label styles use theme text color', async () => {
  const appJs = await fs.readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');

  assert.ok(
    appJs.includes("const resolvedLabelFill = label.fill ?? 'var(--text)';"),
    'label fill should default to var(--text)'
  );
  assert.ok(
    /font-weight:\s*400\s*!important;/.test(appJs),
    'label font weight should be explicitly set to 400'
  );
  assert.ok(
    /fill:\s*\$\{resolvedLabelFill\}\s*!important;/.test(appJs),
    'label rule should use resolvedLabelFill'
  );
});
