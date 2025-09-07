class TokenSimulation {
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._listeners = Object.create(null);
  }

  on(event, fn) {
    (this._listeners[event] || (this._listeners[event] = [])).push(fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  async start() {
    this._emit('token-start', {});
    this._emit('token-end', {
      element: { id: 'EndEvent_Fake' },
      token: { id: 'token_1' }
    });
  }
}

export default {
  __init__: ['tokenSimulation'],
  tokenSimulation: ['type', TokenSimulation]
};
