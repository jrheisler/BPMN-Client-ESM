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

// ---- Maturity: semantic token contract + diagnostics -------------------------

const TOKEN_DEFAULTS = {
  surface: '#121212',
  surfaceAlt: '#1a1a1a',
  panel: '#1e1e1e',
  panelAlt: '#1a1a1a',
  text: '#e0e0e0',
  textMuted: '#888888',
  accent: '#bb86fc',
  accent2: '#03dac6',
  ok: '#00e676',
  warn: '#ffb300',
  err: '#ff5252',
  border: '#666666',
  focusRing: '#bb86fc'
};

export const themeDiagnostics = new Stream(
  { errors: [], warnings: [], byTheme: {} },
  { name: 'themeDiagnostics' }
);

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const h = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function relLuminance({ r, g, b }) {
  const srgb = [r, g, b]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const L1 = relLuminance(a);
  const L2 = relLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function adjustTextForBackground(textColor, backgroundColor) {
  const baseText = textColor || '#000000';
  const bg = hexToRgb(backgroundColor || '');
  const tx = hexToRgb(baseText || '');

  if (!bg || !tx) return baseText;

  const bgLum = relLuminance(bg);
  // Dark backgrounds get brighter text, light backgrounds get darker text.
  const adjustPercent = bgLum < 0.5 ? 15 : -35;
  return shadeColor(baseText, adjustPercent) || baseText;
}

// ---------------------------------------------------------------------------

const builtInThemes = { dark: defaultTheme };
let themes = { ...builtInThemes };

export const currentTheme = new Stream(defaultTheme, { name: 'currentTheme' });
export const themeLoadStatus = new Stream('loading', { name: 'themeLoadStatus' });

const THEME_STORAGE_KEY = 'theme';
const THEME_STORAGE_SCHEMA_VERSION = 1;

function shadeColor(color, percent) {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) return color;
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function deriveBgAlt(color) {
  if (!color) return color;
  const num = parseInt(String(color).replace('#', ''), 16);
  if (!Number.isFinite(num)) return color;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const pct = luminance < 128 ? 10 : -10;
  return shadeColor(color, pct);
}

// Support both shapes:
// 1) { "dark": {...}, "light": {...} }
// 2) { "schemaVersion": 2, "themes": { ... } }
function unwrapThemePack(json) {
  if (!isPlainObject(json)) return {};
  if (isPlainObject(json.themes)) return json.themes;
  return json;
}

export function normalizeThemeEntry(key, theme, diagOut) {
  const warnings = [];

  if (!isPlainObject(theme)) {
    warnings.push(`Theme "${key}" is not an object; discarded.`);
    diagOut.byTheme[key] = { warnings };
    diagOut.warnings.push(...warnings);
    return null;
  }

  const colorsOk = isPlainObject(theme.colors);
  if (!colorsOk) warnings.push(`Theme "${key}" missing "colors" object; using defaults.`);

  const colors = colorsOk ? { ...defaultTheme.colors, ...theme.colors } : { ...defaultTheme.colors };
  const foregroundMissing = !colorsOk || !Object.prototype.hasOwnProperty.call(theme.colors, 'foreground');
  if (foregroundMissing) {
    colors.foreground = colors.text || TOKEN_DEFAULTS.text;
  }

  const fontsOk = isPlainObject(theme.fonts);
  if (!fontsOk) warnings.push(`Theme "${key}" missing "fonts" object; using defaults.`);

  const fonts = fontsOk ? { ...defaultTheme.fonts, ...theme.fonts } : { ...defaultTheme.fonts };

  // Semantic tokens (stable contract)
  const tokens = {
    ...TOKEN_DEFAULTS,
    surface: colors.background ?? TOKEN_DEFAULTS.surface,
    surfaceAlt: colors['bg-alt'] || colors.bgAlt || deriveBgAlt(colors.background || TOKEN_DEFAULTS.surface),
    panel: colors.panel || colors.primary || TOKEN_DEFAULTS.panel,
    panelAlt: colors.panel2 || colors.surface || TOKEN_DEFAULTS.panelAlt,
    text: colors.text || colors.foreground || TOKEN_DEFAULTS.text,
    textMuted: colors.muted || TOKEN_DEFAULTS.textMuted,
    accent: colors.accent || TOKEN_DEFAULTS.accent,
    accent2: colors['accent-2'] || colors.accent2 || colors.accent || TOKEN_DEFAULTS.accent2,
    ok: colors.ok || colors.accent || TOKEN_DEFAULTS.ok,
    warn: colors.warn || colors.accent || TOKEN_DEFAULTS.warn,
    err: colors.err || colors.accent || TOKEN_DEFAULTS.err,
    border: colors.border || colors.foreground || TOKEN_DEFAULTS.border,
    focusRing: colors.focusRing || colors.accent || TOKEN_DEFAULTS.focusRing
  };

  if (!colors.foreground || foregroundMissing) {
    colors.foreground = tokens.text || TOKEN_DEFAULTS.text;
  }

  const normalized = {
    ...theme,
    name: theme.name || key,
    colors,
    fonts,
    tokens,
    // keep your existing convenience top-level fields
    background: theme.background || colors.background,
    foreground: theme.foreground || colors.foreground,
    accent: theme.accent || colors.accent,
    font: theme.font || fonts.base
  };

  if (warnings.length) {
    diagOut.byTheme[key] = { warnings };
    diagOut.warnings.push(...warnings);
  }

  return normalized;
}

export function validateThemes(json) {
  const diag = { errors: [], warnings: [], byTheme: {} };
  const valid = {};

  const data = unwrapThemePack(json);
  if (!isPlainObject(data)) {
    diag.errors.push('Theme pack missing or malformed (expected an object).');
    themeDiagnostics.set(diag);
    themeLoadStatus.set('error');
    return valid;
  }

  Object.entries(data).forEach(([key, theme]) => {
    const normalized = normalizeThemeEntry(key, theme, diag);
    if (normalized) valid[key] = normalized;
  });

  if (Object.keys(valid).length === 0) {
    diag.errors.push('No valid themes found in theme pack; using built-in theme.');
    themeLoadStatus.set('error');
  }

  themeDiagnostics.set(diag);
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

    // legacy: plain string
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

    const { theme: initial, key } = resolveInitialTheme();

    // If stored key is unknown, reset to a safe default
    if (key && !themes[key]) {
      const safeKey = getPreferredDarkKey() || 'dark';
      persistThemeSelection(safeKey);
    }

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

// ---------- Element theming --------------------------------------------------

export function applyTheme(el, options = {}) {
  const {
    size = '1rem',
    weight = 'normal',
    color = null,
    background = null,
    padding = '0.5rem',
    margin = '0.5rem',
    borderRadius = '4px',
    autoDispose = false
  } = options;

  const shouldSkipTypography = () =>
    typeof el?.closest === 'function' && Boolean(el.closest('#canvas'));

  const unsubscribe = currentTheme.subscribe(theme => {
    el.style.fontSize = size;
    if (!shouldSkipTypography()) {
      el.style.fontWeight = weight;
      el.style.fontFamily = theme.font;
    }
    el.style.color = color || theme.foreground;
    el.style.backgroundColor = background || theme.background;
    el.style.padding = padding;
    el.style.margin = margin;
    el.style.borderRadius = borderRadius;
    el.style.border = 'none';
  });

  // Optional: attach cleanup if caller wants it
  if (autoDispose && typeof document !== 'undefined' && typeof MutationObserver === 'function') {
    observeDOMRemoval(el, unsubscribe);
  }

  return unsubscribe;
}

// ---------- UI helpers -------------------------------------------------------

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
        if (nextKey) persistThemeSelection(nextKey);
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

  const diagDetails = document.createElement('div');
  diagDetails.style.display = 'none';
  diagDetails.style.fontSize = '0.85rem';
  diagDetails.style.opacity = '0.9';
  diagDetails.style.maxWidth = '520px';
  diagDetails.style.whiteSpace = 'normal';

  themesLoaded.then(() => {
    select.innerHTML = '';
    Object.entries(themes).forEach(([key, theme]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = theme.name || key;
      select.appendChild(option);
    });

    const storedKey = readStoredThemeKey();
    const fallbackKey = getPreferredDarkKey() || getThemeEntries()[0]?.[0];
    const selectedKey = themes[storedKey] ? storedKey : fallbackKey;
    const selectedTheme = themes[selectedKey] || getPreferredDarkTheme() || { colors: {}, fonts: {} };

    if (storedKey && !themes[storedKey] && fallbackKey) {
      persistThemeSelection(fallbackKey);
    }

    currentTheme.set(selectedTheme);
    maybeApplyThemeToPage(selectedTheme);

    const keyToSelect = getThemeKeyByValue(selectedTheme);
    if (keyToSelect) select.value = keyToSelect;
  });

  function applyStyles(theme) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};

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

    diagDetails.style.backgroundColor = colors.panel2 || colors.surface || colors.background;
    diagDetails.style.border = `1px solid ${colors.border || colors.foreground}`;
    diagDetails.style.color = colors.foreground;
    diagDetails.style.padding = '0.35rem 0.5rem';
    diagDetails.style.borderRadius = '4px';
  }

  const unsubscribeTheme = themeStream.subscribe(theme => applyStyles(theme));

  const unsubscribeStatus = themeLoadStatus.subscribe(status => {
    statusMessage.style.display = status === 'error' ? 'block' : 'none';
  });

  const unsubscribeDiag = themeDiagnostics.subscribe(diag => {
    const msgs = [...(diag.errors || []), ...(diag.warnings || [])].slice(0, 6);
    if (msgs.length === 0) {
      diagDetails.style.display = 'none';
      diagDetails.textContent = '';
      return;
    }
    diagDetails.style.display = 'block';
    diagDetails.textContent = msgs.join(' ');
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
    unsubscribeDiag?.();
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
  container.appendChild(diagDetails);
  return container;
}

// ---------- Page theming (CSS variables) ------------------------------------

export function applyThemeToPage(theme, container = document.body) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  const tokens = theme.tokens || {};

  const bpmnFontFallback = "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Prefer semantic tokens when present; fall back to colors
  const t = {
    surface: tokens.surface || colors.background || '#ffffff',
    surfaceAlt: tokens.surfaceAlt || colors['bg-alt'] || colors.bgAlt || deriveBgAlt(colors.background || '#ffffff'),
    panel: tokens.panel || colors.panel || colors.primary || '#ffffff',
    panelAlt: tokens.panelAlt || colors.panel2 || colors.surface || '#ffffff',
    text: tokens.text || colors.text || colors.foreground || '#000000',
    textMuted: tokens.textMuted || colors.muted || colors.foreground || '#000000',
    accent: tokens.accent || colors.accent || colors.foreground || '#000000',
    accent2: tokens.accent2 || colors.accent2 || colors.accent || colors.foreground || '#000000',
    border: tokens.border || colors.border || colors.foreground || '#000000',
    ok: tokens.ok || colors.ok || colors.accent || colors.foreground || '#000000',
    warn: tokens.warn || colors.warn || colors.accent || colors.foreground || '#000000',
    err: tokens.err || colors.err || colors.accent || colors.foreground || '#000000',
    focusRing: tokens.focusRing || colors.focusRing || colors.accent || colors.foreground || '#000000'
  };

  const adjustedText = adjustTextForBackground(t.text, t.surface);
  const adjustedMuted = adjustTextForBackground(t.textMuted, t.surface);

  container.style.backgroundColor = t.surface;
  container.style.color = adjustedText;
  container.style.fontFamily = fonts.base || 'sans-serif';
  container.style.transition = 'background-color 0.3s ease, color 0.3s ease';

  const vars = {
    '--bg': t.surface,
    '--bg-alt': t.surfaceAlt,
    '--panel': t.panel,
    '--panel2': t.panelAlt,
    '--text': adjustedText,
    '--muted': adjustedMuted,
    '--accent': t.accent,
    '--accent-2': t.accent2,
    '--border': t.border,
    '--ok': t.ok,
    '--warn': t.warn,
    '--err': t.err,
    '--focus': t.focusRing,
    '--font-base': fonts.base || 'system-ui, sans-serif'
  };

  Object.entries(vars).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });

  container.style.webkitFontSmoothing = 'antialiased';
  container.style.mozOsxFontSmoothing = 'grayscale';

  const canvasHost = typeof document !== 'undefined'
    ? document.getElementById('canvas')
    : null;

  if (canvasHost) {
    canvasHost.style.fontFamily = fonts.base || bpmnFontFallback;
    canvasHost.style.fontWeight = '400';
    canvasHost.style.webkitFontSmoothing = '';
    canvasHost.style.mozOsxFontSmoothing = '';
  }
}

function maybeApplyThemeToPage(theme) {
  if (typeof document === 'undefined') return;

  const container = document.body;
  if (!container || !container.style || typeof container.style.setProperty !== 'function') return;

  applyThemeToPage(theme, container);
}
