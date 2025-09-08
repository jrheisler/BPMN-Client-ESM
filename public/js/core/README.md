# Simulation Core

`createSimulation` exposes an `elementHandlers` map that allows reacting to tokens entering BPMN elements.

## Default handlers

The simulation registers basic handlers for:

- `bpmn:UserTask` – pauses the simulation until resumed manually.
- `bpmn:TimerEvent` – pauses the simulation until resumed manually.

All timeouts and listeners registered by handlers are cleared whenever `start` or `reset` is called.

## Registering custom handlers

```js
const sim = createSimulation({ elementRegistry, canvas });

sim.elementHandlers.set('bpmn:UserTask', (token, api) => {
  api.pause();
  // perform asynchronous work or wait for user input
  api.addCleanup(() => {/* cleanup */}); // optional
  api.resume();
  return [token]; // keep or modify tokens
});
```

Handlers receive the current token and an API with `pause`, `resume`, and `addCleanup` helpers. Returning an array of tokens overrides the default movement; omit a return value to continue with the built-in behavior.

## Simulation context

Conditions on sequence flows are evaluated against a shared mutable context object. Pass initial values when creating the simulation and update them later as required:

```js
const sim = createSimulation({
  elementRegistry,
  canvas,
  context: { approved: true }
});

// update values at runtime
sim.setContext({ approved: false });

// read current shared context if needed
const ctx = sim.getContext();
```

## Condition fallback

During condition evaluation, missing variables from the shared context are replaced with a fallback value. The fallback is
controlled via the `conditionFallback` option of `createSimulation` and defaults to `undefined`.

* `undefined` – the simulation pauses at the gateway and waits for a manual decision.
* any other value – unknown variables are treated as that value, potentially auto-selecting a path.

Explicitly set `conditionFallback` to `undefined` when user input should be requested for unknown variables:

```js
const sim = createSimulation({
  elementRegistry,
  canvas,
  context: {},
  conditionFallback: undefined
});

sim.pathsStream.subscribe(({ flows }) => {
  const options = flows.map((f, i) => `${i + 1}. ${f.flow.id}`).join('\n');
  const choice = window.prompt('Choose outgoing flow:\n' + options);
  if (choice) {
    const index = Number(choice) - 1;
    sim.step(flows[index].flow.id);
  }
});
```

When an exclusive gateway encounters a condition such as `${approved}` without `approved` in the context, the user is prompted:

```
Choose outgoing flow:
1. f1
2. f2
```
