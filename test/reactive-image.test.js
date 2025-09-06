const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('reactiveImage returns an img element', () => {
  const sandbox = {
    document: {
      createElement(tag) {
        return { tagName: tag, style: {} };
      }
    },
    observeDOMRemoval: () => {},
    applyTheme: () => {},
    window: { addEventListener() {}, innerWidth: 1024 },
  };

  const code = fs.readFileSync(path.resolve(__dirname, '../public/js/components/elements.js'), 'utf8');
  vm.runInNewContext(code, sandbox);

  const stream = { subscribe(fn) { fn('image.png'); return () => {}; } };
  const themeStream = { subscribe(fn){ fn({ colors: {} }); return () => {}; }, get(){ return { colors: {} }; } };

  const img = sandbox.reactiveImage(stream, {}, themeStream);
  assert.ok(img);
  assert.strictEqual(img.tagName, 'img');
});
