import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemeEntry } from '../public/js/core/theme.js';

test('normalizeThemeEntry backfills foreground from text', () => {
  const diag = { errors: [], warnings: [], byTheme: {} };
  const theme = {
    colors: { background: '#ffffff', text: '#123456' },
    fonts: {}
  };

  const normalized = normalizeThemeEntry('demo', theme, diag);

  assert.equal(normalized.colors.foreground, '#123456');
  assert.equal(normalized.foreground, '#123456');
});

test('normalizeThemeEntry uses token text when foreground missing', () => {
  const diag = { errors: [], warnings: [], byTheme: {} };
  const theme = {
    colors: { background: '#ffffff' },
    fonts: {}
  };

  const normalized = normalizeThemeEntry('demo2', theme, diag);

  assert.ok(normalized.colors.foreground, 'foreground should be populated');
  assert.equal(normalized.foreground, normalized.colors.foreground);
});
