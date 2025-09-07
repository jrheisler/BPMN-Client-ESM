import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';

function buildDeliveryCheckDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = {
    id: 'Gateway_DeliveryCheck',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const success = { id: 'Task_DeliverySuccess', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const dispute = { id: 'Task_Dispute', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const other = { id: 'Task_Investigate', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const fSuccess = {
    id: 'fSuccess',
    source: gw,
    target: success,
    businessObject: { conditionExpression: { body: "${deliveryStatus === 'successful'}" } }
  };
  const fDispute = {
    id: 'fDispute',
    source: gw,
    target: dispute,
    businessObject: { conditionExpression: { body: "${deliveryStatus === 'disputed'}" } }
  };
  const fOther = {
    id: 'fOther',
    source: gw,
    target: other,
    businessObject: {
      conditionExpression: {
        body: "${deliveryStatus !== 'successful' && deliveryStatus !== 'disputed'}"
      }
    }
  };

  gw.outgoing = [fSuccess, fDispute, fOther];
  success.incoming = [fSuccess];
  dispute.incoming = [fDispute];
  other.incoming = [fOther];

  return [start, gw, success, dispute, other, f0, fSuccess, fDispute, fOther];
}

test('token advances automatically when deliveryStatus matches a single branch', () => {
  const diagram = buildDeliveryCheckDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.setContext({ deliveryStatus: 'successful' });
  assert.strictEqual(sim.getContext().deliveryStatus, 'successful');
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and moves on
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['Task_DeliverySuccess']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('token automatically takes fallback branch when deliveryStatus is unset', () => {
  const diagram = buildDeliveryCheckDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // gateway evaluates and moves to fallback
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['Task_Investigate']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

