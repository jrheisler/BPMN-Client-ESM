const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createSimulationInstance } = require('../helpers/simulation');

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
        if (selector === 'label > span' && child.tagName === 'label') {
          child.children.forEach(grand => {
            if (grand.tagName === 'span') results.push(grand);
          });
        }
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


function buildDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const fa = { id: 'fa', source: gw, target: a, businessObject: { conditionExpression: { body: '${true}' } } };
  const fb = { id: 'fb', source: gw, target: b, businessObject: { conditionExpression: { body: '${true}' } } };
  gw.outgoing = [fa, fb];
  a.incoming = [fa];
  b.incoming = [fb];

  return [start, gw, a, b, f0, fa, fb];
}

function buildSingleViableDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const fa = { id: 'fa', source: gw, target: a, businessObject: { conditionExpression: { body: '${true}' } } };
  const fb = { id: 'fb', source: gw, target: b, businessObject: { conditionExpression: { body: '${false}' } } };
  gw.outgoing = [fa, fb];
  a.incoming = [fa];
  b.incoming = [fb];

  return [start, gw, a, b, f0, fa, fb];
}

test('exclusive gateway exposes flows and waits for explicit choice', () => {
  const diagram = buildDiagram();
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

test('exclusive gateway pauses even when only one flow is viable', () => {
  const diagram = buildSingleViableDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const tokens = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(tokens, ['gw']);
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  const fA = paths.flows.find(f => f.flow.id === 'fa');
  const fB = paths.flows.find(f => f.flow.id === 'fb');
  assert.ok(fA && fB);
  assert.strictEqual(fA.satisfied, true);
  assert.strictEqual(fB.satisfied, false);
  sim.step('fa');
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

function loadElements() {
  const document = new Document();
  const window = { document };
  const sandbox = {
    window,
    document,
    Node: Element,
    console,
    setTimeout,
    clearTimeout
  };
  const streamCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/core/stream.js'), 'utf8');
  vm.runInNewContext(streamCode, sandbox);
  vm.runInNewContext('currentTheme = new Stream({ colors: {}, fonts: {} });', sandbox);
  const elementsCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/components/elements.js'), 'utf8');
  vm.runInNewContext(elementsCode, sandbox);
  return { sandbox, document };
}

test('flow selection modal displays condition text', () => {
  const { sandbox, document } = loadElements();
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
  sandbox.window.openFlowSelectionModal(flows);
  const labels = document.querySelectorAll('label > span');
  assert.ok(labels[0].textContent.includes('${x>5}'));
  assert.ok(labels[1].textContent.includes('default'));
});

test('flow selection modal indicates unsatisfied flows but keeps them enabled', () => {
  const { sandbox, document } = loadElements();
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
  sandbox.window.openFlowSelectionModal(flows);
  const inputs = document.querySelectorAll('input');
  assert.strictEqual(inputs.length, 2);
  assert.ok(!inputs[0].disabled);
  assert.ok(!inputs[1].disabled);
  const labels = document.querySelectorAll('label > span');
  assert.ok(labels[0].textContent.includes('${true}'));
  assert.ok(labels[1].textContent.includes('${false}'));
  assert.ok(labels[1].textContent.includes('unsatisfied'));
});

test('simulation allows choice when all gateway conditions are unsatisfied', () => {
  function buildAllFalseDiagram() {
    const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
    const gw = { id: 'gw', type: 'bpmn:ExclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
    const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
    const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

    const f0 = { id: 'f0', source: start, target: gw };
    start.outgoing = [f0];
    gw.incoming = [f0];

    const fa = { id: 'fa', source: gw, target: a, businessObject: { conditionExpression: { body: '${false}' } } };
    const fb = { id: 'fb', source: gw, target: b, businessObject: { conditionExpression: { body: '${false}' } } };
    gw.outgoing = [fa, fb];
    a.incoming = [fa];
    b.incoming = [fb];

    return [start, gw, a, b, f0, fa, fb];
  }

  const diagram = buildAllFalseDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fa', 'fb']);
  assert.ok(paths.flows.every(f => f.satisfied === false));
  sim.step('fa'); // choose a flow despite unsatisfied condition
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

