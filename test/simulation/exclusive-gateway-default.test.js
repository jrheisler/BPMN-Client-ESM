import { test } from 'node:test';
import assert from 'node:assert/strict';

import { openFlowSelectionModal } from '../../public/js/components/index.js';
import { createSimulationInstance } from '../helpers/simulation.js';
import {
  buildAutoResumeExclusiveGatewayDiagram,
  buildBasicExclusiveGatewayDiagram,
  setupFlowSelectionTestEnvironment
} from '../helpers/exclusive-gateway.js';

test('exclusive gateway exposes flows and waits for explicit choice', () => {
  const diagram = buildBasicExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fa', 'fb']);
  sim.step('fb'); // choose second flow
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['b']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('exclusive gateway stays at gateway if multiple flows selected', () => {
  const diagram = buildBasicExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fa', 'fb']);

  sim.step(['flowA', 'flowB']); // attempt invalid multiple selection

  const afterTokens = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterTokens, ['gw']);
  const afterPaths = sim.pathsStream.get();
  assert.ok(afterPaths);
  assert.deepStrictEqual(afterPaths.flows.map(f => f.flow.id), ['fa', 'fb']);
});

test('exclusive gateway ignores unknown flow selection', () => {
  const diagram = buildBasicExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause

  sim.step('unknownFlow'); // attempt to follow non-existent flow

  const afterTokens = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterTokens, ['gw']);
  const afterPaths = sim.pathsStream.get();
  assert.ok(afterPaths);
  assert.deepStrictEqual(afterPaths.flows.map(f => f.flow.id), ['fa', 'fb']);
});

test('flow selection modal displays condition text', () => {
  const { document, themeStream } = setupFlowSelectionTestEnvironment();
  const flows = [
    {
      flow: {
        target: { id: 'a', businessObject: { name: 'Task A' } },
        businessObject: { conditionExpression: { body: '${x>5}' } }
      },
      satisfied: true
    },
    {
      flow: {
        target: { id: 'b', businessObject: { name: 'Task B' } },
        businessObject: {}
      },
      satisfied: true
    }
  ];
  openFlowSelectionModal(flows, themeStream);
  const labels = document.querySelectorAll('label > span');
  assert.ok(labels[0].textContent.includes('${x>5}'));
  assert.ok(labels[1].textContent.includes('default'));
});

test('flow selection modal indicates unsatisfied flows but keeps them enabled', () => {
  const { document, themeStream } = setupFlowSelectionTestEnvironment();
  const flows = [
    {
      flow: {
        target: { id: 'a', businessObject: { name: 'Task A' } },
        businessObject: { conditionExpression: { body: '${true}' } }
      },
      satisfied: true
    },
    {
      flow: {
        target: { id: 'b', businessObject: { name: 'Task B' } },
        businessObject: { conditionExpression: { body: '${false}' } }
      },
      satisfied: false
    }
  ];
  openFlowSelectionModal(flows, themeStream);
  const inputs = document.querySelectorAll('input');
  assert.strictEqual(inputs.length, 2);
  assert.ok(!inputs[0].disabled);
  assert.ok(!inputs[1].disabled);
  const labels = document.querySelectorAll('label > span');
  assert.ok(labels[0].textContent.includes('${true}'));
  assert.ok(labels[1].textContent.includes('${false}'));
  assert.ok(labels[1].textContent.includes('unsatisfied'));
});

test('manual step after exclusive gateway does not auto resume', async () => {
  const diagram = buildBasicExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  sim.step('fa'); // choose a path while paused
  await new Promise(r => setTimeout(r, 5));
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
});

test('exclusive gateway auto-resumes when running before choice', async () => {
  const diagram = buildAutoResumeExclusiveGatewayDiagram();
  const sim = createSimulationInstance(diagram, { delay: 1 });
  sim.reset();
  sim.resume();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause while running
  assert.ok(sim.pathsStream.get());
  sim.step('fa');
  const afterChoice = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(afterChoice, ['a']);
  await new Promise(r => setTimeout(r, 5));
  const final = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(final, []);
  sim.stop();
});
