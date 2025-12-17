export class Stream {
  static onError = null;
  static _nextId = 1;

  constructor(initial, options = {}) {
    this.subscribers = [];
    this.onError = options.onError ?? null;
    this.id = options.id ?? Stream._nextId++;
    this.name = options.name ?? options.streamName ?? null;

    if (
      typeof initial === 'object' &&
      initial !== null &&
      initial.json &&
      initial.key
    ) {
      this._json = initial.json;
      this._key = initial.key;
      this.value = initial.json[initial.key];
    } else {
      this.value = initial;
    }

    this.name ??= this._key ?? null;
  }

  _reportError(err, context) {
    const handler = this.onError ?? Stream.onError;
    const errorContext = {
      streamId: this.id,
      streamName: this.name,
      ...context
    };

    if (handler) {
      try {
        handler(err, errorContext);
        return;
      } catch (hookError) {
        console.error('Stream error handler threw an error', hookError);
      }
    }

    console.error('Stream error', { id: errorContext.streamId, name: errorContext.streamName }, err);
  }

  _safeInvoke(fn, value, phase, subscriberIndex) {
    try {
      fn(value);
    } catch (err) {
      this._reportError(err, { phase, subscriberIndex });
    }
  }

  subscribe(fn) {
    this.subscribers.push(fn);
    const subscriberIndex = this.subscribers.length - 1;
    this._safeInvoke(fn, this.value, 'subscribe_immediate', subscriberIndex);
    // 🔥 Return unsubscribe function
    let unsubscribed = false;
    const unsubscribe = () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.subscribers = this.subscribers.filter(sub => sub !== fn);
    };

    // Support both function-style and object-style subscription APIs
    unsubscribe.unsubscribe = unsubscribe;

    return unsubscribe;
  }

  set(val) {
    this.value = val;
    if (this._json && this._key) {
      this._json[this._key] = val;
    }
    for (let i = 0; i < this.subscribers.length; i++) {
      this._safeInvoke(this.subscribers[i], val, 'notify_set', i);
    }
  }

  get() {
    return this.value;
  }
}

// === Helper: derived stream ===
export function derived(streams, transformFn, options = {}) {
  const isArray = Array.isArray(streams);
  const sources = isArray ? streams : [streams];
  const getValues = () => isArray ? streams.map(s => s.get()) : [streams.get()];

  let lastValue = transformFn(...getValues());
  const derivedStream = new Stream(lastValue);

  let timeoutId = null;
  const debounce = options.debounce ?? 0;
  const distinct = options.distinct ?? true;
  const schedule = options.schedule ?? 'sync';

  const cleanupFns = [];

  let disposed = false;
  let microtaskQueued = false;
  let queuedValue = lastValue;
  let rafId = null;

  const applyValue = value => {
    lastValue = value;
    derivedStream.set(value);
  };

  const scheduleMicrotask = value => {
    queuedValue = value;
    if (microtaskQueued) return;
    microtaskQueued = true;
    const enqueue = typeof queueMicrotask === 'function'
      ? queueMicrotask
      : cb => Promise.resolve().then(cb);
    enqueue(() => {
      microtaskQueued = false;
      if (disposed) return;
      if (distinct && queuedValue === lastValue) return;
      applyValue(queuedValue);
    });
  };

  const scheduleRaf = value => {
    queuedValue = value;
    if (rafId !== null) return;
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : cb => setTimeout(cb, 16);
    rafId = raf(() => {
      rafId = null;
      if (disposed) return;
      if (distinct && queuedValue === lastValue) return;
      applyValue(queuedValue);
    });
  };

  const update = () => {
    const newValue = transformFn(...getValues());

    if (schedule === 'microtask') {
      if (!microtaskQueued && distinct && newValue === lastValue) return;
      scheduleMicrotask(newValue);
      return;
    }

    if (schedule === 'raf') {
      if (rafId === null && distinct && newValue === lastValue) return;
      scheduleRaf(newValue);
      return;
    }

    if (distinct && newValue === lastValue) return;
    applyValue(newValue);
  };

  const debouncedUpdate = debounce > 0
    ? () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(update, debounce);
      }
    : update;

  sources.forEach(source => {
    const unsubscribe = source.subscribe(debouncedUpdate);
    cleanupFns.push(unsubscribe);
  });

  // Attach cleanup method
  const teardown = () => {
    if (disposed) return;
    disposed = true;
    cleanupFns.forEach(fn => fn && fn());
    clearTimeout(timeoutId);
    if (rafId !== null) {
      (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout)(rafId);
      rafId = null;
    }
  };

  return withTeardown(derivedStream, teardown);
}




export function fieldStream(sourceStream, fieldName) {
  const derived = new Stream(sourceStream.get()?.[fieldName] ?? '');
  sourceStream.subscribe(value => {
    derived.set(value?.[fieldName] ?? '');
  });
  return derived;
}

// === Helper: interval stream ===
/**
 * Emits the result of `fn` every `ms` milliseconds.
 *
 * Usage:
 * const [tickStream, stop] = intervalStream(1000, () => Date.now());
 * const unsub = tickStream.subscribe(value => { // handle value });
 * // later: stop(); unsub();
 */
export function intervalStream(ms, fn) {
  const stream = new Stream();
  const id = setInterval(() => stream.set(fn()), ms);

  return withTeardown(stream, () => clearInterval(id));
}

// === Helper: timeout stream ===
/**
 * Emits `value` once after `ms` milliseconds.
 *
 * Usage:
 * const [doneStream, cancel] = timeoutStream(5000, 'done');
 * doneStream.subscribe(value => { // handle completion });
 * // later: cancel();
 */
export function timeoutStream(ms, value) {
  const stream = new Stream();
  const id = setTimeout(() => stream.set(value), ms);

  return withTeardown(stream, () => clearTimeout(id));
}

export function observeDOMRemoval(el, ...cleanups) {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      cleanups.forEach(fn => fn?.());
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  window.Stream = Stream;
}

function withTeardown(stream, disposeFn) {
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeFn?.();
  };

  stream.cleanup = dispose;
  stream.dispose = dispose;
  stream.teardown = dispose;

  return {
    stream,
    dispose,
    teardown: dispose,
    cleanup: dispose,
    [Symbol.iterator]: function* () {
      yield stream;
      yield dispose;
    }
  };
}

