// public/js/core/message-broker.js

export function createMessageBroker() {
  const queues = new Map();

  function getKey(name, correlation) {
    return `${name || ''}::${correlation === undefined ? '' : correlation}`;
  }

  function publish(name, correlation, payload = {}) {
    const key = getKey(name, correlation);
    let q = queues.get(key);
    if (!q) {
      q = [];
      queues.set(key, q);
    }
    q.push(payload);
  }

  function consume(name, correlation) {
    const key = getKey(name, correlation);
    const q = queues.get(key);
    if (!q || !q.length) return null;
    const msg = q.shift();
    if (!q.length) queues.delete(key);
    return msg;
  }

  function clear() {
    queues.clear();
  }

  return { publish, consume, clear };
}

