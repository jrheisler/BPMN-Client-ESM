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
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function createMockDocument() {
  const style = {
    setProperty() {}
  };
  const body = { style };
  return {
    body,
    createElement() {
      return { style: {} };
    }
  };
}

test('invalid stored theme key resets to fallback theme', async t => {
  const originalGlobals = {
    document: global.document,
    localStorage: global.localStorage,
    fetch: global.fetch
  };

  const localStorage = createLocalStorageMock();
  localStorage.setItem('theme', JSON.stringify({ key: 'missing-theme', schemaVersion: 1 }));

  global.document = createMockDocument();
  global.localStorage = localStorage;
  global.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve({ desertSunset: { colors: {}, fonts: {} } })
    });

  t.after(() => {
    global.document = originalGlobals.document;
    global.localStorage = originalGlobals.localStorage;
    global.fetch = originalGlobals.fetch;
  });

  const { themesLoaded, currentTheme } = await import(
    `../public/js/core/theme.js?test=${Math.random()}`
  );
  await themesLoaded;

  const stored = localStorage.getItem('theme');
  const parsed = JSON.parse(stored);

  assert.equal(parsed.key, 'dark');
  assert.equal(currentTheme.get().name, 'Default Dark');
});


test('malformed themes.json triggers error and default fallback', async t => {
  const originalGlobals = {
    document: global.document,
    localStorage: global.localStorage,
    fetch: global.fetch
  };

  global.document = createMockDocument();
  global.localStorage = createLocalStorageMock();
  global.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve({ badTheme: 'not-an-object' })
    });

  t.after(() => {
    global.document = originalGlobals.document;
    global.localStorage = originalGlobals.localStorage;
    global.fetch = originalGlobals.fetch;
  });

  const { themesLoaded, themeLoadStatus, currentTheme } = await import(
    `../public/js/core/theme.js?test=${Math.random()}`
  );
  await themesLoaded;

  assert.equal(themeLoadStatus.get(), 'error');
  assert.equal(currentTheme.get().name, 'Default Dark');
});
