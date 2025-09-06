const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSimulation(extra = {}) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, val) { this._data[key] = String(val); },
      removeItem(key) { delete this._data[key]; }
    },
    ...extra
  };
  const streamCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/core/stream.js'), 'utf8');
  const simulationCode = fs.readFileSync(path.resolve(__dirname, '../../public/js/core/simulation.js'), 'utf8');
  vm.runInNewContext(streamCode, sandbox);
  vm.runInNewContext(simulationCode, sandbox);
  return sandbox;
}

function createSimulationInstance(elements, opts = {}, sandbox, context) {
  const env = sandbox || loadSimulation();
  const map = new Map(elements.map(e => [e.id, e]));
  const elementRegistry = {
    get(id) { return map.get(id); },
    filter(fn) { return Array.from(map.values()).filter(fn); }
  };
  for (const el of map.values()) {
    if (!el.type && el.source && el.target) {
      el.type = 'bpmn:SequenceFlow';
    }
  }
  const canvas = { addMarker() {}, removeMarker() {} };
  const config = { elementRegistry, canvas };
  if (context !== undefined) {
    config.context = context;
  }
  const sim = env.createSimulation(config, opts);
  sim.canvas = canvas;
  return sim;
}

module.exports = { loadSimulation, createSimulationInstance };
