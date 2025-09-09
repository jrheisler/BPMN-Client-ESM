// public/js/core/simulation.js

import { Stream } from './stream.js';

// Sandboxed expression evaluator supporting a subset of JS syntax
// (boolean, comparison and arithmetic operators). Identifiers not present
// in the provided context will cause evaluation to throw, allowing callers
// to treat missing variables according to BPMN rules.
function safeEval(expression, context = {}, missingValue) {
  const tokens = tokenize(expression);
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume(value) {
    const token = tokens[pos];
    if (!token || (value && token.value !== value)) {
      throw new Error('Unexpected token: ' + (token ? token.value : 'EOF'));
    }
    pos++;
    return token;
  }

  function parseExpression() {
    return parseLogicalOr();
  }

  function parseLogicalOr() {
    let node = parseLogicalAnd();
    while (peek() && peek().type === 'op' && peek().value === '||') {
      const op = consume('||').value;
      const right = parseLogicalAnd();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseLogicalAnd() {
    let node = parseEquality();
    while (peek() && peek().type === 'op' && peek().value === '&&') {
      const op = consume('&&').value;
      const right = parseEquality();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseEquality() {
    let node = parseComparison();
    while (
      peek() &&
      peek().type === 'op' &&
      ['==', '!=', '===', '!=='].includes(peek().value)
    ) {
      const op = consume(peek().value).value;
      const right = parseComparison();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseComparison() {
    let node = parseAdditive();
    while (
      peek() &&
      peek().type === 'op' &&
      ['<', '<=', '>', '>='].includes(peek().value)
    ) {
      const op = consume(peek().value).value;
      const right = parseAdditive();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (peek() && peek().type === 'op' && ['+', '-'].includes(peek().value)) {
      const op = consume(peek().value).value;
      const right = parseMultiplicative();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (peek() && peek().type === 'op' && ['*', '/', '%'].includes(peek().value)) {
      const op = consume(peek().value).value;
      const right = parseUnary();
      node = { type: 'Binary', op, left: node, right };
    }
    return node;
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && ['!', '+', '-'].includes(peek().value)) {
      const op = consume(peek().value).value;
      const argument = parseUnary();
      return { type: 'Unary', op, argument };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Unexpected end of expression');
    if (token.type === 'number' || token.type === 'string' || token.type === 'boolean') {
      consume();
      return { type: 'Literal', value: token.value };
    }
    if (token.type === 'identifier') {
      consume();
      return { type: 'Identifier', name: token.value };
    }
    if (token.type === 'paren' && token.value === '(') {
      consume('(');
      const expr = parseExpression();
      consume(')');
      return expr;
    }
    throw new Error('Unexpected token: ' + token.value);
  }

  function evaluate(node) {
    switch (node.type) {
      case 'Literal':
        return node.value;
      case 'Identifier':
        if (Object.prototype.hasOwnProperty.call(context, node.name)) {
          return context[node.name];
        }
        return missingValue;
      case 'Unary': {
        const val = evaluate(node.argument);
        switch (node.op) {
          case '!':
            return !val;
          case '+':
            return +val;
          case '-':
            return -val;
          default:
            throw new Error('Unknown operator: ' + node.op);
        }
      }
      case 'Binary': {
        if (node.op === '&&') {
          return evaluate(node.left) && evaluate(node.right);
        }
        if (node.op === '||') {
          return evaluate(node.left) || evaluate(node.right);
        }
        const left = evaluate(node.left);
        const right = evaluate(node.right);
        switch (node.op) {
          case '===':
            return left === right;
          case '!==':
            return left !== right;
          case '==':
            return left == right; // eslint-disable-line eqeqeq
          case '!=':
            return left != right; // eslint-disable-line eqeqeq
          case '>':
            return left > right;
          case '<':
            return left < right;
          case '>=':
            return left >= right;
          case '<=':
            return left <= right;
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            return left / right;
          case '%':
            return left % right;
          default:
            throw new Error('Unknown operator: ' + node.op);
        }
      }
      default:
        throw new Error('Unknown node type: ' + node.type);
    }
  }

  const ast = parseExpression();
  if (pos < tokens.length) {
    throw new Error('Unexpected token: ' + tokens[pos].value);
  }
  return evaluate(ast);
}

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // multi-character operators
    const op3 = input.slice(i, i + 3);
    if (op3 === '===') {
      tokens.push({ type: 'op', value: '===' });
      i += 3;
      continue;
    }
    if (op3 === '!==') {
      tokens.push({ type: 'op', value: '!==' });
      i += 3;
      continue;
    }
    const op2 = input.slice(i, i + 2);
    if (['&&', '||', '>=', '<=', '==', '!='].includes(op2)) {
      tokens.push({ type: 'op', value: op2 });
      i += 2;
      continue;
    }

    if ('><+-*/%!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < input.length) {
        const c = input[i];
        if (c === '\\') {
          str += input[i + 1];
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        str += c;
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let num = ch;
      i++;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ type: 'number', value: Number(num) });
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      let id = ch;
      i++;
      while (i < input.length && /[A-Za-z0-9_$]/.test(input[i])) {
        id += input[i++];
      }
      if (id === 'true' || id === 'false') {
        tokens.push({ type: 'boolean', value: id === 'true' });
      } else {
        tokens.push({ type: 'identifier', value: id });
      }
      continue;
    }

    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

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
  // Stream of available sequence flows when waiting on a gateway decision.
  // This acts as the signal to prompt the user for input on which path to take.
  const pathsStream = new Stream(null);

  function evaluate(expr, data) {
    if (!expr) return true;
    const raw = (expr.body || expr.value || '').toString().trim();
    const js = raw.replace(/^\$\{?|\}$/g, '');
    if (!js) return true;
    try {
      return !!safeEval(js, data || {}, conditionFallback);
    } catch (err) {
      console.warn('Failed to evaluate condition', js, err);
      return conditionFallback;
    }
  }

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

  function getStart(startId) {
    const all = elementRegistry.filter
      ? elementRegistry.filter(
          e =>
            e.type === 'bpmn:StartEvent' ||
            e.businessObject?.$type === 'bpmn:StartEvent'
        )
      : [];

    if (startId) {
      const found = elementRegistry.get(startId);
      if (
        found &&
        (found.type === 'bpmn:StartEvent' ||
          found.businessObject?.$type === 'bpmn:StartEvent')
      ) {
        return found;
      }
    }

    if (!all.length) {
      console.warn('No StartEvent found in diagram');
      return null;
    }

    if (all.length === 1) return all[0];

    const withoutIncoming = all.filter(e => !e.incoming || !e.incoming.length);
    if (withoutIncoming.length === 1) return withoutIncoming[0];

    const noneDefined = withoutIncoming.filter(
      e => !(e.businessObject?.eventDefinitions?.length)
    );

    if (noneDefined.length === 1) return noneDefined[0];

    console.warn(
      'Multiple StartEvents found in diagram. Provide start event id to start()'
    );
    return null;
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

  function parseISODuration(str) {
    const re = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const m = re.exec(str);
    if (!m) return null;
    const [, d, h, m_, s] = m;
    const days = parseFloat(d || 0);
    const hours = parseFloat(h || 0);
    const mins = parseFloat(m_ || 0);
    const secs = parseFloat(s || 0);
    return ((days * 24 + hours) * 60 + mins) * 60 * 1000 + secs * 1000;
  }

  function getTimerDelay(def) {
    const getVal = v => (v && (v.body || v.value || '').toString().trim()) || '';
    if (def.timeDuration) {
      return parseISODuration(getVal(def.timeDuration));
    }
    if (def.timeDate) {
      const ts = Date.parse(getVal(def.timeDate));
      if (!isNaN(ts)) {
        return Math.max(0, ts - Date.now());
      }
      return null;
    }
    if (def.timeCycle) {
      const expr = getVal(def.timeCycle);
      const parts = expr.split('/');
      const last = parts[parts.length - 1];
      return parseISODuration(last);
    }
    return null;
  }

  elementHandlers.set('bpmn:TimerEvent', (token, api) => {
    const def = token.element.businessObject?.eventDefinitions?.[0];
    const delayMs = def ? getTimerDelay(def) : null;
    api.pause();
    if (delayMs == null) {
      return null;
    }
    const to = setTimeout(() => {
      skipHandlerFor.add(token.id);
      api.resume();
    }, delayMs);
    api.addCleanup(() => clearTimeout(to));
    return [token];
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
    return el.type === 'bpmn:UserTask';
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
      const mapped = outgoing.map(flow => ({
        flow,
        satisfied: evaluate(
          flow.businessObject?.conditionExpression,
          token.context
        )
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;

      // If no conditions are satisfied, prompt the user to select a path
      // manually. `pathsStream` signals the UI to request input.
      if (mapped.every(f => !f.satisfied)) {
        pathsStream.set({
          flows: mapped,
          type: token.element.type,
          isDefaultOnly: false
        });
        awaitingToken = token; // keep token so the process can resume
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
      awaitingToken = token; // keep token so the process can resume
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
    let ids = Array.isArray(flowIds) ? flowIds : flowIds ? [flowIds] : null;
    if (!ids || ids.length === 0) {
      const mapped = outgoing.map(flow => ({
        flow,
        satisfied: evaluate(flow.businessObject?.conditionExpression, token.context)
      }));
      const defBo = token.element.businessObject?.default;
      const defFlow = defBo ? elementRegistry.get(defBo.id) || defBo : null;

      // No sequence flow satisfied -> wait for user decision. `pathsStream`
      // signals the UI to request input and the token is kept for resuming.
      if (mapped.every(f => !f.satisfied)) {
        pathsStream.set({ flows: mapped, type: token.element.type, isDefaultOnly: false });
        awaitingToken = token; // keep token so the process can resume
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
        awaitingToken = token; // keep token so the process can resume
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

  function handleEventBasedGateway(token, outgoing) {
    const generated = [];
    outgoing.forEach(flow => {
      const target = flow.target;
      if (!target) return;
      const next = {
        id: nextTokenId++,
        element: target,
        pendingJoins: token.pendingJoins,
        viaFlow: flow.id,
        context: sharedContext,
        gatewayOf: token.id
      };
      logToken(next);
      const { tokens: resTokens, waiting } = processToken(next);
      if (waiting) {
        if (!awaitingToken) awaitingToken = next;
        generated.push(next, ...resTokens);
      } else {
        generated.push(...resTokens);
      }
    });
    return generated;
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

    const gatewayWinners = new Map();
    for (const t of tokens) {
      if (t.gatewayOf && skipHandlerFor.has(t.id)) {
        if (!gatewayWinners.has(t.gatewayOf)) {
          gatewayWinners.set(t.gatewayOf, t.id);
        }
      }
    }
    const cancelled = new Set();
    for (const t of tokens) {
      if (t.gatewayOf) {
        const win = gatewayWinners.get(t.gatewayOf);
        if (win && t.id !== win) {
          cancelled.add(t.id);
        }
      }
    }

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
        if (resumeAfterChoice) {
          running = true;
          schedule();
        }
      }
      resumeAfterChoice = false;
    }

    if (!tokens.length && !newTokens.length) return;

    for (const token of tokens) {
      if (processed.has(token.id) || cancelled.has(token.id)) {
        skipHandlerFor.delete(token.id);
        continue;
      }
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
        if (!waiting && token.gatewayOf) {
          for (const t of tokens) {
            if (t.gatewayOf === token.gatewayOf && t.id !== token.id) {
              cancelled.add(t.id);
              processed.add(t.id);
            }
          }
        }
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

  function start(startId) {
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
    const startEl = getStart(startId);
    if (!startEl) {
      tokens = [];
      tokenStream.set(tokens);
      running = false;
      return;
    }
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

  function reset(startId) {
    pause();
    cleanup();
    clearTokenLog();
    sharedContext = { ...initialContext };
    const startEl = getStart(startId);
    if (!startEl) {
      tokens = [];
      tokenStream.set(tokens);
      pathsStream.set(null);
      return;
    }
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

