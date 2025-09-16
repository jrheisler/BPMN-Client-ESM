import { applyThemeToPage } from '../core/theme.js';

function setupHelpGuide(currentTheme) {
  const helpGuideEl = document.getElementById('help-guide');

  window.openHelpGuideModal = () => {
    if (!helpGuideEl) return;
    helpGuideEl.hidden = false;
  };

  if (!helpGuideEl) {
    return;
  }

  const iframe = helpGuideEl.querySelector('iframe');
  if (iframe) {
    const applyIframeTheme = () => {
      const body = iframe.contentDocument?.body;
      if (!body) return;

      applyThemeToPage(currentTheme.get(), body);
      currentTheme.subscribe(theme => applyThemeToPage(theme, body));
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      applyIframeTheme();
    }

    iframe.addEventListener('load', applyIframeTheme);
  }

  const helpGuideCloseBtn = document.getElementById('help-guide-close');
  if (helpGuideCloseBtn) {
    helpGuideCloseBtn.addEventListener('click', () => {
      helpGuideEl.hidden = true;
    });
  }

  helpGuideEl.addEventListener('click', e => {
    if (e.target === helpGuideEl) helpGuideEl.hidden = true;
  });
}

function setupTouchHandling() {
  document.addEventListener(
    'touchmove',
    e => {
      if (!e.target.closest('.djs-container')) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

export function setupPageScaffolding({ currentTheme }) {
  Object.assign(document.body.style, {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    margin: '0'
  });

  setupHelpGuide(currentTheme);
  setupTouchHandling();

  const canvasEl = document.getElementById('canvas');
  if (!canvasEl) {
    throw new Error('Canvas element not found');
  }

  const header = document.querySelector('header');

  document.body.appendChild(canvasEl);

  return { canvasEl, header };
}

export function createHiddenFileInput({ accept, onChange }) {
  const input = document.createElement('input');
  input.type = 'file';
  if (accept) {
    input.accept = accept;
  }
  input.style.display = 'none';
  if (onChange) {
    input.addEventListener('change', onChange);
  }
  document.body.appendChild(input);
  return input;
}
