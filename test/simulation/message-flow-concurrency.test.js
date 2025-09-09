import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDiagram(correlated = true) {
  const startA = {
    id: 'Start_A',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const userTask = { id: 'Task_A', type: 'bpmn:UserTask', incoming: [], outgoing: [] };

  const startB = {
    id: 'Start_B',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:StartEvent',
      eventDefinitions: [
        {
          $type: 'bpmn:MessageEventDefinition',
          messageRef: { name: 'ping' }
        }
      ]
    }
  };
  const nextB = { id: 'Task_B', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: startA, target: userTask };
  startA.outgoing = [f0];
  userTask.incoming = [f0];

  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: startB, target: nextB };
  startB.outgoing = [f1];
  nextB.incoming = [f1];

  const m1 = {
    id: 'm1',
    type: 'bpmn:MessageFlow',
    source: userTask,
    target: startB,
    businessObject: {
      messageRef: { name: correlated ? 'ping' : 'other' }
    }
  };
  userTask.outgoing = [m1];
  startB.incoming = [m1];

  return [startA, userTask, startB, nextB, f0, f1, m1];
}

test('user task sends message and both paths continue', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // Start_A -> Task_A
  sim.step(); // message queued
  sim.triggerMessage('Start_B');
  sim.step(); // consume message -> Task_B while Task_A pauses
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['Task_A', 'Task_B'].sort());
});

test('uncorrelated message does not start target', () => {
  const diagram = buildDiagram(false);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // Start_A -> Task_A
  sim.step(); // message queued
  sim.triggerMessage('Start_B');
  sim.step();
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['Task_A']);
});
