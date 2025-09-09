import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDiagram() {
  const start = {
    id: 'Start',
    type: 'bpmn:StartEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gw = {
    id: 'Gateway',
    type: 'bpmn:EventBasedGateway',
    incoming: [],
    outgoing: []
  };
  const timerA = {
    id: 'TimerA',
    type: 'bpmn:IntermediateCatchEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:IntermediateCatchEvent',
      eventDefinitions: [
        {
          $type: 'bpmn:TimerEventDefinition',
          timeDuration: { body: 'PT0.01S' }
        }
      ]
    }
  };
  const timerB = {
    id: 'TimerB',
    type: 'bpmn:IntermediateCatchEvent',
    incoming: [],
    outgoing: [],
    businessObject: {
      $type: 'bpmn:IntermediateCatchEvent',
      eventDefinitions: [
        {
          $type: 'bpmn:TimerEventDefinition',
          timeDuration: { body: 'PT0.02S' }
        }
      ]
    }
  };
  const afterA = { id: 'AfterA', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const afterB = { id: 'AfterB', type: 'bpmn:UserTask', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  const f1 = { id: 'f1', source: gw, target: timerA };
  const f2 = { id: 'f2', source: gw, target: timerB };
  const f3 = { id: 'f3', source: timerA, target: afterA };
  const f4 = { id: 'f4', source: timerB, target: afterB };

  start.outgoing = [f0];
  gw.incoming = [f0];
  gw.outgoing = [f1, f2];
  timerA.incoming = [f1];
  timerA.outgoing = [f3];
  timerB.incoming = [f2];
  timerB.outgoing = [f4];
  afterA.incoming = [f3];
  afterB.incoming = [f4];

  return [start, gw, timerA, timerB, afterA, afterB, f0, f1, f2, f3, f4];
}

test('event-based gateway follows first completed event automatically', async () => {
  const diagram = buildDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // spawn event tokens and activate timers
  await new Promise(r => setTimeout(r, 40));
  const ids = sim.tokenStream.get().map(t => t.element && t.element.id);
  assert.deepStrictEqual(ids, ['AfterA']);
});

