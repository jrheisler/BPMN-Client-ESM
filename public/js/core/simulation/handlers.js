export function createHandlerManager() {
  const elementHandlers = new Map();
  const handlerCleanups = new Set();
  const skipHandlerFor = new Set();

  function addHandlerCleanup(fn) {
    handlerCleanups.add(fn);
  }

  function runCleanups() {
    handlerCleanups.forEach(fn => fn());
    handlerCleanups.clear();
  }

  function markHandlerSkip(tokenId) {
    skipHandlerFor.add(tokenId);
  }

  function clearHandlerSkip(tokenId) {
    skipHandlerFor.delete(tokenId);
  }

  function shouldSkipHandler(tokenId) {
    return skipHandlerFor.has(tokenId);
  }

  function clearHandlerState(clearSkip = false) {
    runCleanups();
    if (clearSkip) {
      skipHandlerFor.clear();
    }
  }

  return {
    elementHandlers,
    addHandlerCleanup,
    clearHandlerState,
    markHandlerSkip,
    clearHandlerSkip,
    shouldSkipHandler
  };
}
