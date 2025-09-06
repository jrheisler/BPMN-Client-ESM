const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildSingleConditionalDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const f1 = { id: 'f1', source: gw, target: a, businessObject: { conditionExpression: { body: '${true}' } } };
  gw.outgoing = [f1];
  a.incoming = [f1];

  return [start, gw, a, f0, f1];
}

function buildDefaultFlowDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const f1 = { id: 'f1', source: gw, target: a, businessObject: { conditionExpression: { body: '${false}' } } };
  const f2 = { id: 'f2', source: gw, target: b };
  gw.outgoing = [f1, f2];
  gw.businessObject.default = f2;
  a.incoming = [f1];
  b.incoming = [f2];

  return [start, gw, a, b, f0, f1, f2];
}

test('exclusive gateway waits for choice when a single conditional flow is viable', () => {
  const diagram = buildSingleConditionalDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and pauses
  const atGateway = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(atGateway, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['f1']);
  sim.step('f1');
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('exclusive gateway pauses when only default flow is available', () => {
  const diagram = buildDefaultFlowDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and pauses
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

