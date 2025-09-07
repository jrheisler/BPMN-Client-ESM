import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const diagramXML = fs.readFileSync(new URL('../../sample.bpmn', import.meta.url), 'utf8');

test('token simulation emits start and end events', async (t) => {
  let BpmnJS, TokenSimulation;
  try {
    ({ default: BpmnJS } = await import('bpmn-js/lib/Modeler.js'));
    ({ default: TokenSimulation } = await import('bpmn-js-token-simulation'));
  } catch (err) {
    t.skip('bpmn-js-token-simulation not available');
    return;
  }

  if (typeof document === 'undefined' || !document.createElement) {
    t.skip('DOM not available');
    return;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);

  const modeler = new BpmnJS({
    container,
    additionalModules: [ TokenSimulation ]
  });

  await modeler.importXML(diagramXML);

  const simulation = modeler.get('tokenSimulation');
  const events = [];
  simulation.on('token-start', () => events.push('start'));
  simulation.on('token-end', () => events.push('end'));

  await simulation.start();

  assert(events.includes('start'));
  assert(events.includes('end'));
});
