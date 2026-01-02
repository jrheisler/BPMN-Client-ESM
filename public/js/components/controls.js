import { Stream, observeDOMRemoval } from '../core/stream.js';
import { currentTheme, applyTheme } from '../core/theme.js';
import { reactiveText } from './text.js';

export function toggleSwitch(stream, options = {}, themeStream = currentTheme) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = options.gap || '0.5rem';
  if (options.margin) wrapper.style.margin = options.margin;

  if (options.label) {
    const labelStream = new Stream(options.label);
    const labelEl = reactiveText(labelStream, {
      size: options.labelSize || '1rem',
      color: options.labelColor,
      monospace: options.monospace,
      italic: options.italic,
      margin: 0
    }, themeStream);
    wrapper.appendChild(labelEl);
  }

  const labelEl = document.createElement('label');
  labelEl.style.position = 'relative';
  labelEl.style.display = 'inline-block';
  labelEl.style.width = options.width || '50px';
  labelEl.style.height = options.height || '24px';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!stream.get();
  input.style.opacity = '0';
  input.style.width = '0';
  input.style.height = '0';

  const slider = document.createElement('span');
  slider.style.position = 'absolute';
  slider.style.cursor = 'pointer';
  slider.style.top = '0';
  slider.style.left = '0';
  slider.style.right = '0';
  slider.style.bottom = '0';
  slider.style.transition = '0.4s';
  slider.style.borderRadius = '24px';

  const circle = document.createElement('span');
  circle.style.position = 'absolute';
  circle.style.height = '18px';
  circle.style.width = '18px';
  circle.style.left = '3px';
  circle.style.top = '3px';
  circle.style.borderRadius = '50%';
  circle.style.transition = '0.4s';

  slider.appendChild(circle);
  labelEl.appendChild(input);
  labelEl.appendChild(slider);
  wrapper.appendChild(labelEl);

  function applyStyles(theme) {
    const colors = theme.colors || {};

    applyTheme(wrapper, options);

    const onColor = options.onColor || colors.accent || colors.primary || '#4CAF50';
    const offColor = options.offColor || colors.background || '#888';
    const knobColor = options.knobColor || '#fff';

    slider.style.backgroundColor = input.checked ? onColor : offColor;
    slider.style.border = '1px solid ' + (colors.border || 'transparent');
    circle.style.backgroundColor = knobColor;

    circle.style.transform = input.checked
      ? `translateX(${(parseInt(options.width || 50) - 26)}px)`
      : 'translateX(0)';
  }

  input.addEventListener('change', () => {
    stream.set(input.checked);
  });

  const unsub1 = stream.subscribe(val => {
    input.checked = !!val;
    applyStyles(themeStream.get());
  });

  const unsub2 = themeStream.subscribe(applyStyles);
  applyStyles(themeStream.get());

  observeDOMRemoval(el, unsub1, unsub2);

  return wrapper;
}

export function reactiveButton(labelStream, onClick, options = {}, themeStream = currentTheme) {
  const button = document.createElement('button');
  button.type = 'button';

  if (options.title) {
    button.title = options.title;
    button.setAttribute('aria-label', options.title);
  }

  function applyStyles(theme) {
    const colors = theme.colors || {};
    const fonts  = theme.fonts  || {};

    const isOutlined = options.outline;
    const isAccent   = options.accent;
    const isDisabled = button.disabled;

    button.style.fontSize      = options.size ?? '1rem';
    button.style.fontWeight    = options.weight ?? (options.bold ? 'bold' : 'normal');
    button.style.fontFamily    = fonts.base || 'sans-serif';
    button.style.padding       = options.padding ?? '0.5rem';
    button.style.margin        = options.margin ?? '0';
    button.style.borderRadius  = options.rounded ? '8px' : '4px';

    let bg = options.bg
      ?? (isOutlined
          ? 'transparent'
          : isAccent
            ? colors.accent
            : colors.primary
        );
    let fg = options.color
      ?? (isOutlined
          ? (colors.accent || colors.primary)
          : colors.foreground
        );

    if (isDisabled) {
      bg = colors.surface;
      fg = colors.border;
    }

    const borderColor = options.borderColor || colors.border || fg;

    button.style.border        = `2px solid ${borderColor}`;
    button.style.textTransform = options.uppercase
      ? 'uppercase'
      : options.lowercase
      ? 'lowercase'
      : options.capitalize
      ? 'capitalize'
      : 'none';

    button.style.backgroundColor = bg;
    button.style.color           = fg;
    button.style.cursor          = isDisabled ? 'not-allowed' : 'pointer';
    button.style.transition      = 'all 0.3s ease';

    if (options.width)  button.style.width  = options.width;
  }

  function setDisabled(flag) {
    button.disabled = Boolean(flag);
    applyStyles(themeStream.get());
  }

  function setVisible(flag) {
    button.style.display = flag ? '' : 'none';
  }

  if (options.visible instanceof Stream) {
    setVisible(options.visible.get());
    options.visible.subscribe(setVisible);
  } else {
    setVisible(options.visible !== false);
  }

  if (options.disabled instanceof Stream) {
    setDisabled(options.disabled.get());
    options.disabled.subscribe(setDisabled);
  } else {
    setDisabled(options.disabled);
  }

  button.addEventListener('click', () => {
    if (!button.disabled) {
      onClick();
    }
  });

  const unsubLabel = labelStream.subscribe(value => {
    button.textContent = value;
  });

  const unsubTheme = themeStream.subscribe(theme => {
    applyStyles(theme);
  });

  applyStyles(themeStream.get());

  observeDOMRemoval(button, unsubLabel, unsubTheme);

  return button;
}

export function openFlowSelectionModal(flows, themeStream = currentTheme, allowMultiple = false) {
  const items = flows.map(f => ('flow' in f ? f : { flow: f, satisfied: true }));
  const pickStream = new Stream(null);

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    minWidth: '300px',
    maxHeight: '80vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  });

  const title = document.createElement('h3');
  title.textContent = 'Select Next Node';
  content.appendChild(title);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '0.5rem';
  content.appendChild(list);

  items.forEach(({ flow, satisfied }) => {
    const label = document.createElement('label');
    Object.assign(label.style, {
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    });

    const input = document.createElement('input');
    input.type = allowMultiple ? 'checkbox' : 'radio';
    input.name = 'flowSelection';

    const span = document.createElement('span');
    span.textContent = flow.target?.businessObject?.name || flow.target?.id;

    const expr = flow.businessObject?.conditionExpression;
    const condText = expr ? expr.body || expr.value : 'default';
    const condSpan = document.createElement('span');
    condSpan.textContent = ` — ${condText}`;
    condSpan.style.fontSize = '0.8em';
    condSpan.style.opacity = '0.7';

    span.appendChild(condSpan);

    if (!satisfied) {
      const unsat = document.createElement('span');
      unsat.textContent = ' (unsatisfied)';
      unsat.style.color = 'red';
      unsat.style.fontSize = '0.8em';
      span.appendChild(unsat);
    }

    label.appendChild(input);
    label.appendChild(span);
    list.appendChild(label);
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Confirm';
  confirmBtn.style.marginTop = '1rem';
  confirmBtn.addEventListener('click', () => {
    const selected = [];
    list.querySelectorAll('input').forEach((input, idx) => {
      if (input.checked) selected.push(items[idx].flow);
    });
    pickStream.set(allowMultiple ? selected : selected[0] || null);
    modal.remove();
  });
  content.appendChild(confirmBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);

  const applyStyles = theme => {
    const { colors, fonts } = theme;
    content.style.backgroundColor = colors.surface || '#fff';
    content.style.color = colors.foreground || '#000';
    content.style.fontFamily = fonts.base || 'sans-serif';
    Array.from(list.children).forEach(child => {
      child.style.backgroundColor = colors.primary || '#f9f9f9';
      child.style.border = `1px solid ${colors.border || '#ccc'}`;
      child.onmouseover = () => child.style.backgroundColor = colors.accent + '55';
      child.onmouseout = () => child.style.backgroundColor = colors.primary || '#f9f9f9';
    });
    confirmBtn.style.backgroundColor = colors.primary || '#f9f9f9';
    confirmBtn.style.border = `1px solid ${colors.border || '#ccc'}`;
    confirmBtn.onmouseover = () => confirmBtn.style.backgroundColor = colors.accent + '55';
    confirmBtn.onmouseout = () => confirmBtn.style.backgroundColor = colors.primary || '#f9f9f9';
  };

  themeStream.subscribe(applyStyles);
  applyStyles(themeStream.get());

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      pickStream.set([]);
      modal.remove();
    }
  });

  return pickStream;
}

export function gridView(dataStream, options = {}, themeStream = currentTheme) {
  const wrapper = document.createElement('div');
  wrapper.style.overflowX = 'auto';
  wrapper.style.width = '100%';

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.width = 'max-content';
  wrapper.appendChild(table);

  let selectedRowIndex = null;

  function renderGrid(data = [], theme = {}) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};
    const firstRow = Array.isArray(data) && data.length > 0 ? data[0] : {};
    const keys = Object.keys(firstRow);

    table.innerHTML = '';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    keys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key === 'download' ? '' : key.toUpperCase();
      th.style.padding = '0.5rem 1rem';
      th.style.fontFamily = fonts.base;
      th.style.fontWeight = 'bold';
      th.style.backgroundColor = colors.surface;
      th.style.color = colors.foreground;
      th.style.borderRight = `1px solid ${colors.border}`;
      th.style.whiteSpace = 'nowrap';
      th.style.textAlign = 'left';
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((item, rowIndex) => {
      const row = document.createElement('tr');
      if (rowIndex === selectedRowIndex) {
        row.style.backgroundColor = colors.accent;
      }
      keys.forEach((key, colIndex) => {
        const td = document.createElement('td');
        td.textContent = item[key];
        td.style.padding = '0.5rem 1rem';
        td.style.borderRight = `1px solid ${colors.border}`;
        td.style.borderTop = `1px solid ${colors.border}`;
        td.style.fontFamily = fonts.base;
        td.style.color = colors.foreground;
        td.style.whiteSpace = 'nowrap';
        row.appendChild(td);
      });

      row.addEventListener('click', () => {
        selectedRowIndex = rowIndex;
        if (options.onSelect) options.onSelect(item);
        renderGrid(data, theme);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
  }

  dataStream.subscribe(data => renderGrid(data, themeStream.get()));
  themeStream.subscribe(theme => renderGrid(dataStream.get(), theme));
  renderGrid(dataStream.get(), themeStream.get());

  return wrapper;
}

export function avatarDropdown(stream, options = {}, themeStream = currentTheme, menuItems = []) {
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.display = 'inline-block';

  const img = document.createElement('img');

  function applyStyles(theme) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};

    img.style.width = options.width || '50px';
    img.style.height = options.height || '50px';
    img.style.objectFit = options.fit || 'cover';
    img.style.borderRadius = options.rounded ? '50%' : options.borderRadius || '8px';
    img.style.border = options.border || `1px solid ${colors.border || '#ccc'}`;
    img.style.backgroundColor = options.bg || 'transparent';
    img.style.cursor = 'pointer';
    if (options.margin) img.style.margin = options.margin;
  }

  const menu = document.createElement('div');
  menu.style.position = 'absolute';
  menu.style.top = '100%';
  menu.style.left = '0';
  menu.style.zIndex = '1000';
  menu.style.display = 'none';
  menu.style.minWidth = '250px';
  menu.style.background = '#fff';
  menu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
  menu.style.borderRadius = '4px';
  menu.style.padding = '0.5rem 0';
  menu.style.overflow = 'hidden';

  function applyMenuStyles(theme) {
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};
    menu.style.background = colors.surface || '#fff';
    menu.style.color = colors.foreground || '#000';
    menu.style.fontFamily = fonts.base || 'sans-serif';
  }

  menuItems.forEach(item => {
    const div = document.createElement('div');

    function updateLabel(value) {
      div.textContent = value;
    }

    if (typeof item.label === 'function') {
      updateLabel(item.label());
    } else if (item.label?.subscribe) {
      updateLabel(item.label.get());
      const unsub = item.label.subscribe(updateLabel);
      observeDOMRemoval(div, unsub);
    } else {
      updateLabel(item.label);
    }

    div.style.padding = '0.5rem 1rem';
    div.style.cursor = 'pointer';
    div.style.userSelect = 'none';

    div.addEventListener('click', e => {
      e.stopPropagation();
      item.onClick?.();
      menu.style.display = 'none';
    });

    div.addEventListener('mouseenter', () => div.style.background = '#eee');
    div.addEventListener('mouseleave', () => div.style.background = 'transparent');

    menu.appendChild(div);
  });

  img.addEventListener('click', e => {
    e.stopPropagation();
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
  });

  window.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  const unsub1 = stream.subscribe(src => {
    img.src = src;
  });

  const unsub2 = themeStream.subscribe(theme => {
    applyStyles(theme);
    applyMenuStyles(theme);
  });

  applyStyles(themeStream.get());
  applyMenuStyles(themeStream.get());

  observeDOMRemoval(container, unsub1, unsub2);
  container.appendChild(img);
  container.appendChild(menu);

  return container;
}

export function showConfirmationDialog(message, themeStream = currentTheme) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: 0.3s;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-sizing: border-box;
    `;

    const text = document.createElement('p');
    text.textContent = message;
    content.appendChild(text);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      margin-top: 20px;
      display: flex;
      justify-content: space-evenly;
    `;

    const okButton = reactiveButton(new Stream('OK'), () => {
      resolve(true);
      document.body.removeChild(modal);
    }, {
      size: '1rem',
      padding: '0.5rem 1rem',
      bg: '#4CAF50',
      color: '#fff',
      rounded: true,
      outline: true
    }, themeStream);

    const cancelButton = reactiveButton(new Stream('Cancel'), () => {
      resolve(false);
      document.body.removeChild(modal);
    }, {
      size: '1rem',
      padding: '0.5rem 1rem',
      bg: '#f44336',
      color: '#fff',
      rounded: true,
      outline: true
    }, themeStream);

    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(cancelButton);
    content.appendChild(buttonContainer);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const applyModalStyles = (theme) => {
      const { colors, fonts } = theme;
      content.style.backgroundColor = colors.surface || '#fff';
      content.style.color = colors.foreground || '#000';
      content.style.fontFamily = fonts.base || 'sans-serif';

      okButton.style.backgroundColor = colors.primary || '#4CAF50';
      cancelButton.style.backgroundColor = colors.accent || '#f44336';
    };

    themeStream.subscribe(applyModalStyles);
    applyModalStyles(themeStream.get());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        resolve(false);
        document.body.removeChild(modal);
      }
    });

    const applyResponsiveStyles = () => {
      if (window.innerWidth <= 600) {
        content.style.maxWidth = '90%';
      } else {
        content.style.maxWidth = '400px';
      }
    };

    window.addEventListener('resize', applyResponsiveStyles);
    applyResponsiveStyles();
  });
}

export function showToast(message, {
  duration = 3000,
  themeStream = currentTheme,
  type = 'info'
} = {}) {
  const theme = themeStream.get();
  const toast = document.createElement('div');

  const typeColors = {
    info: theme.colors.accent,
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336'
  };

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    backgroundColor: theme.colors.surface,
    color: theme.colors.foreground,
    borderLeft: `6px solid ${typeColors[type] || theme.colors.accent}`,
    borderRadius: '6px',
    padding: '1rem 1.25rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    fontFamily: theme.fonts?.base || 'sans-serif',
    zIndex: '9999',
    minWidth: '240px',
    maxWidth: '360px',
    transition: 'opacity 0.3s ease',
    opacity: '1',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  });

  const emoji = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type] || 'ℹ️';

  const icon = document.createElement('span');
  icon.textContent = emoji;
  icon.style.fontSize = '1.2rem';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
