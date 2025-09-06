class Block {
  constructor(timestamp, data, previousHash = '') {
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.computeHash();
  }

  computeHash() {
    return sha256(this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce);
  }

  mine(difficulty) {
    const target = '0'.repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.computeHash();
    }
  }
}

class Blockchain {
  constructor(peers = []) {
    this.difficulty = 2;
    this.peers = peers;
    this.chain = [];
    this.load();
  }

  createGenesisBlock() {
    const block = new Block(Date.now(), { genesis: true }, '0');
    block.hash = block.computeHash();
    return block;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const newBlock = new Block(Date.now(), data, this.getLatestBlock().hash);
    newBlock.mine(this.difficulty);
    this.chain.push(newBlock);
    this.persist();
    this.broadcastBlock(newBlock);
  }

  isChainValid(chain = this.chain) {
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
      if (current.hash !== current.computeHash()) {
        return false;
      }
      if (current.previousHash !== previous.hash) {
        return false;
      }
    }
    return true;
  }

  resolveConflicts(otherChain) {
    if (otherChain.length > this.chain.length && this.isChainValid(otherChain)) {
      this.chain = otherChain;
      this.persist();
      return true;
    }
    return false;
  }

  persist() {
    try {
      localStorage.setItem('blockchain', JSON.stringify(this.chain));
    } catch (err) {
      console.error('Failed to persist blockchain', err);
    }
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem('blockchain'));
      if (data && Array.isArray(data) && data.length) {
        this.chain = data.map(b => Object.assign(new Block(b.timestamp, b.data, b.previousHash), { hash: b.hash, nonce: b.nonce }));
        if (!this.isChainValid(this.chain)) {
          throw new Error('Stored chain invalid');
        }
        return;
      }
    } catch (err) {
      console.warn('Starting new blockchain:', err);
    }
    this.chain = [this.createGenesisBlock()];
    this.persist();
  }

  reset() {
    this.chain = [this.createGenesisBlock()];
    this.persist();
    this.difficulty = 2;
  }

  broadcastBlock(block) {
    this.peers.forEach(url => {
      fetch(url + '/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block)
      }).catch(err => console.error('Broadcast failed', err));
    });
  }
}

window.Block = Block;
window.Blockchain = Blockchain;
