// public/js/core/simulation.js

// Simple token simulation service built on Streams
// Usage:
//   const simulation = createSimulation({ elementRegistry, canvas, context: { foo: true } }, { delay: 500 });
//   simulation.start();
//
// Handlers can be registered via `elementHandlers` to intercept elements:
//   simulation.elementHandlers.set('bpmn:UserTask', (token, api) => {
//     api.pause();
//     // async work ... then
//     api.resume();
//     return [token];
//   });

function createSimulation(services, opts = {}) {
  const { elementRegistry, canvas, context: initialContext = {} } = services;
  const delay = opts.delay || 1000;
  const conditionFallback = Object.prototype.hasOwnProperty.call(opts, 'conditionFallback')
    ? opts.conditionFallback
    : false;

  function setContext(obj, token = tokens[0]) {
    if (token) {
      token.context = { ...(token.context || {}), ...obj };
    }
  }

  function getContext(token = tokens[0]) {
    return token ? { ...(token.context || {}) } : {};
  }

  // Stream of currently active tokens [{ id, element }]
  const tokenStream = new Stream([]);
  const tokenLogStream = new Stream([]);
  // Stream of available sequence flows when waiting on a gateway decision
  const pathsStream = new Stream(null);

  const TOKEN_LOG_STORAGE_KEY = 'simulationTokenLog';

  function saveTokenLog() {
    try {
      const data = tokenLogStream.get();
      if (data && data.length) {
        localStorage.setItem(TOKEN_LOG_STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(TOKEN_LOG_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to save token log', err);
    }
  }

  function loadTokenLog() {
    try {
      const data = localStorage.getItem(TOKEN_LOG_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        tokenLogStream.set(parsed);
        if (parsed.length) {
          const last = parsed[parsed.length - 1];
          if (last.elementId) {
            const el = elementRegistry.get(last.elementId);
            if (el) {
              tokens = [{ id: last.tokenId, element: el, context: { ...initialContext } }];
              tokenStream.set(tokens);
            }
          }
        }
        saveTokenLog();
      }
    } catch (err) {
      console.warn('Failed to load token log', err);
    }
  }

  function clearTokenLog() {
    tokenLogStream.set([]);
    saveTokenLog();
  }
let timer = null;
let running = false;
let tokens = [];
let awaitingToken = null;
let resumeAfterChoice = false;
let nextTokenId = 1;

// Map of BPMN element type -> handler(token, api)
  const elementHandlers = new Map();

  // Cleanup hooks for element handlers (timeouts, listeners, ...)
  const handlerCleanups = new Set();

  // Token ids that should skip their element handler on next step
  const skipHandlerFor = new Set();

  // Visual highlighting of the active elements
  let previousElementIds = new Set();
  let previousFlowIds = new Set();
  tokenStream.subscribe(list => {
    const currentElementIds = new Set(
      list.filter(t => t.element).map(t => t.element.id)
    );
    const currentFlowIds = new Set(
      list.map(t => t.viaFlow).filter(Boolean)
    );
    previousElementIds.forEach(id => {
      if (!currentElementIds.has(id) && elementRegistry.get(id)) {
        canvas.removeMarker(id, 'active');
      }
    });
    currentElementIds.forEach(id => {
      if (!previousElementIds.has(id)) {
        canvas.addMarker(id, 'active');
      }
    });
    previousFlowIds.forEach(id => {
      if (!currentFlowIds.has(id) && elementRegistry.get(id)) {
        canvas.removeMarker(id, 'active');
      }
    });
    currentFlowIds.forEach(id => {
      if (!previousFlowIds.has(id)) {
        canvas.addMarker(id, 'active');
      }
    });
    previousElementIds = currentElementIds;
    previousFlowIds = currentFlowIds;
  });

  loadTokenLog();

  function logToken(token) {
    const el = token.element;
    const entry = {
      tokenId: token.id,
      elementId: el ? el.id : null,
      elementName: el ? el.businessObject?.name || el.name || null : null,
      flowId: token.viaFlow || null,
      timestamp: Date.now()
    };
    tokenLogStream.set([...tokenLogStream.get(), entry]);
    saveTokenLog();
  }

  function getStart() {
    const all = elementRegistry.filter
      ? elementRegistry.filter(e => e.type === 'bpmn:StartEvent' || e.businessObject?.$type === 'bpmn:StartEvent')
      : [];
    const start = all[0] || null;
    if (!start) {
      console.warn('No StartEvent found in diagram');
    }
    return start;
  }

  function schedule() {
    clearTimeout(timer);
    if (!running) return;
    timer = setTimeout(() => step(), delay);
  }

  // --- Default element handlers ---
  elementHandlers.set('bpmn:UserTask', (token, api) => {
    api.pause();
    const to = setTimeout(() => {
      skipHandlerFor.add(token.id);
      api.resume();
    }, delay);
    api.addCleanup(() => clearTimeout(to));
    return [token];
  });

  elementHandlers.set('bpmn:TimerEvent', (token, api) => {
    api.pause();
    const to = setTimeout(() => {
      skipHandlerFor.add(token.id);
      api.resume();
    }, delay);
    api.addCleanup(() => clearTimeout(to));
    return [token];
  });

  function clearHandlerState(clearSkip = false) {
    handlerCleanups.forEach(fn => fn());
    handlerCleanups.clear();
    if (clearSkip) skipHandlerFor.clear();
  }

  function cleanup() {
    clearHandlerState(true);
    awaitingToken = null;
    resumeAfterChoice = false;
    pathsStream.set(null);
    tokens = [];
    tokenStream.set(tokens);
    previousElementIds.forEach(id => {
      if (elementRegistry.get(id)) canvas.removeMarker(id, 'active');
    });
    previousFlowIds.forEach(id => {
      if (elementRegistry.get(id)) canvas.removeMarker(id, 'active');
    });
    previousElementIds = new Set();
    previousFlowIds = new Set();
  }

  function spawnMessageTokens(token, flows) {
    const generated = [];
    flows.forEach(flow => {
      const target = flow.target;
      if (target && (/Event$/.test(target.type) || /Task$/.test(target.type))) {
        const next = {
          id: nextTokenId++,
          element: target,
          pendingJoins: token.pendingJoins,
          viaFlow: flow.id,
          context: { ...token.context }
        };
        logToken(next);
        generated.push(next);
      }
    });
    return generated;
  }

  function handleDefault(token, sequenceFlows) {
    const flow = sequenceFlows[0];
    if (flow) {
      const next = {
        id: token.id,
        element: flow.target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: { ...token.context }
      };
      logToken(next);
      return [next];
    }
    logToken({ id: token.id, element: null, viaFlow: token.viaFlow });
    return [];
  }

  function handleExclusiveGateway(token, outgoing, flowId) {
    // Determine viable flows based on conditions when no flowId is provided
    if (!flowId) {
      const evaluate = (expr, data) => {
        if (!expr) return true;
        const raw = (expr.body || expr.value || '').toString().trim();
        const js = raw.replace(/^\$\{?|\}$/g, '');
        if (!js) return true;
        const proxy = new Proxy(data || {}, {
          has: () => true,
          get(target, prop) {
            if (prop === Symbol.unscopables) return undefined;
            return prop in target ? target[prop] : conditionFallback;
          }
        });
        try {
          return !!Function('context', 'with(context){ return (' + js + '); }')(proxy);
        } catch (err) {
          console.warn('Failed to evaluate condition', js, err);
          return conditionFallback;
        }
      };

      const mapped = outgoing.map(flow => ({
        flow,
        satisfied: evaluate(flow.businessObject?.conditionExpression, token.context)
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;
      let defaultOnly = false;
      if (defFlow) {
        const defEntry = mapped.find(f => f.flow === defFlow);
        const others = mapped.filter(f => f.flow !== defFlow && f.satisfied);
        if (defEntry) {
          if (others.length) {
            defEntry.satisfied = false;
          } else {
            defEntry.satisfied = true;
            defaultOnly = true;
          }
        }
      }

      pathsStream.set({ flows: mapped, type: token.element.type, isDefaultOnly: defaultOnly });
      awaitingToken = token;
      resumeAfterChoice = running;
      pause();
      return null;
    }

    // Flow was chosen explicitly
    const flow = elementRegistry.get(flowId);
    if (flow) {
      const next = {
        id: token.id,
        element: flow.target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: { ...token.context }
      };
      logToken(next);
      return [next];
    }
    return [];
  }

  function handleParallelGateway(token, outgoing) {
    return outgoing.map((flow, idx) => {
      const next = {
        id: idx === 0 ? token.id : nextTokenId++,
        element: flow.target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: { ...token.context }
      };
      logToken(next);
      return next;
    });
  }

  function findInclusiveJoin(split) {
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
        if (
          el.type === 'bpmn:InclusiveGateway' &&
          el.businessObject?.gatewayDirection === 'Converging'
        ) {
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

    // find common join ids across all paths
    let commonIds = Object.keys(pathJoins[0]);
    for (let i = 1; i < pathJoins.length; i++) {
      const ids = Object.keys(pathJoins[i]);
      commonIds = commonIds.filter(id => ids.includes(id));
    }

    if (!commonIds.length) return [];

    // select nearest joins based on maximal distance among paths
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

  function handleInclusiveGateway(token, outgoing, flowIds) {
    const direction = token.element.businessObject?.gatewayDirection;
    const incomingCount = (token.element.incoming || []).length;
    const diverging =
      outgoing.length > 1 &&
      (direction === 'Diverging' ||
        ((!direction || direction === 'Unspecified') && incomingCount <= 1));
    if (!diverging) {
      return handleDefault(token, outgoing);
    }

    const evaluate = (expr, data) => {
      if (!expr) return true;
      const raw = (expr.body || expr.value || '').toString().trim();
      const js = raw.replace(/^\$\{?|\}$/g, '');
      if (!js) return true;
      const proxy = new Proxy(data || {}, {
        has: () => true,
        get(target, prop) {
          if (prop === Symbol.unscopables) return undefined;
          return prop in target ? target[prop] : conditionFallback;
        }
      });
      try {
        return !!Function('context', 'with(context){ return (' + js + '); }')(proxy);
      } catch (err) {
        console.warn('Failed to evaluate condition', js, err);
        return conditionFallback;
      }
    };

    const ids = Array.isArray(flowIds) ? flowIds : flowIds ? [flowIds] : null;
    if (!ids || ids.length === 0) {
      const mapped = outgoing.map(flow => ({
        flow,
        satisfied: evaluate(flow.businessObject?.conditionExpression, token.context)
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;
      let defaultOnly = false;
      if (defFlow) {
        const defEntry = mapped.find(f => f.flow === defFlow);
        const others = mapped.filter(f => f.flow !== defFlow && f.satisfied);
        if (defEntry) {
          if (others.length) {
            defEntry.satisfied = false;
          } else {
            defEntry.satisfied = true;
            defaultOnly = true;
          }
        }
      }
      pathsStream.set({ flows: mapped, type: token.element.type, isDefaultOnly: defaultOnly });
      awaitingToken = token;
      resumeAfterChoice = running;
      pause();
      return null;
    }
    const joins = findInclusiveJoin(token.element);
    return ids
      .map((id, idx) => {
        const flow = elementRegistry.get(id);
        if (!flow) return null;
        if (!evaluate(flow.businessObject?.conditionExpression, token.context)) return null;
        const pendingJoins = { ...(token.pendingJoins || {}) };
        if (joins && joins.length) {
          joins.forEach(join => {
            pendingJoins[join.id] = ids.length;
          });
        }
        const next = {
          id: idx === 0 ? token.id : nextTokenId++,
          element: flow.target,
          pendingJoins,
          viaFlow: flow.id,
          context: { ...token.context }
        };
        logToken(next);
        return next;
      })
      .filter(Boolean);
  }

  function handleEventBasedGateway(token, outgoing, flowId) {
    if (!flowId) {
      pathsStream.set({ flows: outgoing, type: token.element.type });
      awaitingToken = token;
      resumeAfterChoice = running;
      pause();
      return null;
    }
    const flow = elementRegistry.get(flowId);
    if (flow) {
      const next = {
        id: token.id,
        element: flow.target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: { ...token.context }
      };
      logToken(next);
      return [next];
    }
    return [];
  }

  function processToken(token, flowIds) {
    const outgoing = token.element.outgoing || [];
    const sequenceFlows = outgoing.filter(f => f.type === 'bpmn:SequenceFlow');
    const messageFlows = outgoing.filter(f => f.type === 'bpmn:MessageFlow');

    const messageTokens = spawnMessageTokens(token, messageFlows);

    if (!skipHandlerFor.has(token.id)) {
      const elHandler = elementHandlers.get(token.element.type);
      if (elHandler) {
        const api = {
          pause,
          resume,
          addCleanup: fn => handlerCleanups.add(fn),
          setContext: obj => setContext(obj, token),
          getContext: () => getContext(token)
        };
        const res = elHandler(token, api, flowIds);
        if (Array.isArray(res)) {
          return { tokens: messageTokens.concat(res), waiting: false };
        }
      }
    } else {
      skipHandlerFor.delete(token.id);
    }

    const gatewayHandlers = {
      'bpmn:ExclusiveGateway': handleExclusiveGateway,
      'bpmn:ParallelGateway': handleParallelGateway,
      'bpmn:InclusiveGateway': handleInclusiveGateway,
      'bpmn:EventBasedGateway': handleEventBasedGateway
    };
    const gatewayHandler = gatewayHandlers[token.element.type];
    if (gatewayHandler) {
      const res = gatewayHandler(token, sequenceFlows, flowIds);
      if (res === null) {
        return { tokens: messageTokens, waiting: true };
      }
      return { tokens: messageTokens.concat(res), waiting: false };
    }
    if (/Gateway/.test(token.element.type)) {
      console.warn('Unknown gateway type', token.element.type);
    }
    const res = handleDefault(token, sequenceFlows);
    return { tokens: messageTokens.concat(res), waiting: false };
  }

  function step(flowIds) {
    if (awaitingToken) {
      const { tokens: resTokens, waiting } = processToken(awaitingToken, flowIds);
      if (waiting) return;
      tokens = tokens.filter(t => t.id !== awaitingToken.id).concat(resTokens);
      awaitingToken = null;
      pathsStream.set(null);
      tokenStream.set(tokens);
      if (!tokens.length) {
        pause();
        cleanup();
        return;
      }
      if (resumeAfterChoice) {
        resumeAfterChoice = false;
        resume();
      } else {
        schedule();
      }
      return;
    }

    if (!tokens.length) return;

    const newTokens = [];
    const processed = new Set();

    for (const token of tokens) {
      if (processed.has(token.id)) continue;
      const el = token.element;
      const incomingCount = (el.incoming || []).length;
      const type = el.type;
      if (incomingCount > 1 && (type === 'bpmn:ParallelGateway' || type === 'bpmn:InclusiveGateway')) {
        const group = tokens.filter(t => t.element.id === el.id);
        group.forEach(t => processed.add(t.id));
        const expected = group[0].pendingJoins?.[el.id] || incomingCount;
        if (group.length < expected) {
          newTokens.push(...group);
          continue;
        }
        const merged = { id: group[0].id, element: el, context: { ...group[0].context } };
        const mergedPending = {};
        group.forEach(t => {
          if (t.pendingJoins) Object.assign(mergedPending, t.pendingJoins);
          Object.assign(merged.context, t.context);
        });
        if (mergedPending[el.id]) delete mergedPending[el.id];
        if (Object.keys(mergedPending).length) {
          merged.pendingJoins = mergedPending;
        }
        const { tokens: resTokens, waiting } = processToken(merged);
        if (waiting) {
          awaitingToken = merged;
          newTokens.push(merged);
          newTokens.push(...resTokens);
          tokens = newTokens.concat(tokens.filter(t => !processed.has(t.id)));
          tokenStream.set(tokens);
          return;
        }
        newTokens.push(...resTokens);
      } else {
        processed.add(token.id);
        const { tokens: resTokens, waiting } = processToken(token);
        if (waiting) {
          awaitingToken = token;
          newTokens.push(token);
          newTokens.push(...resTokens);
          tokens = newTokens.concat(tokens.filter(t => !processed.has(t.id)));
          tokenStream.set(tokens);
          return;
        }
        newTokens.push(...resTokens);
      }
    }

    tokens = newTokens;
    tokenStream.set(tokens);
    pathsStream.set(null);

    if (!tokens.length) {
      pause();
      cleanup();
      return;
    }

    schedule();
  }

  function start() {
    if (tokens.length || running) {
      stop();
    }

    clearHandlerState();
    clearTokenLog();
    pathsStream.set(null);
    awaitingToken = null;
    previousElementIds.forEach(id => {
      if (elementRegistry.get(id)) canvas.removeMarker(id, 'active');
    });
    previousFlowIds.forEach(id => {
      if (elementRegistry.get(id)) canvas.removeMarker(id, 'active');
    });
    previousElementIds = new Set();
    previousFlowIds = new Set();

    const startEl = getStart();
    const t = { id: nextTokenId++, element: startEl, viaFlow: null, context: { ...initialContext } };
    tokens = [t];
    tokenStream.set(tokens);
    logToken(t);
    running = true;
    schedule();
  }

  function resume() {
    if (running) return;
    clearHandlerState();
    running = true;
    schedule();
  }

  function pause() {
    running = false;
    clearTimeout(timer);
    if (!tokens.length) {
      cleanup();
    }
  }

  function stop() {
    pause();
    cleanup();
  }

  function reset() {
    pause();
    cleanup();
    clearTokenLog();
    const startEl = getStart();
    const t = { id: nextTokenId++, element: startEl, viaFlow: null, context: { ...initialContext } };
    tokens = [t];
    tokenStream.set(tokens);
    logToken(t);
    pathsStream.set(null);
  }

  return {
    start,
    resume,
    pause,
    stop,
    reset,
    clearTokenLog,
    step,
    tokenStream,
    tokenLogStream,
    pathsStream,
    elementHandlers,
    setContext,
    getContext
  };
}

