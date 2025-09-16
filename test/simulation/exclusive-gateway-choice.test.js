import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationInstance } from '../helpers/simulation.js';
import { Stream } from '../../public/js/core/stream.js';
import { openFlowSelectionModal } from '../../public/js/components/index.js';

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

function buildContextChoiceDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gw = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const existing = { id: 'existing', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const newcomer = { id: 'new', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const fExisting = {
    id: 'fExisting',
    source: gw,
    target: existing,
    businessObject: { conditionExpression: { body: '${existingCustomer === true}' } }
  };
  const fNew = {
    id: 'fNew',
    source: gw,
    target: newcomer,
    businessObject: { conditionExpression: { body: '${existingCustomer === false}' } }
  };

  gw.outgoing = [fExisting, fNew];
  existing.incoming = [fExisting];
  newcomer.incoming = [fNew];

  return [start, gw, existing, newcomer, f0, fExisting, fNew];
}

function buildAutoResumeDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gw = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const end = {
    id: 'end',
    type: 'bpmn:EndEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:EndEvent' }
  };

  const f0 = { id: 'f0', source: start, target: gw };
  start.outgoing = [f0];
  gw.incoming = [f0];

  const fa = {
    id: 'fa',
    source: gw,
    target: a,
    businessObject: { conditionExpression: { body: '${true}' } }
  };
  const fb = {
    id: 'fb',
    source: gw,
    target: b,
    businessObject: { conditionExpression: { body: '${true}' } }
  };
  gw.outgoing = [fa, fb];
  a.incoming = [fa];
  b.incoming = [fb];

  const faEnd = { id: 'faEnd', source: a, target: end };
  const fbEnd = { id: 'fbEnd', source: b, target: end };
  a.outgoing = [faEnd];
  b.outgoing = [fbEnd];
  end.incoming = [faEnd, fbEnd];

  return [start, gw, a, b, end, f0, fa, fb, faEnd, fbEnd];
}

test('exclusive gateway waits for context variable choice', () => {
  const diagram = buildContextChoiceDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fExisting', 'fNew']);
  // token remains at gateway awaiting user input
  assert.deepStrictEqual(Array.from(sim.tokenStream.get(), t => t.element.id), ['gw']);

  sim.setContext({ existingCustomer: true });
  sim.step('fExisting');
  let after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['existing']);
  assert.strictEqual(sim.pathsStream.get(), null);

  sim.reset();
  sim.step();
  sim.step();
  assert.ok(sim.pathsStream.get());
  sim.setContext({ existingCustomer: false });
  sim.step('fNew');
  after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['new']);
  assert.strictEqual(sim.pathsStream.get(), null);
  sim.stop();
});

test('exclusive gateway allows manual choice when context variable undefined', () => {
  const diagram = buildContextChoiceDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and pause with undefined context
  const paths = sim.pathsStream.get();
  assert.ok(paths);
  assert.deepStrictEqual(paths.flows.map(f => f.flow.id), ['fExisting', 'fNew']);
  assert.deepStrictEqual(Array.from(sim.tokenStream.get(), t => t.element.id), ['gw']);

  sim.step('fExisting'); // choose a flow without defining context
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['existing']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

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

test('exclusive gateway stays at gateway if multiple flows selected', () => {
  const diagram = buildDiagram();
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
  const diagram = buildDiagram();
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

test('exclusive gateway proceeds automatically when only one flow is viable', () => {
  const diagram = buildSingleViableDiagram();
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // start -> gateway
  sim.step(); // evaluate and move on
  const after = Array.from(sim.tokenStream.get(), t => t.element.id);
  assert.deepStrictEqual(after, ['a']);
  assert.strictEqual(sim.pathsStream.get(), null);
});

function loadElements() {
  const document = new Document();
  global.document = document;
  global.window = { document };
  global.Node = Element;
  global.console = console;
  global.setTimeout = setTimeout;
  global.clearTimeout = clearTimeout;
  const themeStream = new Stream({ colors: {}, fonts: {} });
  return { document, themeStream };
}

test('flow selection modal displays condition text', () => {
  const { document, themeStream } = loadElements();
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
  const { document, themeStream } = loadElements();
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

test('manual step after exclusive gateway does not auto resume', async () => {
  const diagram = buildDiagram();
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
  const diagram = buildAutoResumeDiagram();
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

