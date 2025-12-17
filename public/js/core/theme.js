// theme.js

import { Stream, observeDOMRemoval } from './stream.js';

const defaultTheme = {
  name: 'Default Dark',
  colors: {
    background: '#121212',
    foreground: '#e0e0e0',
    text: '#e0e0e0',
    primary: '#1e1e1e',
    surface: '#1e1e1e',
    panel: '#1e1e1e',
    panel2: '#1a1a1a',
    border: '#666666',
    muted: '#888888',
    accent: '#bb86fc',
    accent2: '#03dac6',
    ok: '#00e676',
    warn: '#ffb300',
    err: '#ff5252',
    bg: '#121212',
    'bg-alt': '#1a1a1a'
  },
  background: '#121212',
  foreground: '#e0e0e0',
  accent: '#bb86fc',
  fonts: {
    base: 'system-ui, sans-serif',
    monospace: 'monospace'
  },
  font: 'system-ui, sans-serif'
};

const builtInThemes = { dark: defaultTheme };
let themes = { ...builtInThemes };

export const currentTheme = new Stream(defaultTheme, { name: 'currentTheme' });
export const themeLoadStatus = new Stream('loading', { name: 'themeLoadStatus' });

const THEME_STORAGE_KEY = 'theme';
const THEME_STORAGE_SCHEMA_VERSION = 1;

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function normalizeThemeEntry(key, theme) {
  if (!isPlainObject(theme)) {
    console.warn(`Invalid theme entry for "${key}"`);
    return null;
  }

  const colors = isPlainObject(theme.colors)
    ? { ...defaultTheme.colors, ...theme.colors }
    : { ...defaultTheme.colors };

  const fonts = isPlainObject(theme.fonts)
    ? { ...defaultTheme.fonts, ...theme.fonts }
    : { ...defaultTheme.fonts };

  return {
    ...theme,
    name: theme.name || key,
    colors,
    fonts,
    background: theme.background || colors.background,
    foreground: theme.foreground || colors.foreground,
    accent: theme.accent || colors.accent,
    font: theme.font || fonts.base
  };
}

function validateThemes(data) {
  const valid = {};

  if (!isPlainObject(data)) {
    console.warn('Theme data missing or malformed');
    themeLoadStatus.set('error');
    return valid;
  }

  Object.entries(data).forEach(([key, theme]) => {
    const normalized = normalizeThemeEntry(key, theme);
    if (normalized) {
      valid[key] = normalized;
    }
  });

  if (Object.keys(valid).length === 0) {
    themeLoadStatus.set('error');
  }

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
        })
        .finally(() => {
          if (themeLoadStatus.get() === 'loading') {
            themeLoadStatus.set('ready');
          }
        });

function readStoredThemeKey() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.key === 'string') {
      return parsed.key;
    }

    return typeof raw === 'string' ? raw : null;
  } catch (err) {
    console.warn('Failed to read stored theme key', err);
    return null;
  }
}

function persistThemeSelection(key) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ key, schemaVersion: THEME_STORAGE_SCHEMA_VERSION })
    );
  } catch (err) {
    console.warn('Failed to persist theme selection', err);
  }
}

function resolveInitialTheme() {
  const storedKey = readStoredThemeKey();
  const fallbackKey = getPreferredDarkKey() || getThemeEntries()[0]?.[0];
  const fallbackTheme =
    themes[fallbackKey] || getPreferredDarkTheme() || defaultTheme || getThemeEntries()[0]?.[1];

  if (storedKey && themes[storedKey]) {
    return { theme: themes[storedKey], key: storedKey };
  }

  if (storedKey && fallbackKey) {
    persistThemeSelection(fallbackKey);
  }

  return { theme: fallbackTheme, key: fallbackKey };
}

export const themesLoaded = themeDataPromise
  .then(json => {
    const validatedThemes = validateThemes(json);
    const hasValid = Object.keys(validatedThemes).length > 0;

    themes = hasValid ? { ...builtInThemes, ...validatedThemes } : { ...builtInThemes };

    if (hasValid && themeLoadStatus.get() !== 'error') {
      themeLoadStatus.set('ready');
    }

    const { theme: initial } = resolveInitialTheme();
    currentTheme.set(initial);
    maybeApplyThemeToPage(initial);
    return themes;
  })
  .catch(err => {
    console.error('Failed to load themes.json', err);
    themeLoadStatus.set('error');
    themes = { ...builtInThemes };
    currentTheme.set(defaultTheme);
    maybeApplyThemeToPage(defaultTheme);
    return themes;
  });

function getThemeEntries() {
  return Object.entries(themes);
}

function getPreferredDarkTheme() {
  return themes.desertSunset || themes.dark || defaultTheme || getThemeEntries()[0]?.[1];
}

function getPreferredLightTheme() {
  return themes.desertSunrise || themes.light || defaultTheme || getThemeEntries()[0]?.[1];
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

export function themeToggleButton(options = {}) {
  const { autoDispose = true } = options;
  const button = document.createElement('button');
  button.textContent = '🌗 Toggle Theme';

  const handleClick = () => {
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
          persistThemeSelection(nextKey);
        }
      }
    });
  };

  button.addEventListener('click', handleClick);

  const cleanup = () => {
    button.removeEventListener('click', handleClick);
  };

  button.cleanup = cleanup;
  button.teardown = cleanup;
  button.dispose = cleanup;

  if (autoDispose !== false && typeof document !== 'undefined' && typeof MutationObserver === 'function') {
    observeDOMRemoval(button, cleanup);
  }

  applyTheme(button, { size: '1rem', weight: 'bold' });
  return button;
}

export function themedThemeSelector(themeStream = currentTheme, options = {}) {
  const { autoDispose = true } = options;
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '0.5rem';

  const label = document.createElement('span');
  label.textContent = '🎨 Theme:';

  const select = document.createElement('select');

  const statusMessage = document.createElement('div');
  statusMessage.textContent = 'Theme pack failed to load. Using default theme.';
  statusMessage.className = 'theme-load-error';
  statusMessage.style.display = 'none';
  statusMessage.style.fontSize = '0.9rem';
  statusMessage.style.fontWeight = '600';
  statusMessage.style.padding = '0.35rem 0.5rem';
  statusMessage.style.borderRadius = '4px';
  statusMessage.style.whiteSpace = 'nowrap';

  themesLoaded.then(() => {
    Object.entries(themes).forEach(([key, theme]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = theme.name || key;
      select.appendChild(option);
    });

    const storedKey = readStoredThemeKey();
    const fallbackKey = getPreferredDarkKey() || getThemeEntries()[0]?.[0];
    const selectedKey = themes[storedKey] ? storedKey : fallbackKey;
    const selectedTheme =
      themes[selectedKey] || getPreferredDarkTheme() || { colors: {}, fonts: {} };

    if (storedKey && !themes[storedKey] && fallbackKey) {
      persistThemeSelection(fallbackKey);
    }

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

    statusMessage.style.backgroundColor = colors.panel2 || colors.surface || colors.background;
    statusMessage.style.border = `1px solid ${colors.err || colors.border || colors.foreground}`;
    statusMessage.style.color = colors.err || colors.foreground;
  }

  const unsubscribeTheme = themeStream.subscribe(theme => applyStyles(theme));

  const unsubscribeStatus = themeLoadStatus.subscribe(status => {
    statusMessage.style.display = status === 'error' ? 'block' : 'none';
  });

  const handleChange = () => {
    const newKey = select.value;
    const newTheme = themes[newKey];
    if (newTheme) {
      persistThemeSelection(newKey);
      currentTheme.set(newTheme);
      maybeApplyThemeToPage(newTheme);
    } else {
      console.warn(`Theme "${newKey}" not found`);
    }
  };

  select.addEventListener('change', handleChange);

  const cleanup = () => {
    unsubscribeTheme?.();
    unsubscribeStatus?.();
    select.removeEventListener('change', handleChange);
  };

  container.cleanup = cleanup;
  container.dispose = cleanup;
  container.teardown = cleanup;

  if (autoDispose !== false && typeof document !== 'undefined' && typeof MutationObserver === 'function') {
    observeDOMRemoval(container, cleanup);
  }

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(statusMessage);
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

