import { test } from 'node:test';
import assert from 'node:assert/strict';

function createMockDom() {
  const observers = [];

  class MockMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }

  const body = {
    children: new Set(),
    style: {},
    appendChild(el) {
      this.children.add(el);
      el.parentNode = this;
      return el;
    },
    removeChild(el) {
      this.children.delete(el);
      el.parentNode = null;
      return el;
    },
    contains(el) {
      return this.children.has(el);
    }
  };

  function createElement(tag) {
    const listeners = new Map();
    return {
      tagName: tag,
      style: {},
      children: [],
      textContent: '',
      parentNode: null,
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      },
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
      removeEventListener(type, handler) {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      },
      getListener(type) {
        return listeners.get(type);
      }
    };
  }

  const document = {
    body,
    createElement
  };

  return {
    document,
    MutationObserver: MockMutationObserver,
    flushMutations() {
      observers.slice().forEach(observer => observer.callback());
    }
  };
}

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

test('themedThemeSelector auto-disposes when removed from DOM', async t => {
  const originalGlobals = {
    document: global.document,
    MutationObserver: global.MutationObserver,
    localStorage: global.localStorage,
    fetch: global.fetch
  };

  const { document, MutationObserver, flushMutations } = createMockDom();
  global.document = document;
  global.MutationObserver = MutationObserver;
  global.localStorage = createLocalStorageMock();
  global.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve({ desertSunset: { colors: {}, fonts: {} } })
    });

  t.after(() => {
    global.document = originalGlobals.document;
    global.MutationObserver = originalGlobals.MutationObserver;
    global.localStorage = originalGlobals.localStorage;
    global.fetch = originalGlobals.fetch;
  });

  const { Stream } = await import('../public/js/core/stream.js');
  const { themedThemeSelector } = await import('../public/js/core/theme.js');

  const themeStream = new Stream({ colors: {}, fonts: {} });
  const initialSubscribers = themeStream.subscribers.length;

  const selector = themedThemeSelector(themeStream);
  assert.equal(themeStream.subscribers.length, initialSubscribers + 1);

  document.body.appendChild(selector);
  document.body.removeChild(selector);
  flushMutations();

  assert.equal(themeStream.subscribers.length, initialSubscribers);
});

test('themedThemeSelector autoDispose opt-out preserves subscription', async t => {
  const originalGlobals = {
    document: global.document,
    MutationObserver: global.MutationObserver,
    localStorage: global.localStorage,
    fetch: global.fetch
  };

  const { document, MutationObserver, flushMutations } = createMockDom();
  global.document = document;
  global.MutationObserver = MutationObserver;
  global.localStorage = createLocalStorageMock();
  global.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve({ desertSunset: { colors: {}, fonts: {} } })
    });

  t.after(() => {
    global.document = originalGlobals.document;
    global.MutationObserver = originalGlobals.MutationObserver;
    global.localStorage = originalGlobals.localStorage;
    global.fetch = originalGlobals.fetch;
  });

  const { Stream } = await import('../public/js/core/stream.js');
  const { themedThemeSelector } = await import('../public/js/core/theme.js');

  const themeStream = new Stream({ colors: {}, fonts: {} });
  const initialSubscribers = themeStream.subscribers.length;

  const selector = themedThemeSelector(themeStream, { autoDispose: false });
  assert.equal(themeStream.subscribers.length, initialSubscribers + 1);

  document.body.appendChild(selector);
  document.body.removeChild(selector);
  flushMutations();

  assert.equal(themeStream.subscribers.length, initialSubscribers + 1);
});
