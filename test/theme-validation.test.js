import { test } from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    clear() {
      store.clear();
    }
  };
}

function createMockDocument() {
  const style = { setProperty() {} };
  const body = { style };
  return {
    body,
    getElementById() { return null; }
  };
}

test('falls back to default theme when stored key is missing', async t => {
  const originalGlobals = {
    document: global.document,
    localStorage: global.localStorage,
    matchMedia: global.matchMedia
  };

  const localStorage = createLocalStorageMock();
  localStorage.setItem('theme.v2', 'missing-theme');

  global.document = createMockDocument();
  global.localStorage = localStorage;
  global.matchMedia = () => ({ matches: false });

  t.after(() => {
    global.document = originalGlobals.document;
    global.localStorage = originalGlobals.localStorage;
    global.matchMedia = originalGlobals.matchMedia;
  });

  const { currentTheme } = await import(`../public/js/core/theme.js?test=${Math.random()}`);

  assert.equal(currentTheme.get().name, 'Light');
  assert.equal(localStorage.getItem('theme.v2'), 'light');
});

test('setTheme updates the stream and persists selection', async t => {
  const originalGlobals = {
    document: global.document,
    localStorage: global.localStorage,
    matchMedia: global.matchMedia
  };

  const localStorage = createLocalStorageMock();
  global.document = createMockDocument();
  global.localStorage = localStorage;
  global.matchMedia = () => ({ matches: false });

  t.after(() => {
    global.document = originalGlobals.document;
    global.localStorage = originalGlobals.localStorage;
    global.matchMedia = originalGlobals.matchMedia;
  });

  const { setTheme, currentTheme } = await import(`../public/js/core/theme.js?test=${Math.random()}`);

  setTheme('dark');
  assert.equal(currentTheme.get().name, 'Dark');
  assert.equal(localStorage.getItem('theme.v2'), 'dark');
});
