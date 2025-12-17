# Streams

This project uses a lightweight `Stream` primitive for reactive updates.

## Subscribing

```js
const counter = new Stream(0, { name: 'counter' });
const subscription = counter.subscribe(value => console.log(value));
```

Subscriptions now return a standardized teardown object: call `subscription()`,
`subscription.dispose()`, or `subscription.teardown()` to stop receiving
updates. Multiple calls are safe and idempotent.

## Error isolation

Subscriber callbacks and derived transform functions are wrapped in `try/catch`.
Thrown errors are reported to `Stream.onError` (or the instance `onError` hook)
with stream id/name metadata, and other subscribers continue to run. If no hook
is set, the error and stream metadata are logged to the console.

## Derived streams

Use `derived` to combine streams. Microtask scheduling batches synchronous
updates into a single notification per tick, which helps hot paths avoid
superfluous renders.

```js
const doubled = derived(counter, value => value * 2, { schedule: 'microtask' });
const [stream, teardown] = doubled; // iterable: [stream, dispose]
```

Call `teardown()` to unsubscribe from upstream streams and clear pending timers
or animation frames.
