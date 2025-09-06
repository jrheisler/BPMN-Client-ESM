# Simulation Core

`createSimulation` exposes an `elementHandlers` map that allows reacting to tokens entering BPMN elements.

## Default handlers

The simulation registers basic handlers for:

- `bpmn:UserTask` – pauses the simulation briefly before continuing.
- `bpmn:TimerEvent` – waits for a short delay, then resumes automatically.

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

Conditions on sequence flows are evaluated against a mutable context object. Pass initial values when creating the simulation and update them later as required:

```js
const sim = createSimulation({
  elementRegistry,
  canvas,
  context: { approved: true }
});

// update values at runtime
sim.setContext({ approved: false });

// read current context if needed
const ctx = sim.getContext();
```

If a condition references a variable that is not present in the context, it resolves to `false` by default. You can override this behaviour by passing `{ conditionFallback: true }` as an option.
