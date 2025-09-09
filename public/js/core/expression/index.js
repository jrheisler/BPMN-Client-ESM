// public/js/core/expression/index.js

// Sandboxed expression evaluation helpers. Provides a very small subset of
// JavaScript syntax for boolean, comparison and arithmetic operators and can
// additionally evaluate basic FEEL expressions used in BPMN diagrams.

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
        if (missingValue !== undefined) return missingValue;
        throw new Error('Unknown variable: ' + node.name);
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

function evalFeel(expression, context) {
  const jsExpr = expression
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/(?<![<>=!])=(?!=)/g, '===');
  return safeEval(jsExpr, context);
}

export function evaluate(expr, context = {}, language = 'javascript') {
  const lang = (language || 'javascript').toLowerCase();
  switch (lang) {
    case 'javascript':
    case 'js':
      return safeEval(expr, context);
    case 'feel':
      return evalFeel(expr, context);
    default:
      throw new Error('Unsupported expression language: ' + language);
  }
}

export { safeEval };
