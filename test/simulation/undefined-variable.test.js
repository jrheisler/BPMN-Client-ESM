import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gw = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const f1 = {
    id: 'f1',
    source: gw,
    target: a,
    businessObject: { conditionExpression: { body: '${flag}' } }
  };
  const f2 = {
    id: 'f2',
    source: gw,
    target: b,
    businessObject: { conditionExpression: { body: '${other}' } }
  };
  gw.outgoing = [f1, f2];
  a.incoming = [f1];
  b.incoming = [f2];

  return [start, gw, a, b, f0, f1, f2];
}

test('undefined variables evaluate to false by default and require manual path selection', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause awaiting user choice
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['gw']);
  assert.ok(sim.pathsStream.get());
});

test('undefined variables use provided fallback and auto-select satisfied flow', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(
    diagram,
    { delay: 0, conditionFallback: true },
    undefined,
    { other: false }
  );
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and move on
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});
