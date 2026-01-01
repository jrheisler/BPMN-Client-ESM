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

test('themedThemeSelector auto-disposes when removed from DOM', async t => {
  const originalGlobals = {
    document: global.document,
    MutationObserver: global.MutationObserver
  };

  const { document, MutationObserver, flushMutations } = createMockDom();
  global.document = document;
  global.MutationObserver = MutationObserver;

  t.after(() => {
    global.document = originalGlobals.document;
    global.MutationObserver = originalGlobals.MutationObserver;
  });

  const { Stream } = await import('../public/js/core/stream.js');
  const { themedThemeSelector } = await import('../public/js/core/theme.js');

  const themeStream = new Stream({ colors: { text: '#000', border: '#000', panel: '#fff' }, fonts: { base: 'sans-serif' } });
  const initialSubscribers = themeStream.subscribers.length;

  const selector = themedThemeSelector(themeStream);
  assert.equal(themeStream.subscribers.length, initialSubscribers + 1);

  document.body.appendChild(selector);
  document.body.removeChild(selector);
  flushMutations();

  assert.equal(themeStream.subscribers.length, initialSubscribers);
});

test('themedThemeSelector updates theme stream when selection changes', async t => {
  const originalGlobals = {
    document: global.document,
    MutationObserver: global.MutationObserver
  };

  const { document, MutationObserver } = createMockDom();
  global.document = document;
  global.MutationObserver = MutationObserver;

  t.after(() => {
    global.document = originalGlobals.document;
    global.MutationObserver = originalGlobals.MutationObserver;
  });

  const { Stream } = await import('../public/js/core/stream.js');
  const { themedThemeSelector, THEMES } = await import('../public/js/core/theme.js');

  const themeStream = new Stream(THEMES.light);
  const selector = themedThemeSelector(themeStream, { autoDispose: false });
  document.body.appendChild(selector);

  const selectEl = selector.children.find(child => child.tagName === 'select');
  selectEl.value = 'dark';
  const changeHandler = selectEl.getListener('change');
  changeHandler();

  assert.equal(themeStream.get().name, 'Dark');
});
