import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stream } from '../public/js/core/stream.js';

test('Stream isolates subscriber errors and reports them', () => {
  const originalOnError = Stream.onError;
  const errors = [];
  Stream.onError = (err, context) => {
    errors.push({ err, context });
  };

  try {
    const stream = new Stream(0, { name: 'test-stream' });
    const received = [];

    stream.subscribe(value => {
      received.push(`first:${value}`);
    });

    stream.subscribe(() => {
      throw new Error('kaboom');
    });

    stream.subscribe(value => {
      received.push(`third:${value}`);
    });

    stream.set(1);

    assert.deepStrictEqual(received, ['first:0', 'third:0', 'first:1', 'third:1']);
    assert.strictEqual(errors.length, 2);
    assert.strictEqual(errors[0].err.message, 'kaboom');
    assert.strictEqual(errors[0].context.phase, 'subscribe_immediate');
    assert.strictEqual(errors[0].context.streamName, 'test-stream');
    assert.strictEqual(errors[0].context.subscriberIndex, 1);
    assert.strictEqual(errors[1].context.phase, 'notify_set');
    assert.strictEqual(errors[1].context.subscriberIndex, 1);
  } finally {
    Stream.onError = originalOnError;
  }
});
