import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadSimulation, createSimulationInstance } from '../helpers/simulation.js';

async function loadEnvironment() {
  const sandbox = loadSimulation({
    sha256: data => crypto.createHash('sha256').update(data).digest('hex')
  });
  globalThis.localStorage = sandbox.localStorage;
  globalThis.sha256 = sandbox.sha256;
  const { Blockchain } = await import('../../public/js/blockchain.js');
  sandbox.Blockchain = Blockchain;
  return sandbox;
}

function buildDiagram() {
  const start = { id: 'start', type: 'bpmn:StartEvent', outgoing: [], incoming: [], businessObject: { $type: 'bpmn:StartEvent' } };
  const task = { id: 'task', type: 'bpmn:Task', incoming: [], outgoing: [] };
  const end = { id: 'end', type: 'bpmn:EndEvent', incoming: [], outgoing: [], businessObject: { $type: 'bpmn:EndEvent' } };

  const f0 = { id: 'f0', source: start, target: task };
  const f1 = { id: 'f1', source: task, target: end };
  start.outgoing = [f0];
  task.incoming = [f0];
  task.outgoing = [f1];
  end.incoming = [f1];

  return [start, task, end, f0, f1];
}

function runToCompletion(sim) {
  while (sim.tokenStream.get().length) {
    sim.step();
  }
}

test('simulation run adds blocks to blockchain', async () => {
  const sandbox = await loadEnvironment();
  const sim = createSimulationInstance(buildDiagram(), { delay: 0 }, sandbox);
  const blockchain = new sandbox.Blockchain();
  let processed = 0;
  sim.tokenLogStream.subscribe(entries => {
    for (let i = processed; i < entries.length; i++) {
      blockchain.addBlock(entries[i]);
    }
    processed = entries.length;
  });
  sim.reset();
  runToCompletion(sim);
  assert.strictEqual(blockchain.chain[0].data.genesis, true);
  assert.strictEqual(blockchain.chain.length, sim.tokenLogStream.get().length + 1);
});

test('resetting simulation and blockchain starts fresh chain', async () => {
  const sandbox = await loadEnvironment();
  const sim = createSimulationInstance(buildDiagram(), { delay: 0 }, sandbox);
  const blockchain = new sandbox.Blockchain();
  let processed = 0;
  sim.tokenLogStream.subscribe(entries => {
    for (let i = processed; i < entries.length; i++) {
      blockchain.addBlock(entries[i]);
    }
    processed = entries.length;
  });
  // First run
  sim.reset();
  runToCompletion(sim);
  assert.ok(blockchain.chain.length > 1);

  // Reset both simulation and blockchain
  blockchain.reset();
  processed = 0;
  assert.strictEqual(blockchain.chain.length, 1); // genesis only
  sim.reset();
  runToCompletion(sim);
  assert.strictEqual(blockchain.chain[0].data.genesis, true);
  assert.strictEqual(blockchain.chain.length, sim.tokenLogStream.get().length + 1);
});

