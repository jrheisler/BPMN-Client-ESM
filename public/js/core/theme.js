// theme.js

let themes = {};

const currentTheme = new Stream({ colors: {}, fonts: {} });
window.currentTheme = currentTheme;

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

const themesLoaded = fetch('./js/core/themes.json')
  .then(r => r.json())
  .then(json => {
    themes = validateThemes(json);
    const initial =
      themes.dark ||
      Object.values(themes)[0] ||
      { colors: {}, fonts: {} };
    currentTheme.set(initial);
    return themes;
  })
  .catch(err => {
    console.error('Failed to load themes.json', err);
  });

window.themesLoaded = themesLoaded;

function applyTheme(el, options = {}) {
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

function themeToggleButton() {
  const button = document.createElement('button');
  button.textContent = '🌗 Toggle Theme';

  button.onclick = () => {
    themesLoaded.then(() => {
      const current = currentTheme.get();
      const next = current === themes.dark ? themes.light : themes.dark;
      if (next) {
        currentTheme.set(next);
      } else {
        console.warn('Toggle theme failed: themes not loaded');
      }
    });
  };

  applyTheme(button, { size: '1rem', weight: 'bold' });
  return button;
}

function themedThemeSelector(themeStream = currentTheme) {
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

    const savedKey = localStorage.getItem('theme') || 'dark';
    const selectedTheme =
      themes[savedKey] || themes.dark || Object.values(themes)[0];
    if (selectedTheme) {
      currentTheme.set(selectedTheme);
      applyThemeToPage(selectedTheme);
      select.value = savedKey;
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
      applyThemeToPage(newTheme);
    } else {
      console.warn(`Theme "${newKey}" not found`);
    }
  };

  container.appendChild(label);
  container.appendChild(select);
  return container;
}

function applyThemeToPage(theme, container = document.body) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};

  container.style.backgroundColor = colors.background || '#ffffff';
  container.style.color = colors.foreground || '#000000';
  container.style.fontFamily = fonts.base || 'sans-serif';
  container.style.transition = 'background-color 0.3s ease, color 0.3s ease';

  const vars = {
    '--bg': colors.bg || colors.background,
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

