const { test } = require('node:test');
const assert = require('assert');
const { createSimulationInstance } = require('../helpers/simulation');

function buildSimpleDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const task = { id: 'task', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const f0 = { id: 'f0', source: start, target: task };
  start.outgoing = [f0];
  task.incoming = [f0];
  return [start, task, f0];
}

test('sequence flow receives active marker when token passes through it', () => {
  const sim = createSimulationInstance(buildSimpleDiagram(), { delay: 0 });
  const { canvas } = sim;
  canvas.added = [];
  canvas.removed = [];
  canvas.addMarker = function(id, marker) { this.added.push([id, marker]); };
  canvas.removeMarker = function(id, marker) { this.removed.push([id, marker]); };
  sim.reset();
  
  // start -> task via f0
  sim.step();
  assert.ok(canvas.added.some(([id, marker]) => id === 'f0' && marker === 'active'));

  canvas.added = [];
  canvas.removed = [];
  // task has no outgoing, token ends
  sim.step();
  assert.ok(canvas.removed.some(([id, marker]) => id === 'f0' && marker === 'active'));
});
