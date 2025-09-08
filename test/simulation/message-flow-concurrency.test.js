import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDiagram() {
  const startA = {
    id: 'Start_A',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const task = { id: 'Task_A', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const wait = { id: 'Catch_A', type: 'bpmn:UserTask', incoming: [], outgoing: [] };

  const startB = {
    id: 'Start_B',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const nextB = { id: 'Task_B', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: startA, target: task };
  startA.outgoing = [f0];
  task.incoming = [f0];

  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: task, target: wait };
  task.outgoing = [f1];
  wait.incoming = [f1];

  const f2 = { id: 'f2', type: 'bpmn:SequenceFlow', source: startB, target: nextB };
  startB.outgoing = [f2];
  nextB.incoming = [f2];

  const m1 = { id: 'm1', type: 'bpmn:MessageFlow', source: task, target: startB };
  task.outgoing.push(m1);
  startB.incoming = [m1];

  return [startA, task, wait, startB, nextB, f0, f1, f2, m1];
}

test('task sends message and continues to waiting element', () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // Start_A -> Task_A
  sim.step(); // Task_A -> Catch_A + message to Start_B
  sim.step(); // Start_B -> Task_B
  const tokens = Array.from(sim.tokenStream.get(), t => t.element && t.element.id).sort();
  assert.deepStrictEqual(tokens, ['Catch_A', 'Task_B'].sort());
});
