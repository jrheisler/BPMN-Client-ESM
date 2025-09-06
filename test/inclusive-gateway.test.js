const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSimulation() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, val) { this._data[key] = String(val); },
      removeItem(key) { delete this._data[key]; }
    }
  };
  const streamCode = fs.readFileSync(path.resolve(__dirname, '../public/js/core/stream.js'), 'utf8');
  const simulationCode = fs.readFileSync(path.resolve(__dirname, '../public/js/core/simulation.js'), 'utf8');
  vm.runInNewContext(streamCode, sandbox);
  vm.runInNewContext(simulationCode, sandbox);
  return sandbox.createSimulation;
}

function createSimulationInstance(elements, opts = {}) {
  const map = new Map(elements.map(e => [e.id, e]));
  const elementRegistry = {
    get(id) { return map.get(id); },
    filter(fn) { return Array.from(map.values()).filter(fn); }
  };
  const canvas = { addMarker() {}, removeMarker() {} };
  const createSimulation = loadSimulation();
  return createSimulation({ elementRegistry, canvas }, opts);
}

function buildDiagram(direction, outgoingCount = 1) {
  const task = { id: 'task', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const gateway = {
    id: 'gw',
    type: 'bpmn:InclusiveGateway',
    businessObject: { gatewayDirection: direction },
    incoming: [],
    outgoing: []
  };
  const start = {
    id: 'start',
    type: 'bpmn:StartEvent',
    outgoing: [],
    incoming: [],
    businessObject: { $type: 'bpmn:StartEvent' }
  };
  const flow0 = { id: 'f0', source: start, target: gateway };
  start.outgoing = [flow0];
  gateway.incoming = [flow0];

  const flows = [];
  for (let i = 0; i < outgoingCount; i++) {
    const flow = { id: `f${i + 1}`, source: gateway, target: task };
    flows.push(flow);
  }
  gateway.outgoing = flows;
  task.incoming = flows;

  return [start, gateway, task, flow0, ...flows];
}

function findInclusiveJoins(split, elementRegistry) {
  const outgoings = split.outgoing || [];
  const pathJoins = [];

  function traverse(start) {
    const joins = {};
    const queue = [{ el: start, dist: 1 }];
    const visited = new Map();
    while (queue.length) {
      const { el, dist } = queue.shift();
      const prev = visited.get(el.id);
      if (prev !== undefined && prev <= dist) continue;
      visited.set(el.id, dist);
      if (el.type === 'bpmn:InclusiveGateway' && el.businessObject?.gatewayDirection === 'Converging') {
        if (joins[el.id] === undefined || dist < joins[el.id]) {
          joins[el.id] = dist;
        }
      }
      (el.outgoing || []).forEach(flow => {
        if (flow.target) queue.push({ el: flow.target, dist: dist + 1 });
      });
    }
    return joins;
  }

  outgoings.forEach(flow => {
    if (flow.target) {
      pathJoins.push(traverse(flow.target));
    }
  });

  if (!pathJoins.length) return [];

  let commonIds = Object.keys(pathJoins[0]);
  for (let i = 1; i < pathJoins.length; i++) {
    const ids = Object.keys(pathJoins[i]);
    commonIds = commonIds.filter(id => ids.includes(id));
  }

  if (!commonIds.length) return [];

  let nearest = [];
  let minMax = Infinity;
  commonIds.forEach(id => {
    const max = Math.max(...pathJoins.map(j => j[id]));
    if (max < minMax) {
      minMax = max;
      nearest = [id];
    } else if (max === minMax) {
      nearest.push(id);
    }
  });

  return nearest.map(id => elementRegistry.get(id)).filter(Boolean);
}

function buildNestedDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const g1 = { id: 'g1', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const g2 = { id: 'g2', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const j2 = { id: 'j2', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Converging' }, incoming: [], outgoing: [] };
  const j1 = { id: 'j1', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Converging' }, incoming: [], outgoing: [] };
  const a1 = { id: 'a1', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const a2 = { id: 'a2', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const aafter = { id: 'aafter', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b1 = { id: 'b1', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const end = { id: 'end', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: g1 };
  start.outgoing = [f0];
  g1.incoming = [f0];

  const fa = { id: 'fa', source: g1, target: g2 };
  const fb = { id: 'fb', source: g1, target: b1 };
  g1.outgoing = [fa, fb];
  g2.incoming = [fa];
  b1.incoming = [fb];

  const g2a = { id: 'g2a', source: g2, target: a1 };
  const g2b = { id: 'g2b', source: g2, target: a2 };
  g2.outgoing = [g2a, g2b];
  a1.incoming = [g2a];
  a2.incoming = [g2b];

  const a1j2 = { id: 'a1j2', source: a1, target: j2 };
  const a2j2 = { id: 'a2j2', source: a2, target: j2 };
  a1.outgoing = [a1j2];
  a2.outgoing = [a2j2];
  j2.incoming = [a1j2, a2j2];

  const j2aafter = { id: 'j2aafter', source: j2, target: aafter };
  j2.outgoing = [j2aafter];
  aafter.incoming = [j2aafter];
  const aafterj1 = { id: 'aafterj1', source: aafter, target: j1 };
  aafter.outgoing = [aafterj1];
  j1.incoming = [aafterj1];

  const b1j1 = { id: 'b1j1', source: b1, target: j1 };
  b1.outgoing = [b1j1];
  j1.incoming.push(b1j1);

  const j1end = { id: 'j1end', source: j1, target: end };
  j1.outgoing = [j1end];
  end.incoming = [j1end];

  return [start, g1, g2, j2, j1, a1, a2, aafter, b1, end, f0, fa, fb, g2a, g2b, a1j2, a2j2, j2aafter, aafterj1, b1j1, j1end];
}

function buildAlternativeJoinDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const split = { id: 'split', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Diverging' }, incoming: [], outgoing: [] };
  const j1 = { id: 'j1', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Converging' }, incoming: [], outgoing: [] };
  const j2 = { id: 'j2', type: 'bpmn:InclusiveGateway', businessObject: { gatewayDirection: 'Converging' }, incoming: [], outgoing: [] };
  const a = { id: 'a', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const b = { id: 'b', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const mid = { id: 'mid', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const end = { id: 'end', type: 'bpmn:Task', incoming: [], outgoing: [] };

  const f0 = { id: 'f0', source: start, target: split };
  start.outgoing = [f0];
  split.incoming = [f0];

  const fa = { id: 'fa', source: split, target: a };
  const fb = { id: 'fb', source: split, target: b };
  split.outgoing = [fa, fb];
  a.incoming = [fa];
  b.incoming = [fb];

  const aj1 = { id: 'aj1', source: a, target: j1 };
  const bj1 = { id: 'bj1', source: b, target: j1 };
  a.outgoing = [aj1];
  b.outgoing = [bj1];
  j1.incoming = [aj1, bj1];

  const j1mid = { id: 'j1mid', source: j1, target: mid };
  j1.outgoing = [j1mid];
  mid.incoming = [j1mid];

  const midj2 = { id: 'midj2', source: mid, target: j2 };
  mid.outgoing = [midj2];
  j2.incoming = [midj2];

  const j2end = { id: 'j2end', source: j2, target: end };
  j2.outgoing = [j2end];
  end.incoming = [j2end];

  return [start, split, j1, j2, a, b, mid, end, f0, fa, fb, aj1, bj1, j1mid, midj2, j2end];
}

test('converging inclusive gateway auto forwards without confirmation', () => {
  const diagram = buildDiagram('Converging');
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // move to gateway
  sim.step(); // should auto-forward
  assert.strictEqual(sim.tokenStream.get()[0].element.id, 'task');
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('single-path diverging inclusive gateway auto forwards without confirmation', () => {
  const diagram = buildDiagram('Diverging', 1);
  const sim = createSimulationInstance(diagram, { delay: 0 });
  sim.reset();
  sim.step(); // move to gateway
  sim.step(); // should auto-forward
  assert.strictEqual(sim.tokenStream.get()[0].element.id, 'task');
  assert.strictEqual(sim.pathsStream.get(), null);
});

test('findInclusiveJoin handles nested inclusive splits', () => {
  const elements = buildNestedDiagram();
  const map = new Map(elements.map(e => [e.id, e]));
  const outerSplit = map.get('g1');
  const innerSplit = map.get('g2');
  const outerJoins = findInclusiveJoins(outerSplit, map);
  const innerJoins = findInclusiveJoins(innerSplit, map);
  assert.deepStrictEqual(outerJoins.map(j => j.id), ['j1']);
  assert.deepStrictEqual(innerJoins.map(j => j.id), ['j2']);
});

test('findInclusiveJoin selects nearest join among alternatives', () => {
  const elements = buildAlternativeJoinDiagram();
  const map = new Map(elements.map(e => [e.id, e]));
  const split = map.get('split');
  const joins = findInclusiveJoins(split, map);
  assert.deepStrictEqual(joins.map(j => j.id), ['j1']);
});
