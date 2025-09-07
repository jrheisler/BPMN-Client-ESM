import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const diagramXML = fs.readFileSync(new URL('../../sample.bpmn', import.meta.url), 'utf8');

test('tokens reach end state after simulation', async (t) => {
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
  const ended = [];
  simulation.on('token-end', ({ token }) => ended.push(token.id));

  await simulation.start();

  assert(ended.length > 0, 'no tokens ended');
});
