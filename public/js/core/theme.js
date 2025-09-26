// theme.js

import { Stream } from './stream.js';

let themes = {};

export const currentTheme = new Stream({ colors: {}, fonts: {} });

function validateThemes(data) {
  const valid = {};
  if (!data || typeof data !== 'object') {
    console.warn('Theme data missing or malformed');
    return valid;
  }
  Object.entries(data).forEach(([key, theme]) => {
    if (
      theme &&
      typeof theme === 'object' &&
      typeof theme.colors === 'object' &&
      typeof theme.fonts === 'object'
    ) {
      valid[key] = theme;
    } else {
      console.warn(`Invalid theme entry for "${key}"`);
    }
  });
  return valid;
}

const themeDataPromise =
  typeof window === 'undefined' || typeof fetch !== 'function'
    ? Promise.resolve({})
    : fetch('./js/core/themes.json')
        .then(r => r.json())
        .catch(err => {
          console.error('Failed to fetch themes.json', err);
          return {};
        });

export const themesLoaded = themeDataPromise
  .then(json => {
    themes = validateThemes(json);
    const initial = getPreferredDarkTheme() || { colors: {}, fonts: {} };
    currentTheme.set(initial);
    maybeApplyThemeToPage(initial);
    return themes;
  })
  .catch(err => {
    console.error('Failed to load themes.json', err);
  });

function getThemeEntries() {
  return Object.entries(themes);
}

function getPreferredDarkTheme() {
  return themes.desertSunset || themes.dark || getThemeEntries()[0]?.[1];
}

function getPreferredLightTheme() {
  return themes.desertSunrise || themes.light || getThemeEntries()[0]?.[1];
}

function getPreferredDarkKey() {
  if (themes.desertSunset) return 'desertSunset';
  if (themes.dark) return 'dark';
  return getThemeEntries()[0]?.[0];
}

function getThemeKeyByValue(themeObj) {
  const entry = getThemeEntries().find(([, theme]) => theme === themeObj);
  return entry ? entry[0] : null;
}

export function applyTheme(el, options = {}) {
  const {
    size = '1rem',
    weight = 'normal',
    color = null,
    background = null,
    padding = '0.5rem',
    margin = '0.5rem',
    borderRadius = '4px'
  } = options;

  currentTheme.subscribe(theme => {
    el.style.fontSize = size;
    el.style.fontWeight = weight;
    el.style.color = color || theme.foreground;
    el.style.backgroundColor = background || theme.background;
    el.style.padding = padding;
    el.style.margin = margin;
    el.style.borderRadius = borderRadius;
    el.style.fontFamily = theme.font;
    el.style.border = 'none';

    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.foreground;
    document.body.style.fontFamily = theme.font;
    document.body.style.transition = 'background-color 0.3s, color 0.3s';
  });
}

export function themeToggleButton() {
  const button = document.createElement('button');
  button.textContent = '🌗 Toggle Theme';

  button.onclick = () => {
    themesLoaded.then(() => {
      const current = currentTheme.get();
      const preferredDark = getPreferredDarkTheme();
      const preferredLight = getPreferredLightTheme();
      const pair = [...new Set([preferredDark, preferredLight].filter(Boolean))];
      if (pair.length === 0) {
        console.warn('Toggle theme failed: themes not loaded');
        return;
      }
      let next;
      const currentIndex = pair.findIndex(theme => theme === current);
      if (currentIndex === -1 || pair.length === 1) {
        next = pair[0];
      } else {
        next = pair[(currentIndex + 1) % pair.length];
      }
      if (next) {
        currentTheme.set(next);
        maybeApplyThemeToPage(next);
        const nextKey = getThemeKeyByValue(next);
        if (nextKey) {
          localStorage.setItem('theme', nextKey);
        }
      }
    });
  };

  applyTheme(button, { size: '1rem', weight: 'bold' });
  return button;
}

export function themedThemeSelector(themeStream = currentTheme) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '0.5rem';

  const label = document.createElement('span');
  label.textContent = '🎨 Theme:';

  const select = document.createElement('select');

  themesLoaded.then(() => {
    Object.entries(themes).forEach(([key, theme]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = theme.name || key;
      select.appendChild(option);
    });

    const savedKey = localStorage.getItem('theme');
    const fallbackKey = getPreferredDarkKey() || getThemeEntries()[0]?.[0];
    const selectedKey = themes[savedKey] ? savedKey : fallbackKey;
    const selectedTheme =
      themes[selectedKey] || getPreferredDarkTheme() || { colors: {}, fonts: {} };
    currentTheme.set(selectedTheme);
    maybeApplyThemeToPage(selectedTheme);
    const keyToSelect = getThemeKeyByValue(selectedTheme);
    if (keyToSelect) {
      select.value = keyToSelect;
    }
  });

  function applyStyles(theme) {
    const { colors = {}, fonts = {} } = theme;

    container.style.color = colors.foreground;
    container.style.fontFamily = fonts.base;
    label.style.fontSize = '1rem';
    select.style.fontSize = '1rem';
    select.style.padding = '0.25rem 0.5rem';
    select.style.borderRadius = '4px';
    select.style.backgroundColor = colors.primary;
    select.style.color = colors.foreground;
    select.style.border = `1px solid ${colors.foreground}`;
  }

  themeStream.subscribe(theme => applyStyles(theme));

  select.onchange = () => {
    const newKey = select.value;
    const newTheme = themes[newKey];
    if (newTheme) {
      localStorage.setItem('theme', newKey);
      currentTheme.set(newTheme);
      maybeApplyThemeToPage(newTheme);
    } else {
      console.warn(`Theme "${newKey}" not found`);
    }
  };

  container.appendChild(label);
  container.appendChild(select);
  return container;
}

function shadeColor(color, percent) {
  if (!color || !color.startsWith('#')) return color;
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function deriveBgAlt(color) {
  if (!color) return color;
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const pct = luminance < 128 ? 10 : -10;
  return shadeColor(color, pct);
}

export function applyThemeToPage(theme, container = document.body) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};

  container.style.backgroundColor = colors.background || '#ffffff';
  container.style.color = colors.foreground || '#000000';
  container.style.fontFamily = fonts.base || 'sans-serif';
  container.style.transition = 'background-color 0.3s ease, color 0.3s ease';

  const vars = {
    '--bg': colors.bg || colors.background,
    '--bg-alt':
      colors['bg-alt'] ||
      colors.bgAlt ||
      deriveBgAlt(colors.background || '#ffffff'),
    '--panel': colors.panel || colors.primary,
    '--panel2': colors.panel2 || colors.surface,
    '--text': colors.text || colors.foreground,
    '--muted': colors.muted || colors.foreground,
    '--accent': colors.accent || colors.foreground,
    '--accent-2':
      colors['accent-2'] || colors.accent2 || colors.accent || colors.foreground,
    '--border': colors.border || colors.foreground,
    '--ok': colors.ok || colors.accent || colors.foreground,
    '--warn': colors.warn || colors.accent || colors.foreground,
    '--err': colors.err || colors.accent || colors.foreground
  };

  Object.entries(vars).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });

  container.style.webkitFontSmoothing = 'antialiased';
  container.style.mozOsxFontSmoothing = 'grayscale';
}

function maybeApplyThemeToPage(theme) {
  if (typeof document === 'undefined') {
    return;
  }

  const container = document.body;
  if (!container || !container.style || typeof container.style.setProperty !== 'function') {
    return;
  }

  applyThemeToPage(theme, container);
}

