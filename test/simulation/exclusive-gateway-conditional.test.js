import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSimulationInstance } from '../helpers/simulation.js';
import {
  buildAllFalseExclusiveGatewayDiagram,
  buildContextChoiceExclusiveGatewayDiagram,
  buildSingleViableExclusiveGatewayDiagram
} from '../helpers/exclusive-gateway.js';

test('exclusive gateway waits for context variable choice', () => {
  const diagram = buildContextChoiceExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fExisting', 'fNew']);
  // token remains at gateway awaiting user input
  assert.deepStrictEqual(Array.from(sim.tokenStream.get(), t => t.element.id), ['gw']);

  sim.setContext({ existingCustomer: true });
  sim.step('fExisting');
  let after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['existing']);
  assert.strictEqual(sim.pathsStream.get(), null);

  sim.reset();
  sim.step();
  sim.step();
  assert.ok(sim.pathsStream.get());
  sim.setContext({ existingCustomer: false });
  sim.step('fNew');
  after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['new']);
  assert.strictEqual(sim.pathsStream.get(), null);
  sim.stop();
});

test('exclusive gateway allows manual choice when context variable undefined', () => {
  const diagram = buildContextChoiceExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause with undefined context
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fExisting', 'fNew']);
  assert.deepStrictEqual(Array.from(sim.tokenStream.get(), t => t.element.id), ['gw']);

  sim.step('fExisting'); // choose a flow without defining context
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['existing']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('exclusive gateway proceeds automatically when only one flow is viable', () => {
  const diagram = buildSingleViableExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and move on
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('simulation allows choice when all gateway conditions are unsatisfied', () => {
  const diagram = buildAllFalseExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fa', 'fb']);
  assert.ok(paths.flows.every(f => f.satisfied === false));
  sim.step('fa'); // choose a flow despite unsatisfied condition
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});
