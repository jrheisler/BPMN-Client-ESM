import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stream, derived } from '../public/js/core/stream.js';

test('microtask scheduling coalesces multiple upstream updates in the same tick', async () => {
  const source = new Stream(0);
  const [derivedStream] = derived(source, value => value * 2, { schedule: 'microtask' });
  const received = [];

  derivedStream.subscribe(value => received.push(value));

  source.set(1);
  source.set(2);
  source.set(3);

  await Promise.resolve();

  assert.deepStrictEqual(received, [0, 6]);
});

test('sync scheduling preserves immediate emissions for each upstream update', () => {
  const source = new Stream(0);
  const [derivedStream] = derived(source, value => value * 2, { schedule: 'sync' });
  const received = [];

  derivedStream.subscribe(value => received.push(value));

  source.set(1);
  source.set(2);
  source.set(3);

  assert.deepStrictEqual(received, [0, 2, 4, 6]);
});
