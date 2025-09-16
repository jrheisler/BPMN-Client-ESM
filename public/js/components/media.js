import { observeDOMRemoval } from '../core/stream.js';
import { currentTheme, applyTheme } from '../core/theme.js';

export function reactiveImage(stream, options = {}, themeStream = currentTheme) {
  const img = document.createElement('img');

  function applyStyles(theme) {
    const colors = theme.colors || {};

    applyTheme(img, options);

    img.style.width = options.width || '100%';
    img.style.height = options.height || 'auto';
    img.style.objectFit = options.fit || 'cover';
    img.style.borderRadius = options.rounded ? '8px' : '0';
    img.style.border = options.border || 'none';
    img.style.backgroundColor = options.bg || 'transparent';

    if (options.margin) img.style.margin = options.margin;
    if (options.display) img.style.display = options.display;
  }

  const unsub2 = stream.subscribe(src => {
    img.src = src;
  });

  const unsub1 = themeStream.subscribe(theme => applyStyles(theme));
  applyStyles(themeStream.get());

  observeDOMRemoval(img, unsub1, unsub2);

  return img;
}

export function avatarImage(stream, options = {}, themeStream = currentTheme) {
  const img = document.createElement('img');

  function applyStyles(theme) {
    const colors = theme.colors || {};

    img.style.width = options.width || '50px';
    img.style.height = options.height || '50px';
    img.style.objectFit = options.fit || 'cover';
    img.style.borderRadius = options.rounded ? '50%' : options.borderRadius || '8px';
    img.style.border = options.border || 'none';
    img.style.backgroundColor = options.bg || 'transparent';

    if (options.margin) img.style.margin = options.margin;
    if (options.display) img.style.display = options.display;
  }

  const unsub1 = stream.subscribe(src => {
    img.src = src;
  });

  const unsub2 = themeStream.subscribe(theme => applyStyles(theme));
  applyStyles(themeStream.get());

  observeDOMRemoval(img, unsub1, unsub2);

  return img;
}

export function createDiagramOverlay(nameStream, versionStream, themeStream) {
  const overlay = document.createElement('div');
  overlay.className = 'diagram-overlay';

  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '10',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    pointerEvents: 'none',
    transition: 'all 0.2s ease-in-out'
  });

  function update() {
    const theme = themeStream.get();
    overlay.style.background = theme.colors.surface;
    overlay.style.color = theme.colors.foreground;
    overlay.style.border = `1px solid ${theme.colors.border}`;
    overlay.style.fontFamily = theme.fonts.base || 'system-ui, sans-serif';

    const name = nameStream.get() || 'Untitled';
    const version = versionStream.get() || 1;
    overlay.textContent = `🕸️ ${name} — v${version}`;
  }

  nameStream.subscribe(update);
  versionStream.subscribe(update);
  themeStream.subscribe(update);
  update();

  return overlay;
}
