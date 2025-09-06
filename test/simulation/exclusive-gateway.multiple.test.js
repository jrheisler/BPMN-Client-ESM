const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildMultipleConditionalDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const f1 = { id: 'f1', source: gw, target: a, businessObject: { conditionExpression: { body: '${true}' } } };
  const f2 = { id: 'f2', source: gw, target: b, businessObject: { conditionExpression: { body: '${true}' } } };
  gw.outgoing = [f1, f2];
  a.incoming = [f1];
  b.incoming = [f2];

  return [start, gw, a, b, f0, f1, f2];
}

test('exclusive gateway pauses when multiple flows are viable', () => {
  const diagram = buildMultipleConditionalDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and waits for choice
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['f1', 'f2']);
});

