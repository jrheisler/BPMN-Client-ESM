import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// ensure no network fetch attempts from theme.js
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

test('dark theme uses updated connection colors', async () => {
  const themes = JSON.parse(
    await fs.readFile(new URL('../public/js/core/themes.json', import.meta.url), 'utf8')
  );
  const dark = themes.dark;
  assert.equal(dark.bpmn.connection.stroke, '#d1b6ff');
  assert.equal(dark.bpmn.marker.fill, '#d1b6ff');
  assert.equal(dark.bpmn.marker.stroke, '#d1b6ff');
});
