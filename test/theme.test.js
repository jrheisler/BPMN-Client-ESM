import { test } from 'node:test';
import assert from 'node:assert/strict';

test('applyThemeToPage sets CSS variables and font on container', async () => {
  const { applyThemeToPage, THEMES } = await import('../public/js/core/theme.js');
  const recorded = {};
  const style = {
    setProperty(key, value) {
      recorded[key] = value;
    }
  };
  const container = { style };

  applyThemeToPage(THEMES.dark, container);

  assert.equal(recorded['--bg'], THEMES.dark.colors.background);
  assert.equal(recorded['--bg-alt'], THEMES.dark.colors.panel2);
  assert.equal(container.style.fontFamily, THEMES.dark.fonts.base);
});
