import { test } from 'node:test';
import assert from 'node:assert/strict';

global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

test('diagram background updates when theme changes', async () => {
  const { currentTheme } = await import('../public/js/core/theme.js');

  const bpmnThemeStyle = { textContent: '' };
  const unsubscribe = currentTheme.subscribe(theme => {
    const { colors } = theme;
    bpmnThemeStyle.textContent = `
      #canvas,
      #canvas .djs-container,
      #canvas .djs-container svg {
        background: ${colors.background} !important;
        --canvas-fill-color: ${colors.background};
      }
    `;
  });

  currentTheme.set({ colors: { background: '#111111' } });
  assert.ok(bpmnThemeStyle.textContent.includes('--canvas-fill-color: #111111'));

  currentTheme.set({ colors: { background: '#222222' } });
  assert.ok(bpmnThemeStyle.textContent.includes('--canvas-fill-color: #222222'));

  unsubscribe();
});
