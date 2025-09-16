export function createContextHelpers({ getTokens }) {
  function setContext(obj, token = getTokens()[0]) {
    if (token) {
      token.context = { ...(token.context || {}), ...obj };
    }
  }

  function getContext(token = getTokens()[0]) {
    return token ? { ...(token.context || {}) } : {};
  }

  return { setContext, getContext };
}
