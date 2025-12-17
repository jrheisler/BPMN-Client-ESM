import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stream, derived } from '../public/js/core/stream.js';

test('derived stream stops receiving upstream updates after teardown', () => {
  const source = new Stream(0);
  const [derivedStream, teardown] = derived(source, value => value * 2);
  const received = [];

  derivedStream.subscribe(value => received.push(value));

  source.set(1);
  teardown();
  source.set(2);

  assert.deepStrictEqual(received, [0, 2]);
});

test('derived teardown clears pending debounce timers and is idempotent', async () => {
  const source = new Stream(0);
  const [derivedStream, teardown] = derived(source, value => value + 1, { debounce: 20 });
  const received = [];

  derivedStream.subscribe(value => received.push(value));

  source.set(1); // schedule debounced update
  teardown();
  derivedStream.dispose(); // second call should be safe

  await new Promise(resolve => setTimeout(resolve, 40));

  assert.deepStrictEqual(received, [1]);
});
