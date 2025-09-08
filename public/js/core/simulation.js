// public/js/core/simulation.js

import { Stream } from './stream.js';

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

export function createSimulation(services, opts = {}) {
  const { elementRegistry, canvas, context: initialContext = {} } = services;
  const delay = opts.delay || 1000;
  const conditionFallback = Object.prototype.hasOwnProperty.call(opts, 'conditionFallback')
    ? opts.conditionFallback
    : undefined;

  let sharedContext = { ...initialContext };

  function setContext(obj) {
    sharedContext = { ...sharedContext, ...obj };
    tokens.forEach(t => (t.context = sharedContext));
  }

  function getContext() {
    return sharedContext;
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
              tokens = [{ id: last.tokenId, element: el, context: sharedContext }];
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
// remember whether simulation was running before pausing for a user choice
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
    return null;
  });

  elementHandlers.set('bpmn:TimerEvent', (token, api) => {
    api.pause();
    return null;
  });

  elementHandlers.set('bpmn:MessageEvent', (token, api) => {
    api.pause();
    const to = setTimeout(() => {
      skipHandlerFor.add(token.id);
      api.resume();
    }, delay);
    api.addCleanup(() => clearTimeout(to));
    return [token];
  });

  function isManualResume(token) {
    const el = token && token.element;
    if (!el) return false;
    if (el.type === 'bpmn:UserTask') return true;
    const def = el.businessObject?.eventDefinitions?.[0];
    return def?.$type === 'bpmn:TimerEventDefinition';
  }

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
          context: sharedContext
        };
        logToken(next);
        const { tokens: resTokens, waiting } = processToken(next);
        if (waiting) {
          if (!awaitingToken) awaitingToken = next;
          generated.push(next, ...resTokens);
        } else {
          generated.push(...resTokens);
        }
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
        context: sharedContext
      };
      logToken(next);
      return [next];
    }
    logToken({ id: token.id, element: null, viaFlow: token.viaFlow });
    return [];
  }

  function handleExclusiveGateway(token, outgoing, flowId) {
    // `flowId` is the id of the chosen sequence flow (string)
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
        satisfied: evaluate(
          flow.businessObject?.conditionExpression,
          token.context
        )
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;

      // If no conditions are satisfied, pause and prompt the user to
      // select a path manually.
      if (mapped.every(f => !f.satisfied)) {
        pathsStream.set({
          flows: mapped,
          type: token.element.type,
          isDefaultOnly: false
        });
        awaitingToken = token;
        // remember running state to resume automatically once choice is made
        resumeAfterChoice = running;
        pause();
        return null;
      }

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

      const satisfied = mapped.filter(f => f.satisfied);
      if (satisfied.length === 1) {
        return handleDefault(token, [satisfied[0].flow]);
      }

      pathsStream.set({
        flows: mapped,
        type: token.element.type,
        isDefaultOnly: defaultOnly
      });
      awaitingToken = token;
      // remember running state to resume automatically once choice is made
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
        context: sharedContext
      };
      logToken(next);
      return [next];
    }

    // invalid choice -> keep waiting
    awaitingToken = token;
    return null;
  }

  function handleParallelGateway(token, outgoing) {
    return outgoing.map((flow, idx) => {
      const next = {
        id: idx === 0 ? token.id : nextTokenId++,
        element: flow.target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: sharedContext
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

    let ids = Array.isArray(flowIds) ? flowIds : flowIds ? [flowIds] : null;
    if (!ids || ids.length === 0) {
      const mapped = outgoing.map(flow => ({
        flow,
        satisfied: evaluate(flow.businessObject?.conditionExpression, token.context)
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;

      // No sequence flow satisfied -> wait for user decision
      if (mapped.every(f => !f.satisfied)) {
        pathsStream.set({ flows: mapped, type: token.element.type, isDefaultOnly: false });
        awaitingToken = token;
        // remember running state to resume automatically once choice is made
        resumeAfterChoice = running;
        pause();
        return null;
      }

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
      const satisfied = mapped.filter(f => f.satisfied);
      if (satisfied.length === 1) {
        ids = [satisfied[0].flow.id];
      } else {
        pathsStream.set({ flows: mapped, type: token.element.type, isDefaultOnly: defaultOnly });
        awaitingToken = token;
        // remember running state to resume automatically once choice is made
        resumeAfterChoice = running;
        pause();
        return null;
      }
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
          context: sharedContext
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
      // remember running state to resume automatically once choice is made
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
        context: sharedContext
      };
      logToken(next);
      return [next];
    }
    return [];
  }

  function processToken(token, flowIds) {
    // handle boundary events when token itself is boundary
    if (token.element.type === 'bpmn:BoundaryEvent' && skipHandlerFor.has(token.id)) {
      const bo = token.element.businessObject || {};
      const interrupting = bo.cancelActivity !== false;
      if (interrupting) {
        const host =
          token.element.host ||
          elementRegistry.get(bo.attachedToRef?.id) ||
          bo.attachedToRef ||
          null;
        if (host) {
          for (let i = tokens.length - 1; i >= 0; i--) {
            const t = tokens[i];
            const attached =
              t.element.type === 'bpmn:BoundaryEvent' &&
              (t.element.host === host ||
                t.element.businessObject?.attachedToRef === host ||
                t.element.businessObject?.attachedToRef?.id === host.id);
            if (t.element === host || attached) {
              if (t.id !== token.id) tokens.splice(i, 1);
            }
          }
        }
      }
    }

    // spawn boundary tokens for current element (once)
    let boundaryTokens = [];
    if (!token._boundarySpawned) {
      const boundaries = elementRegistry.filter
        ? elementRegistry.filter(
            e =>
              e.type === 'bpmn:BoundaryEvent' &&
              (e.host === token.element ||
                e.businessObject?.attachedToRef === token.element ||
                e.businessObject?.attachedToRef?.id === token.element.id)
          )
        : [];
      boundaryTokens = boundaries.map(b => {
        const next = {
          id: nextTokenId++,
          element: b,
          pendingJoins: token.pendingJoins,
          viaFlow: null,
          context: sharedContext
        };
        logToken(next);
        return next;
      });
      if (boundaryTokens.length) token._boundarySpawned = true;
    }

    const outgoing = token.element.outgoing || [];
    const sequenceFlows = outgoing.filter(f => f.type === 'bpmn:SequenceFlow');
    const messageFlows = outgoing.filter(f => f.type === 'bpmn:MessageFlow');

    const messageTokens = spawnMessageTokens(token, messageFlows);

    const extraTokens = messageTokens.concat(boundaryTokens);

    if (!skipHandlerFor.has(token.id)) {
      let handlerKey = token.element.type;
      const def = token.element.businessObject?.eventDefinitions?.[0];
      if (def) {
        const key = def.$type.replace('Definition', '');
        if (elementHandlers.has(key)) handlerKey = key;
      }
      const elHandler = elementHandlers.get(handlerKey);
      if (elHandler) {
        const api = {
          pause,
          resume,
          addCleanup: fn => handlerCleanups.add(fn),
          setContext: obj => setContext(obj),
          getContext: () => getContext()
        };
        const res = elHandler(token, api, flowIds);
        if (Array.isArray(res)) {
          return { tokens: messageTokens.concat(res, boundaryTokens), waiting: false };
        }
        if (res === null) {
          return { tokens: extraTokens, waiting: true };
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
        return { tokens: extraTokens, waiting: true };
      }
      return { tokens: messageTokens.concat(res, boundaryTokens), waiting: false };
    }
    if (/Gateway/.test(token.element.type)) {
      console.warn('Unknown gateway type', token.element.type);
    }
    const res = handleDefault(token, sequenceFlows);
    return { tokens: messageTokens.concat(res, boundaryTokens), waiting: false };
  }

  function step(flowIds) {
    const newTokens = [];
    const processed = new Set();

    if (awaitingToken && (!running || flowIds)) {
      if (isManualResume(awaitingToken)) {
        skipHandlerFor.add(awaitingToken.id);
      }
      const current = awaitingToken;
      // Exclusive gateways expect a single flow id string
      const chosen =
        current.element.type === 'bpmn:ExclusiveGateway'
          ? Array.isArray(flowIds)
            ? flowIds[0]
            : flowIds
          : flowIds;
      const { tokens: resTokens, waiting } = processToken(current, chosen);
      tokens = tokens.filter(t => t.id !== current.id);
      if (waiting) {
        awaitingToken = current;
        newTokens.push(current, ...resTokens);
      } else {
        awaitingToken = null;
        pathsStream.set(null);
        newTokens.push(...resTokens);
      }
    }

    if (!tokens.length && !newTokens.length) return;

    for (const token of tokens) {
      if (processed.has(token.id)) continue;
      if (awaitingToken && token.id === awaitingToken.id && !skipHandlerFor.has(token.id) && !flowIds) {
        newTokens.push(token);
        continue;
      }
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
        const merged = { id: group[0].id, element: el, context: sharedContext };
        const mergedPending = {};
        group.forEach(t => {
          if (t.pendingJoins) Object.assign(mergedPending, t.pendingJoins);
        });
        if (mergedPending[el.id]) delete mergedPending[el.id];
        if (Object.keys(mergedPending).length) {
          merged.pendingJoins = mergedPending;
        }
        const { tokens: resTokens, waiting } = processToken(merged);
        if (waiting) {
          if (!awaitingToken) awaitingToken = merged;
          newTokens.push(merged);
          newTokens.push(...resTokens);
          continue;
        }
        if (awaitingToken && merged.id === awaitingToken.id) awaitingToken = null;
        newTokens.push(...resTokens);
      } else {
        processed.add(token.id);
        const { tokens: resTokens, waiting } = processToken(token);
        if (waiting) {
          if (!awaitingToken) awaitingToken = token;
          newTokens.push(token);
          newTokens.push(...resTokens);
          continue;
        }
        if (awaitingToken && token.id === awaitingToken.id) awaitingToken = null;
        newTokens.push(...resTokens);
      }
    }

    tokens = newTokens;
    tokenStream.set(tokens);
    const runnable = tokens.some(t => !awaitingToken || t.id !== awaitingToken.id);

    if (!tokens.length) { pause(); cleanup(); return; }

    if (runnable && (running || resumeAfterChoice)) {
      running = true;
      schedule();
    } else {
      pause();
    }

    // choice resolved -> clear auto-resume state
    if (!awaitingToken) resumeAfterChoice = false;
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

    sharedContext = { ...initialContext };
    const startEl = getStart();
    const t = { id: nextTokenId++, element: startEl, viaFlow: null, context: sharedContext };
    tokens = [t];
    tokenStream.set(tokens);
    logToken(t);
    running = true;
    schedule();
  }

  function resume() {
    if (running) return;
    if (awaitingToken && isManualResume(awaitingToken)) {
      skipHandlerFor.add(awaitingToken.id);
    }
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
    sharedContext = { ...initialContext };
    const startEl = getStart();
    const t = { id: nextTokenId++, element: startEl, viaFlow: null, context: sharedContext };
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

