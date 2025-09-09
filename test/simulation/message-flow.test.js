import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDiagram(targetParticipant = false) {
  const startA = {
    id: 'Start_A',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'Task_A', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const next = { id: 'Task_B', type: 'bpmn:UserTask', incoming: [], outgoing: [] };

  const f0 = { id: 'Flow_0', type: 'bpmn:SequenceFlow', source: startA, target: task };
  startA.outgoing = [f0];
  task.incoming = [f0];

  const fSeq = { id: 'Flow_Seq', type: 'bpmn:SequenceFlow', source: task, target: next };
  task.outgoing = [fSeq];
  next.incoming = [fSeq];

  let msgTarget;
  if (targetParticipant) {
    msgTarget = { id: 'Participant_B', type: 'bpmn:Participant', incoming: [], outgoing: [] };
  } else {
    msgTarget = {
      id: 'Start_B',
      type: 'bpmn:StartEvent',
      incoming: [],
      outgoing: [],
      businessObject: { $type: 'bpmn:StartEvent' }
    };
  }

  const m1 = { id: 'Message_1', type: 'bpmn:MessageFlow', source: task, target: msgTarget };
  task.outgoing.push(m1);
  msgTarget.incoming = [m1];

  return [startA, task, next, msgTarget, f0, fSeq, m1];
}

function buildMessageStartDiagram(correlated = true) {
  const startA = {
    id: 'Start_A',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'Task_A', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const next = { id: 'Task_B', type: 'bpmn:UserTask', incoming: [], outgoing: [] };

  const f0 = { id: 'Flow_0', type: 'bpmn:SequenceFlow', source: startA, target: task };
  startA.outgoing = [f0];
  task.incoming = [f0];

  const fSeq = { id: 'Flow_Seq', type: 'bpmn:SequenceFlow', source: task, target: next };
  task.outgoing = [fSeq];
  next.incoming = [fSeq];

  const startB = {
    id: 'Start_B',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:StartEvent',
      eventDefinitions: [
        { $type: 'bpmn:MessageEventDefinition', messageRef: { name: 'ping' } }
      ]
    }
  };

  const m1 = {
    id: 'Message_1',
    type: 'bpmn:MessageFlow',
    source: task,
    target: startB,
    businessObject: { messageRef: { name: correlated ? 'ping' : 'other' } }
  };
  task.outgoing.push(m1);
  startB.incoming = [m1];

  return [startA, task, next, startB, f0, fSeq, m1];
}

test('message flow to start event without message definition is ignored', () => {
  const diagram = buildDiagram(false);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> task
  sim.step(); // task -> next + message to Start_B
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(tokens, ['Task_B']);
});

test('message flow targeting participant does not spawn token', () => {
  const diagram = buildDiagram(true);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> task
  sim.step(); // task -> next (message flow ignored)
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(tokens, ['Task_B']);
});

test('uncorrelated message does not trigger start event', () => {
  const diagram = buildMessageStartDiagram(false);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> task
  sim.step(); // task -> next + message queued
  sim.triggerMessage('Start_B');
  sim.step();
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(tokens, ['Task_B']);
});

