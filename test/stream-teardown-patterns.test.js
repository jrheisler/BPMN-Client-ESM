import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stream, derived } from '../public/js/core/stream.js';

function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve());
}

test('subscription teardown object is idempotent and aliased', () => {
  const stream = new Stream(0);
  const unsub = stream.subscribe(() => {});

  assert.equal(typeof unsub.dispose, 'function');
  assert.equal(typeof unsub.teardown, 'function');
  assert.equal(typeof unsub.cleanup, 'function');

  unsub();
  unsub.dispose();
  unsub.teardown();

  assert.equal(stream.subscribers.length, 0);
});

test('derived microtask teardown prevents queued notifications', async () => {
  const source = new Stream(0);
  const [derivedStream, teardown] = derived(source, value => value + 1, {
    schedule: 'microtask'
  });
  const received = [];

  derivedStream.subscribe(value => received.push(value));

  source.set(1);
  teardown();

  await flushMicrotasks();

  assert.deepStrictEqual(received, [1]);
});

test('transform errors on derived streams are isolated', async () => {
  const errors = [];
  const originalOnError = Stream.onError;
  Stream.onError = (err, ctx) => errors.push({ err, ctx });

  try {
    const source = new Stream(1);
    const [derivedStream] = derived(
      source,
      value => {
        if (value === 2) {
          throw new Error('boom');
        }
        return value * 2;
      },
      { schedule: 'microtask', name: 'transformer' }
    );

    const received = [];
    derivedStream.subscribe(v => received.push(v));

    source.set(2);
    source.set(3);

    await flushMicrotasks();

    assert.deepStrictEqual(received, [2, 6]);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].err.message, 'boom');
    assert.equal(errors[0].ctx.phase, 'transform_update');
    assert.equal(errors[0].ctx.streamName, 'transformer');
  } finally {
    Stream.onError = originalOnError;
  }
});
