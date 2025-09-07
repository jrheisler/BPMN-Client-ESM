import { test } from 'node:test';
import assert from 'node:assert/strict';
import customModdle from '../public/js/custom-moddle.json' assert { type: 'json' };
import { collectData } from '../public/js/components/raciMatrix.js';

test('collectData extracts RACI values from task', async t => {
  let BpmnModdle;
  try {
    ({ default: BpmnModdle } = await import('bpmn-moddle'));
  } catch (err) {
    t.skip('bpmn-moddle not available');
    return;
  }

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

  const rows = collectData(modeler);
  assert.strictEqual(rows.length, 1);
  const row = rows[0];
  assert.strictEqual(row.responsible, 'R');
  assert.strictEqual(row.accountable, 'A');
  assert.strictEqual(row.consulted, 'C');
  assert.strictEqual(row.informed, 'I');
});

