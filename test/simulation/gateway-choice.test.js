import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const diagramXML = fs.readFileSync(new URL('../../sample2.bpmn', import.meta.url), 'utf8');

test('exclusive gateway chooses a path during simulation', async (t) => {
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
  const ends = [];
  simulation.on('token-end', ({ element }) => {
    ends.push(element.id);
  });

  await simulation.start();

  assert(ends.some(id => /EndEvent/.test(id)), 'no end event reached');
});
