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

  const fa = { id: 'fa', source: gw, target: a, businessObject: { conditionExpression: { body: '${true}' } } };
  const fb = { id: 'fb', source: gw, target: b, businessObject: { conditionExpression: { body: '${true}' } } };
  gw.outgoing = [fa, fb];
  a.incoming = [fa];
  b.incoming = [fb];

  return [start, gw, a, b, f0, fa, fb];
}

test('exclusive gateway pauses for choice when multiple conditions are true', () => {
  // Exclusive gateways should pause and expose all viable flows when more than
  // one condition evaluates to true so that a caller can choose explicitly.
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and waits for a decision
  const tokens = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(tokens, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fa', 'fb']);
});

