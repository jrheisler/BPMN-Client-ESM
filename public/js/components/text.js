import { observeDOMRemoval } from '../core/stream.js';
import { currentTheme, applyTheme } from '../core/theme.js';

export function text(str) {
  return document.createTextNode(str);
}

export function reactiveText(stream, options = {}, themeStream = currentTheme) {
  const el = document.createElement(options.tag || 'p');

  function applyStyles(theme) {
    const fonts = theme.fonts || {};
    const colors = theme.colors || {};

    applyTheme(el, options);

    el.style.fontSize = options.size || '1rem';
    el.style.fontWeight = options.weight || 'normal';
    el.style.textAlign = options.align || 'left';
    el.style.fontStyle = options.italic ? 'italic' : 'normal';
    el.style.textDecoration = options.underline ? 'underline' : 'none';
    el.style.textTransform =
      options.uppercase ? 'uppercase' :
      options.lowercase ? 'lowercase' :
      options.capitalize ? 'capitalize' :
      'none';
    el.style.fontFamily = options.monospace ? fonts.monospace : fonts.base || 'sans-serif';
    el.style.color = options.color || colors.foreground;
    el.style.backgroundColor = options.bg || 'transparent';
    if (options.margin) el.style.margin = options.margin;
  }

  const unsub1 = stream.subscribe(value => el.textContent = value);
  const unsub2 = themeStream.subscribe(theme => applyStyles(theme));
  applyStyles(themeStream.get());

  observeDOMRemoval(el, unsub1, unsub2);

  return el;
}
