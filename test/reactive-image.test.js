import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  const code = fs.readFileSync(resolve(__dirname, '../public/js/components/elements.js'), 'utf8');
  vm.runInNewContext(code, sandbox);

  const stream = { subscribe(fn) { fn('image.png'); return () => {}; } };
  const themeStream = { subscribe(fn){ fn({ colors: {} }); return () => {}; }, get(){ return { colors: {} }; } };

  const img = sandbox.reactiveImage(stream, {}, themeStream);
  assert.ok(img);
  assert.strictEqual(img.tagName, 'img');
});
