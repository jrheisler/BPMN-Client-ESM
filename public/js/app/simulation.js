import { createSimulation } from '../core/simulation.js';
import { createTokenListPanel } from '../components/tokenListPanel.js';
import { openFlowSelectionModal } from '../components/index.js';
import { Blockchain } from '../blockchain.js';

export function bootstrapSimulation({ modeler, currentTheme }) {
  const elementRegistry = modeler.get('elementRegistry');
  const canvas = modeler.get('canvas');
  const simulation = createSimulation({ elementRegistry, canvas });
  window.simulation = simulation;

  const tokenPanel = createTokenListPanel(simulation.tokenLogStream, currentTheme);
  document.body.appendChild(tokenPanel.el);

  if (simulation.tokenLogStream.get().length) {
    tokenPanel.show();
  }

  let blockchain;
  let processedTokens = 0;
  let blockchainPersistPromise = Promise.resolve();

  function initBlockchain() {
    tokenPanel.hide();
    blockchain = new Blockchain();
    tokenPanel.setBlockchain?.(blockchain);
    processedTokens = 0;
  }

  const origStart = simulation.start;
  simulation.start = (...args) => {
    initBlockchain();
    tokenPanel.show();
    return origStart.apply(simulation, args);
  };

  const origReset = simulation.reset;
  simulation.reset = (...args) => {
    initBlockchain();
    return origReset.apply(simulation, args);
  };

  if (tokenPanel.setDownloadHandler) {
    tokenPanel.setDownloadHandler(() => {
      const data = JSON.stringify(blockchain?.chain ?? [], null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blockchain.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  simulation.tokenLogStream.subscribe(entries => {
    if (entries.length) {
      tokenPanel.show();
    } else {
      tokenPanel.hide();
    }

    if (blockchain && entries.length > processedTokens) {
      const toPersist = entries.slice(processedTokens);
      blockchainPersistPromise = blockchainPersistPromise.then(() => {
        for (let i = 0; i < toPersist.length; i++) {
          blockchain.addBlock(toPersist[i]);
        }
        processedTokens = entries.length;
        window.dispatchEvent(new Event('blockchain-persisted'));
      });
    }
  });

  let prevTokenCount = simulation.tokenStream.get().length;
  simulation.tokenStream.subscribe(tokens => {
    if (prevTokenCount > 0 && tokens.length === 0) {
      tokenPanel.show();
      blockchainPersistPromise.then(() => tokenPanel.showDownload());
    }
    prevTokenCount = tokens.length;
  });

  simulation.pathsStream.subscribe(data => {
    if (!data) return;
    const { flows, type } = data;
    if (!flows || !flows.length) return;
    const allowMultiple = type === 'bpmn:InclusiveGateway';
    openFlowSelectionModal(flows, currentTheme, allowMultiple).subscribe(selection => {
      if (!selection) return;
      if (Array.isArray(selection)) {
        if (selection.length) simulation.step(selection.map(f => f.id));
      } else {
        simulation.step(selection.id);
      }
    });
  });

  return { simulation, tokenPanel };
}
