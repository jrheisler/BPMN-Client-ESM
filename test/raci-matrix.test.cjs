const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const BpmnModdle = require('bpmn-moddle');
const customModdle = require('../public/js/custom-moddle.json');

function loadCollectData() {
  const file = fs.readFileSync(path.resolve(__dirname, '../public/js/components/raciMatrix.js'), 'utf8');
  const patched = file.replace('global.raciMatrix = {', 'global.raciMatrix = { collectData,');
  const sandbox = { window: {} };
  vm.runInNewContext(patched, sandbox);
  return sandbox.window.raciMatrix.collectData;
}

test('collectData extracts RACI values from task', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:custom="http://example.com/custom" targetNamespace="http://bpmn.io/schema/bpmn">
    <bpmn:process id="Process_1">
      <bpmn:task id="Task_1" name="Task" responsible="R" consulted="C">
        <bpmn:extensionElements>
          <custom:Raci accountable="A" informed="I" />
        </bpmn:extensionElements>
      </bpmn:task>
    </bpmn:process>
  </bpmn:definitions>`;

  const moddle = new BpmnModdle({ custom: customModdle });
  const { rootElement } = await moddle.fromXML(xml);
  const task = rootElement.rootElements[0].flowElements[0];

  const elementRegistry = {
    getAll() {
      return [{ id: task.id, businessObject: task }];
    }
  };

  const modeler = {
    get(name) {
      if (name === 'elementRegistry') return elementRegistry;
      return null;
    }
  };

  const collectData = loadCollectData();
  const rows = collectData(modeler);
  assert.strictEqual(rows.length, 1);
  const row = rows[0];
  assert.strictEqual(row.responsible, 'R');
  assert.strictEqual(row.accountable, 'A');
  assert.strictEqual(row.consulted, 'C');
  assert.strictEqual(row.informed, 'I');
});

