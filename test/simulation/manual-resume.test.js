import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildUserTaskDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const user = { id: 'UserTask', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const after = { id: 'After', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: user };
  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: user, target: after };
  start.outgoing = [f0];
  user.incoming = [f0];
  user.outgoing = [f1];
  after.incoming = [f1];

  return [start, user, after, f0, f1];
}

// UserTask manual resume

test('UserTask pauses until manually resumed', async () => {
  const diagram = buildUserTaskDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> user task
  sim.step(); // process user task and pause
  let ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['UserTask']);
  await new Promise(r => setTimeout(r, 10));
  ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['UserTask']);
  sim.step(); // manual resume
  ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});

