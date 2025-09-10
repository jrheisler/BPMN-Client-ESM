import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildSignalDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const wait = {
    id: 'WaitSignal',
    type: 'bpmn:IntermediateCatchEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:IntermediateCatchEvent',
      eventDefinitions: [
        { $type: 'bpmn:SignalEventDefinition', signalRef: { name: 'S' } }
      ]
    }
  };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: wait };
  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: wait, target: after };
  start.outgoing = [f0];
  wait.incoming = [f0];
  wait.outgoing = [f1];
  after.incoming = [f1];
  return [start, wait, after, f0, f1];
}

function buildErrorBubblingDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const sub = {
    id: 'Sub',
    type: 'bpmn:SubProcess',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:SubProcess' }
  };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const boundary = {
    id: 'BoundaryError',
    type: 'bpmn:BoundaryEvent',
    host: sub,
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:BoundaryEvent',
      attachedToRef: { id: sub.id },
      cancelActivity: true,
      eventDefinitions: [
        { $type: 'bpmn:ErrorEventDefinition', errorRef: { errorCode: 'E1' } }
      ]
    }
  };
  const onErr = { id: 'OnError', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: sub };
  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: sub, target: after };
  const bf = { id: 'bf', type: 'bpmn:SequenceFlow', source: boundary, target: onErr };
  start.outgoing = [f0];
  sub.incoming = [f0];
  sub.outgoing = [f1];
  after.incoming = [f1];
  boundary.outgoing = [bf];
  onErr.incoming = [bf];

  const s0 = {
    id: 'S0',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    parent: sub,
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const inner = {
    id: 'Inner',
    type: 'bpmn:UserTask',
    incoming: [],
    outgoing: [],
    parent: sub
  };
  const end = {
    id: 'End',
    type: 'bpmn:EndEvent',
    incoming: [],
    outgoing: [],
    parent: sub,
    businessObject: { $type: 'bpmn:EndEvent' }
  };
  const sf0 = { id: 'sf0', type: 'bpmn:SequenceFlow', source: s0, target: inner };
  const sf1 = { id: 'sf1', type: 'bpmn:SequenceFlow', source: inner, target: end };
  s0.outgoing = [sf0];
  inner.incoming = [sf0];
  inner.outgoing = [sf1];
  end.incoming = [sf1];

  return [
    start,
    sub,
    after,
    boundary,
    onErr,
    f0,
    f1,
    bf,
    s0,
    inner,
    end,
    sf0,
    sf1
  ];
}

function buildBoundaryDiagram(type, opts = {}) {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = {
    id: 'UserTask',
    type: 'bpmn:UserTask',
    incoming: [],
    outgoing: []
  };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const target = { id: 'BoundaryTarget', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: task };
  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: task, target: after };
  start.outgoing = [f0];
  task.incoming = [f0];
  task.outgoing = [f1];
  after.incoming = [f1];

  const bo = {
    $type: 'bpmn:BoundaryEvent',
    attachedToRef: { id: task.id },
    cancelActivity: opts.cancelActivity !== undefined ? opts.cancelActivity : true,
    eventDefinitions: [{ $type: `bpmn:${type}EventDefinition`, ...(opts.ref || {}) }]
  };
  const boundary = {
    id: `Boundary${type}`,
    type: 'bpmn:BoundaryEvent',
    host: task,
    incoming: [],
    outgoing: [],
    businessObject: bo
  };
  const bf = { id: 'bf', type: 'bpmn:SequenceFlow', source: boundary, target: target };
  boundary.outgoing = [bf];
  target.incoming = [bf];

  return [start, task, after, target, boundary, f0, f1, bf];
}

// --- tests ---

test('signal catch resumes on sendSignal', () => {
  const diagram = buildSignalDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset('Start');
  sim.step();
  sim.sendSignal('S');
  sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});

test('error bubbles to nearest boundary', () => {
  const diagram = buildErrorBubblingDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset('Start');
  sim.step();
  sim.step();
  sim.step();
  sim.throwError('Inner', 'E1');
  sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['OnError']);
});

test('escalation boundary catches escalation', () => {
  const diagram = buildBoundaryDiagram('Escalation', { ref: { escalationRef: { escalationCode: 'ESC' } } });
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step();
  sim.step();
  sim.throwEscalation('UserTask', 'ESC');
  sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['BoundaryTarget']);
});

test('cancel boundary catches cancel', () => {
  const diagram = buildBoundaryDiagram('Cancel');
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step();
  sim.step();
  sim.throwCancel('UserTask');
  sim.step();
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['BoundaryTarget']);
});

test('compensation boundary is non-interrupting', () => {
  const diagram = buildBoundaryDiagram('Compensate', { cancelActivity: false });
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step();
  sim.step();
  sim.throwCompensation('UserTask');
  sim.step();
  const ids = sim
    .tokenStream
    .get()
    .map(t => t.element && t.element.id)
    .sort();
  assert.deepStrictEqual(
    ids,
    ['BoundaryCompensate', 'BoundaryTarget', 'UserTask'].sort()
  );
});
