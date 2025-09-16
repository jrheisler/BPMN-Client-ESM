import { Stream } from '../../public/js/core/stream.js';

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
    return this._text + this.children.map(child => child.textContent).join('');
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) {
      this.parentNode.children.splice(index, 1);
    }
    this.parentNode = null;
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
        if (selector === 'input' && child.tagName === 'input') {
          results.push(child);
        }
        if (selector === 'label > span' && child.tagName === 'label') {
          child.children.forEach(grandChild => {
            if (grandChild.tagName === 'span') {
              results.push(grandChild);
            }
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

export function setupFlowSelectionTestEnvironment() {
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

export function buildBasicExclusiveGatewayDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gateway = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const taskA = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const taskB = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const startToGateway = { id: 'f0', source: start, target: gateway };
  start.outgoing = [startToGateway];
  gateway.incoming = [startToGateway];

  const gatewayToA = {
    id: 'fa',
    source: gateway,
    target: taskA,
    businessObject: { conditionExpression: { body: '${true}' } }
  };
  const gatewayToB = {
    id: 'fb',
    source: gateway,
    target: taskB,
    businessObject: { conditionExpression: { body: '${true}' } }
  };

  gateway.outgoing = [gatewayToA, gatewayToB];
  taskA.incoming = [gatewayToA];
  taskB.incoming = [gatewayToB];

  return [start, gateway, taskA, taskB, startToGateway, gatewayToA, gatewayToB];
}

export function buildSingleViableExclusiveGatewayDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gateway = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const taskA = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const taskB = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const startToGateway = { id: 'f0', source: start, target: gateway };
  start.outgoing = [startToGateway];
  gateway.incoming = [startToGateway];

  const gatewayToA = {
    id: 'fa',
    source: gateway,
    target: taskA,
    businessObject: { conditionExpression: { body: '${true}' } }
  };
  const gatewayToB = {
    id: 'fb',
    source: gateway,
    target: taskB,
    businessObject: { conditionExpression: { body: '${false}' } }
  };

  gateway.outgoing = [gatewayToA, gatewayToB];
  taskA.incoming = [gatewayToA];
  taskB.incoming = [gatewayToB];

  return [start, gateway, taskA, taskB, startToGateway, gatewayToA, gatewayToB];
}

export function buildContextChoiceExclusiveGatewayDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gateway = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const existing = {
    id: 'existing',
    type: 'bpmn:Task',
    incoming: [],
    outgoing: []
  };
  const newcomer = { id: 'new', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const startToGateway = { id: 'f0', source: start, target: gateway };
  start.outgoing = [startToGateway];
  gateway.incoming = [startToGateway];

  const gatewayToExisting = {
    id: 'fExisting',
    source: gateway,
    target: existing,
    businessObject: { conditionExpression: { body: '${existingCustomer === true}' } }
  };
  const gatewayToNew = {
    id: 'fNew',
    source: gateway,
    target: newcomer,
    businessObject: { conditionExpression: { body: '${existingCustomer === false}' } }
  };

  gateway.outgoing = [gatewayToExisting, gatewayToNew];
  existing.incoming = [gatewayToExisting];
  newcomer.incoming = [gatewayToNew];

  return [start, gateway, existing, newcomer, startToGateway, gatewayToExisting, gatewayToNew];
}

export function buildAutoResumeExclusiveGatewayDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gateway = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const taskA = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const taskB = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const end = {
    id: 'end',
    type: 'bpmn:EndEvent',
    incoming: [],
    outgoing: [],
    businessObject: { $type: 'bpmn:EndEvent' }
  };

  const startToGateway = { id: 'f0', source: start, target: gateway };
  start.outgoing = [startToGateway];
  gateway.incoming = [startToGateway];

  const gatewayToA = {
    id: 'fa',
    source: gateway,
    target: taskA,
    businessObject: { conditionExpression: { body: '${true}' } }
  };
  const gatewayToB = {
    id: 'fb',
    source: gateway,
    target: taskB,
    businessObject: { conditionExpression: { body: '${true}' } }
  };

  gateway.outgoing = [gatewayToA, gatewayToB];
  taskA.incoming = [gatewayToA];
  taskB.incoming = [gatewayToB];

  const gatewayToEndA = { id: 'faEnd', source: taskA, target: end };
  const gatewayToEndB = { id: 'fbEnd', source: taskB, target: end };

  taskA.outgoing = [gatewayToEndA];
  taskB.outgoing = [gatewayToEndB];
  end.incoming = [gatewayToEndA, gatewayToEndB];

  return [
    start,
    gateway,
    taskA,
    taskB,
    end,
    startToGateway,
    gatewayToA,
    gatewayToB,
    gatewayToEndA,
    gatewayToEndB
  ];
}

export function buildAllFalseExclusiveGatewayDiagram() {
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const gateway = {
    id: 'gw',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { gatewayDirection: 'Diverging' },
    incoming: [],
    outgoing: []
  };
  const taskA = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const taskB = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const startToGateway = { id: 'f0', source: start, target: gateway };
  start.outgoing = [startToGateway];
  gateway.incoming = [startToGateway];

  const gatewayToA = {
    id: 'fa',
    source: gateway,
    target: taskA,
    businessObject: { conditionExpression: { body: '${false}' } }
  };
  const gatewayToB = {
    id: 'fb',
    source: gateway,
    target: taskB,
    businessObject: { conditionExpression: { body: '${false}' } }
  };

  gateway.outgoing = [gatewayToA, gatewayToB];
  taskA.incoming = [gatewayToA];
  taskB.incoming = [gatewayToB];

  return [start, gateway, taskA, taskB, startToGateway, gatewayToA, gatewayToB];
}
