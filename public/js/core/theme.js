import { Stream, observeDOMRemoval } from './stream.js';

const FONT_STACK = "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO_STACK = "'JetBrains Mono', 'Fira Code', Consolas, monospace";

const baseFonts = {
  base: FONT_STACK,
  monospace: MONO_STACK
};

const withBpmnDefaults = (name, colors) => ({
  name,
  colors,
  fonts: { ...baseFonts },
  bpmn: {
    canvas: colors.background,
    label: { fontFamily: FONT_STACK, fill: colors.text, fontSize: '12px' },
    shape: { fill: colors.surface, stroke: colors.text, strokeWidth: 1.25 },
    connection: { stroke: colors.accent, strokeWidth: 1.5 },
    marker: { fill: colors.accent, stroke: colors.text },
    selected: { stroke: colors.accent, strokeWidth: 2 },
    palette: { background: colors.surface, text: colors.text, border: colors.border },
    quickMenu: {
      background: colors.panel,
      text: colors.text,
      hoverBackground: colors.panel2,
      hoverText: colors.text
    }
  }
});

const lightTheme = {
  name: 'Light',
  colors: {
    background: '#f6f7fb',
    foreground: '#0f172a',
    text: '#0f172a',
    muted: '#475569',
    primary: '#ffffff',
    surface: '#ffffff',
    panel: '#eef1f6',
    panel2: '#e2e8f0',
    border: '#cbd5e1',
    accent: '#2563eb',
    accent2: '#d946ef',
    ok: '#16a34a',
    warn: '#d97706',
    err: '#dc2626'
  },
  fonts: { ...baseFonts },
  bpmn: {
    canvas: '#f6f7fb',
    label: { fontFamily: FONT_STACK, fill: '#0f172a', fontSize: '12px' },
    shape: { fill: '#ffffff', stroke: '#0f172a', strokeWidth: 1.25 },
    connection: { stroke: '#2563eb', strokeWidth: 1.5 },
    marker: { fill: '#2563eb', stroke: '#0f172a' },
    selected: { stroke: '#2563eb', strokeWidth: 2 },
    palette: { background: '#ffffff', text: '#0f172a', border: '#cbd5e1' },
    quickMenu: { background: '#ffffff', text: '#0f172a', hoverBackground: '#e2e8f0', hoverText: '#0f172a' }
  }
};

const darkTheme = {
  name: 'Dark',
  colors: {
    background: '#0f172a',
    foreground: '#e2e8f0',
    text: '#e2e8f0',
    muted: '#94a3b8',
    primary: '#111827',
    surface: '#111827',
    panel: '#1f2937',
    panel2: '#111827',
    border: '#334155',
    accent: '#60a5fa',
    accent2: '#c084fc',
    ok: '#34d399',
    warn: '#f59e0b',
    err: '#f87171'
  },
  fonts: { ...baseFonts },
  bpmn: {
    canvas: '#0f172a',
    label: { fontFamily: FONT_STACK, fill: '#e2e8f0', fontSize: '12px' },
    shape: { fill: '#111827', stroke: '#e2e8f0', strokeWidth: 1.25 },
    connection: { stroke: '#60a5fa', strokeWidth: 1.5 },
    marker: { fill: '#60a5fa', stroke: '#e2e8f0' },
    selected: { stroke: '#60a5fa', strokeWidth: 2 },
    palette: { background: '#111827', text: '#e2e8f0', border: '#334155' },
    quickMenu: { background: '#1f2937', text: '#e2e8f0', hoverBackground: '#0f172a', hoverText: '#e2e8f0' }
  }
};

const auroraLight = withBpmnDefaults('Aurora Light', {
  background: '#f3f5ff',
  foreground: '#0b1224',
  text: '#0b1224',
  muted: '#475569',
  primary: '#f8f9ff',
  surface: '#f8f9ff',
  panel: '#e8edff',
  panel2: '#dfe7ff',
  border: '#c7d2fe',
  accent: '#6366f1',
  accent2: '#22d3ee',
  ok: '#16a34a',
  warn: '#d97706',
  err: '#dc2626'
});

const auroraDark = withBpmnDefaults('Aurora Dark', {
  background: '#0b1221',
  foreground: '#e0f2fe',
  text: '#e0f2fe',
  muted: '#94a3b8',
  primary: '#0f172a',
  surface: '#0f172a',
  panel: '#111827',
  panel2: '#0b1221',
  border: '#1f2937',
  accent: '#22d3ee',
  accent2: '#a855f7',
  ok: '#34d399',
  warn: '#f59e0b',
  err: '#f87171'
});

const moonlitLight = withBpmnDefaults('Moonlit Light', {
  background: '#edf2ff',
  foreground: '#0c1229',
  text: '#0c1229',
  muted: '#475569',
  primary: '#f7f9ff',
  surface: '#f7f9ff',
  panel: '#e5edff',
  panel2: '#d9e4ff',
  border: '#c3dafe',
  accent: '#3b82f6',
  accent2: '#6366f1',
  ok: '#16a34a',
  warn: '#d97706',
  err: '#dc2626'
});

const moonlitDark = withBpmnDefaults('Moonlit Dark', {
  background: '#0b132b',
  foreground: '#e2e8f0',
  text: '#e2e8f0',
  muted: '#94a3b8',
  primary: '#0f1a36',
  surface: '#0f1a36',
  panel: '#111f3d',
  panel2: '#0b132b',
  border: '#1f2a44',
  accent: '#60a5fa',
  accent2: '#a5b4fc',
  ok: '#34d399',
  warn: '#f59e0b',
  err: '#f87171'
});

const desertLight = withBpmnDefaults('Desert Light', {
  background: '#f7f1e3',
  foreground: '#3b2f1b',
  text: '#3b2f1b',
  muted: '#6b5a3c',
  primary: '#fffaf0',
  surface: '#fffaf0',
  panel: '#f2e8d8',
  panel2: '#e8dcc5',
  border: '#d6c6a5',
  accent: '#d97706',
  accent2: '#b45309',
  ok: '#15803d',
  warn: '#d97706',
  err: '#b91c1c'
});

const desertDark = withBpmnDefaults('Desert Dark', {
  background: '#1f160b',
  foreground: '#f8f5ec',
  text: '#f8f5ec',
  muted: '#d6c3a4',
  primary: '#2a1c0f',
  surface: '#2a1c0f',
  panel: '#332110',
  panel2: '#1f160b',
  border: '#4a3418',
  accent: '#f59e0b',
  accent2: '#d97706',
  ok: '#22c55e',
  warn: '#f59e0b',
  err: '#fca5a5'
});

const emberLight = withBpmnDefaults('Ember Light', {
  background: '#fff7f5',
  foreground: '#3c0d0d',
  text: '#3c0d0d',
  muted: '#7f1d1d',
  primary: '#fff3f0',
  surface: '#fff3f0',
  panel: '#ffe5de',
  panel2: '#ffd9d0',
  border: '#fbb8a9',
  accent: '#ef4444',
  accent2: '#fb923c',
  ok: '#16a34a',
  warn: '#f97316',
  err: '#b91c1c'
});

const emberDark = withBpmnDefaults('Ember Dark', {
  background: '#1a0b0b',
  foreground: '#fee2e2',
  text: '#fee2e2',
  muted: '#fca5a5',
  primary: '#2b0f0f',
  surface: '#2b0f0f',
  panel: '#3b0f0f',
  panel2: '#1a0b0b',
  border: '#4c1d1d',
  accent: '#f87171',
  accent2: '#fb923c',
  ok: '#22c55e',
  warn: '#fb923c',
  err: '#fca5a5'
});

const horusGoldLight = withBpmnDefaults('Horus Gold Light', {
  background: '#fffaf0',
  foreground: '#3f2c00',
  text: '#3f2c00',
  muted: '#6b4b0f',
  primary: '#fff8e1',
  surface: '#fff8e1',
  panel: '#f2e8c9',
  panel2: '#e8dcb0',
  border: '#d6c37f',
  accent: '#d4a017',
  accent2: '#b7791f',
  ok: '#15803d',
  warn: '#d97706',
  err: '#b91c1c'
});

const horusGoldDark = withBpmnDefaults('Horus Gold Dark', {
  background: '#1f1705',
  foreground: '#f7e7c3',
  text: '#f7e7c3',
  muted: '#e0c58f',
  primary: '#2a1f09',
  surface: '#2a1f09',
  panel: '#36270c',
  panel2: '#1f1705',
  border: '#4a3610',
  accent: '#f2c94c',
  accent2: '#e0a82e',
  ok: '#22c55e',
  warn: '#f59e0b',
  err: '#fca5a5'
});

export const THEMES = {
  light: lightTheme,
  dark: darkTheme,
  auroraLight,
  auroraDark,
  moonlitLight,
  moonlitDark,
  desertLight,
  desertDark,
  emberLight,
  emberDark,
  horusGoldLight,
  horusGoldDark
};

const STORAGE_KEY = 'theme.v2';
const DEFAULT_KEY = 'light';

function readStoredKey() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && THEMES[stored] ? stored : null;
  } catch (err) {
    console.warn('Unable to read stored theme key', err);
    return null;
  }
}

function persistKey(key) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch (err) {
    console.warn('Unable to persist theme selection', err);
  }
}

function resolveInitialKey() {
  const stored = readStoredKey();
  if (stored) return stored;

  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark && THEMES.dark) return 'dark';

  return DEFAULT_KEY;
}

function getThemeKey(theme) {
  const entry = Object.entries(THEMES).find(([, value]) => value === theme);
  return entry ? entry[0] : null;
}

export const currentTheme = new Stream(THEMES[resolveInitialKey()], { name: 'currentTheme' });

export function setTheme(key) {
  const next = THEMES[key] || THEMES[DEFAULT_KEY];
  currentTheme.set(next);
  const resolvedKey = getThemeKey(next);
  if (resolvedKey) persistKey(resolvedKey);
  applyThemeToPage(next);
}

export function applyThemeToPage(theme, container = typeof document !== 'undefined' ? document.body : null) {
  if (!container?.style) return;

  const colors = theme.colors;
  const fonts = theme.fonts;
  const setProp = typeof container.style.setProperty === 'function'
    ? container.style.setProperty.bind(container.style)
    : null;

  if (setProp) {
    const vars = {
      '--bg': colors.background,
      '--bg-alt': colors.panel2,
      '--panel': colors.panel,
      '--panel2': colors.panel2,
      '--text': colors.text,
      '--muted': colors.muted,
      '--accent': colors.accent,
      '--accent-2': colors.accent2,
      '--border': colors.border,
      '--ok': colors.ok,
      '--warn': colors.warn,
      '--err': colors.err,
      '--focus': colors.accent,
      '--font-base': fonts.base
    };

    Object.entries(vars).forEach(([key, value]) => setProp(key, value));
  }

  container.style.backgroundColor = colors.background;
  container.style.color = colors.text;
  container.style.fontFamily = fonts.base;
  container.style.webkitFontSmoothing = 'antialiased';
  container.style.mozOsxFontSmoothing = 'grayscale';

  const canvasHost = typeof document !== 'undefined' ? document.getElementById('canvas') : null;
  if (canvasHost) {
    canvasHost.style.fontFamily = fonts.base;
    canvasHost.style.fontWeight = '400';
  }
}

currentTheme.subscribe(theme => {
  const key = getThemeKey(theme) || DEFAULT_KEY;
  persistKey(key);
  applyThemeToPage(theme);
});

export function applyTheme(el, options = {}) {
  const {
    size = '1rem',
    weight = 'normal',
    color = null,
    background = null,
    padding = '0.5rem',
    margin = '0',
    borderRadius = '4px',
    autoDispose = false
  } = options;

  const unsubscribe = currentTheme.subscribe(theme => {
    el.style.fontSize = size;
    el.style.fontWeight = weight;
    el.style.fontFamily = theme.fonts.base;
    el.style.color = color || theme.colors.text;
    el.style.backgroundColor = background || theme.colors.surface;
    el.style.padding = padding;
    el.style.margin = margin;
    el.style.borderRadius = borderRadius;
    el.style.border = 'none';
  });

  if (autoDispose && typeof MutationObserver === 'function') {
    observeDOMRemoval(el, unsubscribe);
  }

  return unsubscribe;
}

export function themedThemeSelector(themeStream = currentTheme, options = {}) {
  const { autoDispose = true } = options;
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '0.5rem';

  const label = document.createElement('span');
  label.textContent = 'Theme:';
  label.style.fontSize = '1rem';

  const select = document.createElement('select');
  select.style.fontSize = '1rem';
  select.style.padding = '0.25rem 0.5rem';
  select.style.borderRadius = '4px';

  Object.entries(THEMES).forEach(([key, theme]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = theme.name;
    select.appendChild(option);
  });

  const updateVisuals = theme => {
    const colors = theme.colors;
    const key = getThemeKey(theme) || DEFAULT_KEY;
    select.value = key;
    container.style.color = colors.text;
    container.style.fontFamily = theme.fonts.base;
    select.style.backgroundColor = colors.panel;
    select.style.color = colors.text;
    select.style.border = `1px solid ${colors.border}`;
  };

  const handleChange = () => {
    const next = THEMES[select.value] || THEMES[DEFAULT_KEY];
    themeStream.set(next);
  };

  select.addEventListener('change', handleChange);
  const unsubscribe = themeStream.subscribe(updateVisuals);
  updateVisuals(themeStream.get());

  const cleanup = () => {
    unsubscribe();
    select.removeEventListener('change', handleChange);
  };

  if (autoDispose && typeof MutationObserver === 'function') {
    observeDOMRemoval(container, cleanup);
  }

  container.appendChild(label);
  container.appendChild(select);
  return container;
}
