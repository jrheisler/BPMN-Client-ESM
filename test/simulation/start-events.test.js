import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildMultiStartDiagram() {
  const startNone = {
    id: 'StartNone',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const startMessage = {
    id: 'StartMessage',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:StartEvent',
      eventDefinitions: [{ $type: 'bpmn:MessageEventDefinition' }]
    }
  };
  const taskNone = { id: 'TaskNone', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const taskMessage = { id: 'TaskMessage', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', source: startNone, target: taskNone };
  const f1 = { id: 'f1', source: startMessage, target: taskMessage };
  startNone.outgoing = [f0];
  taskNone.incoming = [f0];
  startMessage.outgoing = [f1];
  taskMessage.incoming = [f1];
  return [startNone, startMessage, taskNone, taskMessage, f0, f1];
}

function buildTimerStartDiagram() {
  const startTimer = {
    id: 'StartTimer',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:StartEvent',
      eventDefinitions: [{ $type: 'bpmn:TimerEventDefinition' }]
    }
  };
  const after = { id: 'After', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', source: startTimer, target: after };
  startTimer.outgoing = [f0];
  after.incoming = [f0];
  return [startTimer, after, f0];
}

// Message start event should resume automatically

test('message start event proceeds automatically', async () => {
  const diagram = buildMultiStartDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.start('StartMessage');
  await new Promise(r => setTimeout(r, 20));
  const ids = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['TaskMessage']);
});

// Timer start event requires manual resume

test('timer start event waits for manual trigger', async () => {
  const diagram = buildTimerStartDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.start('StartTimer');
  await new Promise(r => setTimeout(r, 20));
  let ids = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['StartTimer']);
  sim.resume();
  await new Promise(r => setTimeout(r, 20));
  ids = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});

// When multiple start events exist, default to the one without event definition

test('defaults to none start event when multiple start nodes exist', async () => {
  const diagram = buildMultiStartDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.start();
  await new Promise(r => setTimeout(r, 20));
  const ids = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['TaskNone']);
});

