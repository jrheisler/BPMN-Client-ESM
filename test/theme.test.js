import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyThemeToPage } from '../public/js/core/theme.js';

test('applyThemeToPage sets --bg-alt variable', () => {
  const style = {
    setProperty(key, value) {
      this[key] = value;
    }
  };
  const container = { style };
  const theme = { colors: { background: '#000000', foreground: '#ffffff' }, fonts: {} };
  applyThemeToPage(theme, container);
  assert.ok(style['--bg-alt'], 'bg-alt variable should be set');
});
