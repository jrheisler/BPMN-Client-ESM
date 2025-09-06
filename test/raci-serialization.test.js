const { test } = require('node:test');
const assert = require('assert');
const BpmnModdle = require('bpmn-moddle');
const customModdle = require('../public/js/custom-moddle.json');

test('RACI attributes persist through serialization', async () => {
  const moddle = new BpmnModdle({ custom: customModdle });

  const raciValues = {
    responsible: 'R',
    accountable: 'A',
    consulted: 'C',
    informed: 'I'
  };

  const raci = moddle.create('custom:Raci', raciValues);

  const task = moddle.create('bpmn:Task', {
    id: 'Task_1',
    extensionElements: moddle.create('bpmn:ExtensionElements', { values: [raci] })
  });

  const process = moddle.create('bpmn:Process', {
    id: 'Process_1',
    flowElements: [task]
  });

  const definitions = moddle.create('bpmn:Definitions', {
    targetNamespace: 'http://bpmn.io/schema/bpmn',
    rootElements: [process]
  });

  const { xml } = await moddle.toXML(definitions);

  const { rootElement } = await moddle.fromXML(xml);

  const deserializedTask = rootElement.rootElements[0].flowElements[0];
  const deserializedRaci = deserializedTask.extensionElements.values[0];

  assert.deepStrictEqual(
    {
      responsible: deserializedRaci.responsible,
      accountable: deserializedRaci.accountable,
      consulted: deserializedRaci.consulted,
      informed: deserializedRaci.informed
    },
    raciValues
  );
});
