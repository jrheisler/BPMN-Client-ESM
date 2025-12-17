import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intervalStream, timeoutStream } from '../public/js/core/stream.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('intervalStream dispose stops future emissions', async () => {
  const { stream, dispose } = intervalStream(5, () => 'tick');
  const received = [];

  const subscription = stream.subscribe(value => received.push(value));

  await wait(20);
  dispose();
  const countAfterDispose = received.length;

  await wait(20);
  subscription.unsubscribe();

  assert.ok(countAfterDispose > 0, 'interval emitted at least once before disposal');
  assert.strictEqual(received.length, countAfterDispose);
});

test('timeoutStream dispose cancels scheduled emission', async () => {
  const { stream, dispose } = timeoutStream(10, 'done');
  const received = [];

  stream.subscribe(value => received.push(value));
  dispose();

  await wait(25);

  assert.deepStrictEqual(received, [undefined]);
});

