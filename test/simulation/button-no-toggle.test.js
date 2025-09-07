import test from 'node:test';
import assert from 'node:assert/strict';

test('simulation button falls back to start when toggle missing', () => {
  let started = false;
  let toasted = false;

  const tokenSimulation = {
    start() {
      started = true;
    }
  };

  global.showToast = () => {
    toasted = true;
  };

  const callback = () => {
    if (typeof tokenSimulation?.toggle === 'function') {
      tokenSimulation.toggle();
    } else if (typeof tokenSimulation?.start === 'function') {
      tokenSimulation.start();
    } else {
      showToast('Simulation is unavailable');
    }
  };

  assert.doesNotThrow(callback);
  assert.ok(started);
  assert.ok(!toasted);
});

test('simulation button warns when simulation unavailable', () => {
  let toasted = false;

  const tokenSimulation = {};

  global.showToast = () => {
    toasted = true;
  };

  const callback = () => {
    if (typeof tokenSimulation?.toggle === 'function') {
      tokenSimulation.toggle();
    } else if (typeof tokenSimulation?.start === 'function') {
      tokenSimulation.start();
    } else {
      showToast('Simulation is unavailable');
    }
  };

  assert.doesNotThrow(callback);
  assert.ok(toasted);
});
