import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stream } from '../public/js/core/stream.js';

test('unsubscribe removes callback and stops future notifications', () => {
  const stream = new Stream(0);
  const received = [];

  const subscription = stream.subscribe(value => {
    received.push(value);
  });

  assert.strictEqual(typeof subscription.unsubscribe, 'function');

  stream.set(1);
  subscription.unsubscribe();
  stream.set(2);

  assert.deepStrictEqual(received, [0, 1]);
});

test('calling unsubscribe multiple times is safe', () => {
  const stream = new Stream();
  const subscription = stream.subscribe(() => {});

  assert.doesNotThrow(() => {
    subscription.unsubscribe();
    subscription.unsubscribe();
  });
});
