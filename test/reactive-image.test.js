import { test } from 'node:test';
import assert from 'node:assert/strict';
test('reactiveImage returns an img element', async () => {
  global.document = {
    createElement(tag) {
      return { tagName: tag, style: {} };
    },
    body: { style: {} }
  };
  global.observeDOMRemoval = () => {};
  global.applyTheme = () => {};
  global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
  global.MutationObserver = class { constructor(){} observe(){} disconnect(){} };

  const stream = { subscribe(fn) { fn('image.png'); return () => {}; }, get() { return 'image.png'; } };
  const themeStream = { subscribe(fn){ fn({ colors: {} }); return () => {}; }, get(){ return { colors: {} }; } };

  const { reactiveImage } = await import('../public/js/components/index.js');
  const img = reactiveImage(stream, {}, themeStream);
  assert.ok(img);
  assert.strictEqual(img.tagName, 'img');
});
