import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../public/js/core/theme.js';

test('light theme foreground matches text color', () => {
  assert.equal(THEMES.light.colors.foreground, THEMES.light.colors.text);
});

test('dark theme foreground matches text color', () => {
  assert.equal(THEMES.dark.colors.foreground, THEMES.dark.colors.text);
});
