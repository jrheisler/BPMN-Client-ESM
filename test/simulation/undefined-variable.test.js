const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const f1 = { id: 'f1', source: gw, target: a, businessObject: { conditionExpression: { body: '${flag}' } } };
  const f2 = { id: 'f2', source: gw, target: b };
  gw.outgoing = [f1, f2];
  gw.businessObject.default = f2;
  a.incoming = [f1];
  b.incoming = [f2];

  return [start, gw, a, b, f0, f1, f2];
}

test('undefined variables evaluate to false by default', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause with default flow
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.strictEqual(paths.isDefaultOnly, true);
  assert.strictEqual(paths.flows.length, 2);
  const f1 = paths.flows.find(f => f.flow.id === 'f1');
  const f2 = paths.flows.find(f => f.flow.id === 'f2');
  assert.ok(f1 && f2);
  assert.strictEqual(f1.satisfied, false);
  assert.strictEqual(f2.satisfied, true);
});

test('undefined variables use provided fallback but still require explicit choice', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0, conditionFallback: true });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const tokens = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(tokens, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  const f1 = paths.flows.find(f => f.flow.id === 'f1');
  const f2 = paths.flows.find(f => f.flow.id === 'f2');
  assert.ok(f1 && f2);
  assert.strictEqual(f1.satisfied, true);
  assert.strictEqual(f2.satisfied, false);
  sim.step('f1');
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});
