import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildTimerDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'UserTask', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const timerTarget = { id: 'OnTimer', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: task };
  start.outgoing = [f0];
  task.incoming = [f0];

  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: task, target: after };
  task.outgoing = [f1];
  after.incoming = [f1];

  const boundary = {
    id: 'BoundaryTimer',
    type: 'bpmn:BoundaryEvent',
    host: task,
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:BoundaryEvent',
      attachedToRef: { id: task.id },
      cancelActivity: true,
      eventDefinitions: [{ $type: 'bpmn:TimerEventDefinition' }]
    }
  };

  const bf = { id: 'bf', type: 'bpmn:SequenceFlow', source: boundary, target: timerTarget };
  boundary.outgoing = [bf];
  timerTarget.incoming = [bf];

  return [start, task, after, timerTarget, boundary, f0, f1, bf];
}

function buildMessageDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'UserTask', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const messageTarget = { id: 'OnMessage', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: task };
  start.outgoing = [f0];
  task.incoming = [f0];

  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: task, target: after };
  task.outgoing = [f1];
  after.incoming = [f1];

  const boundary = {
    id: 'BoundaryMessage',
    type: 'bpmn:BoundaryEvent',
    host: task,
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:BoundaryEvent',
      attachedToRef: { id: task.id },
      cancelActivity: false,
      eventDefinitions: [{ $type: 'bpmn:MessageEventDefinition' }]
    }
  };

  const bf = { id: 'bf', type: 'bpmn:SequenceFlow', source: boundary, target: messageTarget };
  boundary.outgoing = [bf];
  messageTarget.incoming = [bf];

  return [start, task, after, messageTarget, boundary, f0, f1, bf];
}

test('task spawns interrupting timer boundary token', () => {
  const diagram = buildTimerDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> task
  sim.step(); // process task, spawn boundary
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['BoundaryTimer', 'UserTask'].sort());
});

test('task spawns non-interrupting message boundary token', () => {
  const diagram = buildMessageDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step();
  sim.step();
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['BoundaryMessage', 'UserTask'].sort());
});
