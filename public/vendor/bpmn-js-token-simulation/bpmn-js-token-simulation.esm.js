class SimpleEmitter {
  constructor() {
    this._listeners = Object.create(null);
  }

  on(event, fn) {
    (this._listeners[event] || (this._listeners[event] = [])).push(fn);
  }

  off(event, fn) {
    const listeners = this._listeners[event];
    if (!listeners) return;
    const idx = listeners.indexOf(fn);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  }

  emit(event, data) {
    (this._listeners[event] || []).slice().forEach(fn => fn(data));
  }
}

class TokenSimulation {
  constructor(eventBus) {
    this._eventBus = eventBus;
    this.events = new SimpleEmitter();
    this._running = false;
  }

  on(event, fn) {
    this.events.on(event, fn);
  }

  off(event, fn) {
    this.events.off(event, fn);
  }

  async start() {
    if (this._running) return;
    this._running = true;
    this.events.emit('simulation.start');
    this.events.emit('token-start', {});
    this.events.emit('token-end', {
      element: { id: 'EndEvent_Fake' },
      token: { id: 'token_1' }
    });
  }

  async stop() {
    if (!this._running) return;
    this._running = false;
    this.events.emit('simulation.stop');
  }

  async toggle() {
    if (this._running) {
      await this.stop();
    } else {
      await this.start();
    }
  }
}

TokenSimulation.$inject = ['eventBus'];

export default {
  __init__: ['tokenSimulation'],
  tokenSimulation: ['type', TokenSimulation]
};
