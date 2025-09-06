const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildDiagram(targetParticipant = false) {
  const startA = {
    id: 'Start_A',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'Task_A', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const next = { id: 'Task_B', type: 'bpmn:Task', incoming: [], outgoing: [] };

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

test('task sends message and continues along sequence flow', () => {
  const diagram = buildDiagram(false);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> task
  sim.step(); // task -> next + message to Start_B
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['Start_B', 'Task_B'].sort());
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

