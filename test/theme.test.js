import { test } from 'node:test';
import assert from 'node:assert/strict';

global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

test('applyThemeToPage sets --bg-alt variable', async () => {
  const { applyThemeToPage } = await import('../public/js/core/theme.js');
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
