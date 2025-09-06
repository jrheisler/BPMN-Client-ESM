const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildSplitJoinDiagram(extraTaskOnB = false, omitDirection = false) {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const split = {
    id: 'split',
    type: 'bpmn:InclusiveGateway',
    businessObject: omitDirection ? {} : { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const join = { id: 'join', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Converging' }, incoming: [], outgoing: [] };
  const end = { id: 'end', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b1 = { id: 'b1', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: split };
  start.outgoing = [f0];
  split.incoming = [f0];

  const fa = { id: 'fa', source: split, target: a };
  const fb = { id: 'fb', source: split, target: b1 };
  split.outgoing = [fa, fb];
  a.incoming = [fa];
  b1.incoming = [fb];

  const aj = { id: 'aj', source: a, target: join };
  a.outgoing = [aj];
  join.incoming = [aj];

  const elements = [start, split, a, b1, join, end, f0, fa, fb, aj];

  if (extraTaskOnB) {
    const b2 = { id: 'b2', type: 'bpmn:Task', incoming: [], outgoing: [] };
    const b1b2 = { id: 'b1b2', source: b1, target: b2 };
    const b2j = { id: 'b2j', source: b2, target: join };
    b1.outgoing = [b1b2];
    b2.incoming = [b1b2];
    b2.outgoing = [b2j];
    join.incoming.push(b2j);
    elements.push(b2, b1b2, b2j);
  } else {
    const b1j = { id: 'b1j', source: b1, target: join };
    b1.outgoing = [b1j];
    join.incoming.push(b1j);
    elements.push(b1j);
  }

  const je = { id: 'je', source: join, target: end };
  join.outgoing = [je];
  end.incoming = [je];
  elements.push(je);

  return elements;
}

test('inclusive split/join with single selected path does not wait for others', () => {
  const diagram = buildSplitJoinDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> split
  sim.step(); // process gateway and wait for decision
  sim.step(['fa']); // choose only path a
  sim.step(); // a -> join
  const afterA = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterA, ['join']);
  sim.step(); // join -> end
  const afterJoin = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterJoin, ['end']);
});

test('inclusive split/join waits for all selected branches', () => {
  const diagram = buildSplitJoinDiagram(true);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> split
  sim.step(); // process gateway and wait for decision
  sim.step(['fa', 'fb']); // take both paths
  sim.step(); // a -> join, b1 -> b2
  const afterFirst = Array.from(sim.tokenStream.get(), t => t.element.id).sort();
  assert.deepStrictEqual(afterFirst, ['b2', 'join']);
  sim.step(); // join still waiting, b2 -> join
  const afterSecond = Array.from(sim.tokenStream.get(), t => t.element.id).sort();
  assert.deepStrictEqual(afterSecond, ['join', 'join']);
  sim.step(); // join -> end
  const afterMerge = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterMerge, ['end']);
});

test('inclusive split without gatewayDirection waits for explicit flow selection', () => {
  const diagram = buildSplitJoinDiagram(false, true);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> split
  sim.step(); // process gateway, should wait for decision
  const paths = sim.pathsStream.get();
  assert.ok(paths && paths.flows.length === 2);
  const atGateway = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(atGateway, ['split']);
  sim.step(['fa']); // choose path a
  sim.step(); // a -> join
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['join']);
});

