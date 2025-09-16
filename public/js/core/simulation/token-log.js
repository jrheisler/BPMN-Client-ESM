const TOKEN_LOG_STORAGE_KEY = 'simulationTokenLog';

export function createTokenLogHelpers({
  tokenLogStream,
  tokenStream,
  elementRegistry,
  getInitialContext,
  setTokens
}) {
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
              const tokens = [
                { id: last.tokenId, element: el, context: { ...getInitialContext() } }
              ];
              setTokens(tokens);
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

  return { saveTokenLog, loadTokenLog, clearTokenLog };
}
