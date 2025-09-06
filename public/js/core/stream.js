class Stream {
  constructor(initial) {
    this.subscribers = [];

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
  }

  subscribe(fn) {
    this.subscribers.push(fn);
    fn(this.value);
    // 🔥 Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== fn);
    };
  }

  set(val) {
    this.value = val;
    if (this._json && this._key) {
      this._json[this._key] = val;
    }
    this.subscribers.forEach(fn => fn(val));
  }

  get() {
    return this.value;
  }
}

// === Helper: derived stream ===
function derived(streams, transformFn, options = {}) {
  const isArray = Array.isArray(streams);
  const sources = isArray ? streams : [streams];
  const getValues = () => isArray ? streams.map(s => s.get()) : [streams.get()];

  let lastValue = transformFn(...getValues());
  const derivedStream = new Stream(lastValue);

  let timeoutId = null;
  const debounce = options.debounce ?? 0;
  const distinct = options.distinct ?? true;

  const cleanupFns = [];

  const update = () => {
    const newValue = transformFn(...getValues());
    if (distinct && newValue === lastValue) return;
    lastValue = newValue;
    derivedStream.set(newValue);
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
  derivedStream.cleanup = () => {
    cleanupFns.forEach(fn => fn && fn());
    clearTimeout(timeoutId);
  };

  return derivedStream;
}




function fieldStream(sourceStream, fieldName) {
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
function intervalStream(ms, fn) {
  const stream = new Stream();
  const id = setInterval(() => stream.set(fn()), ms);
  const cleanup = () => clearInterval(id);
  return [stream, cleanup];
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
function timeoutStream(ms, value) {
  const stream = new Stream();
  const id = setTimeout(() => stream.set(value), ms);
  const cleanup = () => clearTimeout(id);
  return [stream, cleanup];
}

function observeDOMRemoval(el, ...cleanups) {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      cleanups.forEach(fn => fn?.());
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

