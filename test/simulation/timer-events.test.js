import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildTimerDiagram(prop, expr) {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const timer = {
    id: 'Timer',
    type: 'bpmn:IntermediateCatchEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:IntermediateCatchEvent',
      eventDefinitions: [
        {
          $type: 'bpmn:TimerEventDefinition',
          [prop]: { body: expr }
        }
      ]
    }
  };
  const after = { id: 'After', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', type: 'bpmn:SequenceFlow', source: start, target: timer };
  const f1 = { id: 'f1', type: 'bpmn:SequenceFlow', source: timer, target: after };
  start.outgoing = [f0];
  timer.incoming = [f0];
  timer.outgoing = [f1];
  after.incoming = [f1];
  return [start, timer, after, f0, f1];
}

test('TimerEvent resumes after timeDuration', async () => {
  const diagram = buildTimerDiagram('timeDuration', 'PT0.01S');
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.step();
  sim.step();
  await new Promise(r => setTimeout(r, 30));
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});

test('TimerEvent resumes after timeDate', async () => {
  const date = new Date(Date.now() + 20).toISOString();
  const diagram = buildTimerDiagram('timeDate', date);
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.step();
  sim.step();
  await new Promise(r => setTimeout(r, 40));
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});

test('TimerEvent resumes after timeCycle', async () => {
  const diagram = buildTimerDiagram('timeCycle', 'R/PT0.01S');
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.step();
  sim.step();
  await new Promise(r => setTimeout(r, 30));
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['After']);
});
