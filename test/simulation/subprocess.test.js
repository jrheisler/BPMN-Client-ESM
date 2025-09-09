import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildEmbeddedSubprocessDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const sub = { id: 'sub', type: 'bpmn:SubProcess', incoming: [], outgoing: [], businessObject: {} };
  const after = { id: 'after', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: sub };
  const f1 = { id: 'f1', source: sub, target: after };
  start.outgoing = [f0];
  sub.incoming = [f0];
  sub.outgoing = [f1];
  after.incoming = [f1];

  const s0 = {
    id: 'subStart',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' },
    parent: sub
  };
  const t0 = { id: 'subTask', type: 'bpmn:Task', incoming: [], outgoing: [], parent: sub };
  const e0 = {
    id: 'subEnd',
    type: 'bpmn:EndEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:EndEvent' },
    parent: sub
  };
  const sf0 = { id: 'sf0', source: s0, target: t0 };
  const sf1 = { id: 'sf1', source: t0, target: e0 };
  s0.outgoing = [sf0];
  t0.incoming = [sf0];
  t0.outgoing = [sf1];
  e0.incoming = [sf1];

  return [start, sub, after, f0, f1, s0, t0, e0, sf0, sf1];
}

function buildCallActivityDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const call = {
    id: 'call',
    type: 'bpmn:CallActivity',
    incoming: [],
    outgoing: [],
    businessObject: { calledElement: { id: 'proc' } }
  };
  const after = { id: 'after', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', source: start, target: call };
  const f1 = { id: 'f1', source: call, target: after };
  start.outgoing = [f0];
  call.incoming = [f0];
  call.outgoing = [f1];
  after.incoming = [f1];

  const proc = { id: 'proc', type: 'bpmn:Process' };
  const ps = {
    id: 'pStart',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' },
    parent: proc
  };
  const pt = { id: 'pTask', type: 'bpmn:Task', incoming: [], outgoing: [], parent: proc };
  const pe = {
    id: 'pEnd',
    type: 'bpmn:EndEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:EndEvent' },
    parent: proc
  };
  const pf0 = { id: 'pf0', source: ps, target: pt };
  const pf1 = { id: 'pf1', source: pt, target: pe };
  ps.outgoing = [pf0];
  pt.incoming = [pf0];
  pt.outgoing = [pf1];
  pe.incoming = [pf1];

  return [start, call, after, f0, f1, proc, ps, pt, pe, pf0, pf1];
}

function buildMultiInstanceDiagram() {
  const diagram = buildEmbeddedSubprocessDiagram();
  const sub = diagram.find(e => e.id === 'sub');
  sub.businessObject.loopCharacteristics = { loopCardinality: { body: '${3}' } };
  return diagram;
}

test('embedded subprocess runs and completes', () => {
  const diagram = buildEmbeddedSubprocessDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  for (let i = 0; i < 6; i++) sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['after']);
});

test('call activity invokes called process', () => {
  const diagram = buildCallActivityDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  for (let i = 0; i < 6; i++) sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['after']);
});

test('multi-instance subprocess waits for all instances', () => {
  const diagram = buildMultiInstanceDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step();
  sim.step();
  let ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  const count = ids.filter(id => id === 'subStart').length;
  assert.equal(count, 3);
  for (let i = 0; i < 4; i++) sim.step();
  ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['after']);
});
