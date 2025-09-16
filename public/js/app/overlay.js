import { createDiagramOverlay } from '../components/index.js';

export const typeIcons = {
  'Knowledge': '📚',
  'Business': '💼',
  'Requirement': '📝',
  'Lifecycle': '🔄',
  'Measurement': '📊',
  'Condition': '⚖️',
  'Material': '🧱',
  'Role': '👤',
  'Equipment': '🛠️',
  'System': '⚙️',
  'Tool': '🧰',
  'Information': 'ℹ️'
};

window.typeIcons = typeIcons;

export function createOverlay({ nameStream, versionStream, currentTheme }) {
  return createDiagramOverlay(nameStream, versionStream, currentTheme);
}

export function setupCanvasLayout({ canvasEl, header, currentTheme }) {
  const setCanvasHeight = () => {
    if (!header) return;
    canvasEl.style.height = `calc(100vh - ${header.offsetHeight}px)`;
  };

  Object.assign(canvasEl.style, {
    flex: '1 1 auto',
    width: '100%',
    border: `1px solid ${currentTheme.get().colors.border}`
  });

  setCanvasHeight();
  window.addEventListener('resize', setCanvasHeight);

  return () => window.removeEventListener('resize', setCanvasHeight);
}

export function attachOverlay(overlayEl) {
  const container = document.querySelector('.bjs-container') || document.getElementById('canvas');
  if (!container) return null;
  if (!container.style.position) {
    container.style.position = 'relative';
  }
  container.appendChild(overlayEl);
  return container;
}
