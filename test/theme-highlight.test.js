import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// ensure theme.js doesn't attempt network fetch
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

test('applyThemeToPage sets highlight variables', async () => {
  const body = {
    style: {
      setProperty(key, value) {
        this[key] = value;
      },
      getPropertyValue(key) {
        return this[key];
      }
    }
  };
  const theme = {
    colors: {
      panel: '#1e1e1e',
      text: '#f0f0f0',
      border: '#666666',
      accent: '#ff9800',
      ok: '#52b415'
    },
    fonts: {}
  };
  const { applyThemeToPage } = await import('../public/js/core/theme.js');
  applyThemeToPage(theme, body);
  assert.equal(body.style['--panel'], '#1e1e1e');
  assert.equal(body.style['--text'], '#f0f0f0');
  assert.equal(body.style['--border'], '#666666');
  assert.equal(body.style['--accent'], '#ff9800');
  assert.equal(body.style['--ok'], '#52b415');
});

test('app.css uses CSS variables for overlays', async () => {
  const css = await fs.readFile(new URL('../public/css/app.css', import.meta.url), 'utf8');
  assert.ok(/\.djs-direct-editing-parent,\s*\.djs-direct-editing-content\s*\{[^}]*background:\s*var\(--panel\);[^}]*color:\s*var\(--text\);[^}]*border:\s*1px solid var\(--border\);[^}]*outline:\s*1px solid var\(--border\);[^}]*\}/s.test(css));
  assert.ok(/\.djs-element\.bpmn-addOn-highlight .djs-visual > :nth-child\(1\)\s*\{[^}]*stroke:\s*var\(--accent\);[^}]*fill:\s*var\(--accent\);[^}]*filter:\s*drop-shadow\(0 0 6px var\(--accent\)\)/s.test(css));
  assert.ok(/\.djs-element\.drop-ok .djs-visual > :nth-child\(1\)\s*\{[^}]*stroke:\s*var\(--ok\);[^}]*fill:\s*var\(--ok\);[^}]*filter:\s*drop-shadow\(0 0 6px var\(--ok\)\)/s.test(css));
  assert.ok(/\.djs-connection\.bpmn-addOn-highlight .djs-visual > :nth-child\(1\)\s*\{[^}]*stroke:\s*var\(--accent\)/s.test(css));
});
