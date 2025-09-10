import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';
import { Stream } from '../../public/js/core/stream.js';
import { openStartEventSelectionModal } from '../../public/js/components/elements.js';

class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this._text = '';
    this.parentNode = null;
    this.events = {};
  }
  set textContent(val) {
    this._text = String(val);
  }
  get textContent() {
    return this._text + this.children.map(c => c.textContent).join('');
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }
  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx >= 0) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }
  addEventListener(type, fn) {
    this.events[type] = fn;
  }
  contains(el) {
    if (this === el) return true;
    return this.children.some(child => child.contains && child.contains(el));
  }
  querySelectorAll(selector) {
    const results = [];
    const traverse = node => {
      node.children.forEach(child => {
        if (selector === 'input' && child.tagName === 'input') results.push(child);
        traverse(child);
      });
    };
    traverse(this);
    return results;
  }
}

class Document {
  constructor() {
    this.body = new Element('body');
  }
  createElement(tag) {
    return new Element(tag);
  }
  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

function setupDom() {
  const document = new Document();
  const oldDoc = global.document;
  const oldWin = global.window;
  const oldNode = global.Node;
  global.document = document;
  global.window = { document };
  global.Node = Element;
  return { document, themeStream: new Stream({ colors: {}, fonts: {} }), restore() { global.document = oldDoc; global.window = oldWin; global.Node = oldNode; } };
}

function buildMultiStartDiagram() {
  const startA = { id: 'StartNone', type: 'bpmn:StartEvent', incoming: [], outgoing: [], businessObject: { $type: 'bpmn:StartEvent', name: 'None' } };
  const startB = { id: 'StartMessage', type: 'bpmn:StartEvent', incoming: [], outgoing: [], businessObject: { $type: 'bpmn:StartEvent', name: 'Message' } };
  const taskA = { id: 'TaskNone', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const taskB = { id: 'TaskMessage', type: 'bpmn:UserTask', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', source: startA, target: taskA };
  const f1 = { id: 'f1', source: startB, target: taskB };
  startA.outgoing = [f0];
  taskA.incoming = [f0];
  startB.outgoing = [f1];
  taskB.incoming = [f1];
  return [startA, startB, taskA, taskB, f0, f1];
}

test('selecting start event via modal starts simulation at chosen event', async () => {
  const { document, themeStream, restore } = setupDom();
  try {
    const diagram = buildMultiStartDiagram();
    const sim = createSimulationInstance(diagram, { delay: 1 });
    const startEvents = diagram.filter(e => e.type === 'bpmn:StartEvent');
    const pickStream = openStartEventSelectionModal(startEvents, themeStream);
    const inputs = document.querySelectorAll('input');
    inputs[1].checked = true;
    const modal = document.body.children[0];
    const content = modal.children[0];
    const confirmBtn = content.children.find(c => c.tagName === 'button');
    confirmBtn.events['click']();
    const selectedId = await new Promise(res => pickStream.subscribe(v => v && res(v)));
    sim.start(selectedId);
    await new Promise(r => setTimeout(r, 20));
    const ids = Array.from(sim.tokenStream.get(), t => t.element && t.element.id);
    assert.deepStrictEqual(ids, ['TaskMessage']);
  } finally {
    restore();
  }
});
