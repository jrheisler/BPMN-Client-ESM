import { observeDOMRemoval } from '../core/stream.js';
import { currentTheme, applyTheme } from '../core/theme.js';

export function editText(stream, options = {}, themeStream = currentTheme) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = stream.get();
  input.placeholder = options.placeholder || '';

  function applyStyles(theme) {
    const fonts = theme.fonts || {};
    const colors = theme.colors || {};

    applyTheme(input, options);

    input.style.fontSize = options.size || '1rem';
    input.style.width = options.width || '100%';
    input.style.fontFamily = options.monospace
      ? fonts.monospace
      : fonts.base || 'sans-serif';
    input.style.backgroundColor = options.bg || colors.primary || '#333';
    input.style.color = options.color || colors.foreground || '#eee';
    input.style.border = 'none';
    input.style.borderRadius = '4px';
    input.style.padding = options.padding || '0.5rem';
    input.style.transition = 'background-color 0.3s, color 0.3s';

    if (options.margin) input.style.margin = options.margin;
  }

  input.addEventListener('input', () => {
    stream.set(input.value);
  });

  const unsub1 = themeStream.subscribe(theme => applyStyles(theme));
  applyStyles(themeStream.get());

  const unsub2 = stream.subscribe(value => {
    if (input.value !== value) {
      input.value = value;
    }
  });

  observeDOMRemoval(input, unsub1, unsub2);

  return input;
}

export function fileInput(stream, options = {}, themeStream = currentTheme) {
  const input = document.createElement('input');
  input.type = 'file';

  function applyStyles(theme) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};

    applyTheme(input, options);

    input.style.fontSize = options.size || '1rem';
    input.style.fontFamily = fonts.base || 'sans-serif';
    input.style.backgroundColor = options.bg || colors.surface || '#f9f9f9';
    input.style.color = options.color || colors.foreground;
    input.style.border = options.border || `1px solid ${colors.border || '#ccc'}`;
    input.style.borderRadius = '4px';
    input.style.padding = options.padding || '0.4rem';
    input.style.width = options.width || '100%';
    input.style.margin = options.margin || '0.5rem 0';
  }

  const onChange = () => {
    stream.set(input.files[0] || null);
  };
  input.addEventListener('change', onChange);

  const unsubTheme = themeStream.subscribe(applyStyles);
  applyStyles(themeStream.get());

  observeDOMRemoval(
    input,
    () => input.removeEventListener('change', onChange),
    unsubTheme
  );

  return input;
}

export function dropdownStream(stream, selectOptions = [], themeStream = currentTheme) {
  const select = document.createElement('select');

  function applyStyles(theme) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};
    applyTheme(select, selectOptions);

    select.style.padding = '0.5rem';
    select.style.borderRadius = '4px';
    select.style.border = `1px solid ${colors.border || '#ccc'}`;
    select.style.fontFamily = fonts.base || 'sans-serif';
    select.style.backgroundColor = colors.surface || '#fff';
    select.style.color = colors.foreground || '#000';
    select.style.margin = selectOptions.margin || '0';
    select.style.width = selectOptions.width || '100%';
  }

  selectOptions.choices?.forEach(opt => {
    const option = document.createElement('option');

    if (typeof opt === 'string') {
      option.value = opt;
      option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
    } else if (typeof opt === 'object' && opt !== null) {
      option.value = opt.value;
      option.textContent = opt.label ?? opt.value;
    }

    select.appendChild(option);
  });

  if (!stream.get() && selectOptions.choices?.length > 0) {
    const defaultChoice = selectOptions.choices[0];
    const defaultValue = typeof defaultChoice === 'string' ? defaultChoice : defaultChoice?.value;
    stream.set(defaultValue);
    select.value = defaultValue;
  }

  const unsub1 = stream.subscribe(value => {
    if (select.value !== value) select.value = value;
  });

  select.addEventListener('change', () => {
    stream.set(select.value);
  });

  const unsub2 = themeStream.subscribe(theme => applyStyles(theme));
  applyStyles(themeStream.get());

  observeDOMRemoval(select, unsub1, unsub2);

  return select;
}

export function editableDropdown(valueStream, optionsStream, themeStream = currentTheme) {
  const wrapper = document.createElement('div');
  const select = document.createElement('select');
  const input = document.createElement('input');
  input.type = 'text';

  const baseStyles = (el, theme) => {
    const fonts = theme.fonts || {};
    const colors = theme.colors || {};

    el.style.width = '100%';
    el.style.padding = '0.5rem';
    el.style.fontSize = '1rem';
    el.style.fontFamily = fonts.base || 'sans-serif';
    el.style.backgroundColor = colors.background || '#fff';
    el.style.color = colors.foreground || '#000';
    el.style.border = `1px solid ${colors.border || '#ccc'}`;
    el.style.borderRadius = '4px';
    el.style.marginBottom = '0.5rem';
    el.style.boxSizing = 'border-box';
  };

  input.placeholder = 'Or enter new category...';

  function updateOptions(options) {
    select.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Select a Category --';
    select.appendChild(emptyOption);

    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    }
  }

  select.addEventListener('change', () => {
    valueStream.set(select.value);
  });

  input.addEventListener('input', () => {
    valueStream.set(input.value);
  });

  optionsStream.subscribe(updateOptions);

  themeStream.subscribe(theme => {
    baseStyles(select, theme);
    baseStyles(input, theme);
  });

  baseStyles(select, themeStream.get());
  baseStyles(input, themeStream.get());

  wrapper.appendChild(select);
  wrapper.appendChild(input);

  return wrapper;
}
