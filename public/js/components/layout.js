function column(children = [], options = {}, themeStream = currentTheme) {
  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = options.gap || '1rem';
  el.style.alignItems = options.align || 'stretch';
  el.style.justifyContent = options.justify || 'flex-start';

  if (options.width) el.style.width = options.width;
  if (options.height) el.style.height = options.height;

  children.forEach(child => el.appendChild(child));

  themeStream.subscribe(theme => {
    if (options.bg || options.border) {
      el.style.backgroundColor = options.bg || theme.colors.primary;
      el.style.border = options.border || 'none';
      el.style.padding = options.padding || '1rem';
      el.style.borderRadius = options.radius || '0.5rem';
    }
  });

  return el;
}

function row(children = [], options = {}, themeStream = currentTheme) {
  const el = column(children, { ...options, direction: 'row' }, themeStream);

  // ensure it's a flex container
  el.style.display       = 'flex';
  el.style.flexDirection = 'row';

  // if you pass options.wrap = true, it will wrap; otherwise nowrap
  el.style.flexWrap      = options.wrap ? 'wrap' : 'nowrap';

  return el;
}


function container(child, options = {}, themeStream = currentTheme) {
  const div = document.createElement('div');

  if (Array.isArray(child)) {
    child.forEach(c => div.appendChild(c));
  } else if (child) {
    div.appendChild(child);
  }

  function applyStyles(theme) {
    const colors = theme.colors || {};

    div.style.padding = options.padding || '1rem';
    div.style.margin = options.margin || '0';
    div.style.borderRadius = options.borderRadius || '8px';
    div.style.border = options.border || `1px solid ${colors.border || '#999'}`;
    div.style.backgroundColor = options.bg || colors.surface || '#f0f0f0';
    div.style.color = options.color || colors.foreground || '#000';
  }

  themeStream.subscribe(applyStyles);
  applyStyles(themeStream.get());

  return div;
}

// ➖ Divider: Horizontal or vertical line
function divider(options = {}, themeStream = currentTheme) {
  const el = document.createElement('div');

  const isVertical = options.vertical || false;
  el.style[isVertical ? 'width' : 'height'] = options.thickness || '1px';
  el.style[isVertical ? 'height' : 'width'] = options.length || '100%';

  themeStream.subscribe(theme => {
    el.style.backgroundColor = options.color || theme.colors.border || theme.colors.foreground;
  });

  el.style.margin = options.margin || '1rem 0';
  return el;
}

// Diagram tree side panel toggle
window.addEventListener('DOMContentLoaded', () => {
  if (!window.diagramTree) return;

  const panel = document.createElement('div');
  panel.classList.add('diagram-tree-panel');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00D7';
  closeBtn.classList.add('diagram-tree-close');
  closeBtn.addEventListener('click', () => {
    panel.style.left = '-300px';
  });
  panel.appendChild(closeBtn);

  const content = window.diagramTree.createTreeContainer();
  panel.appendChild(content);
  document.body.appendChild(panel);

  window.diagramTree.togglePanel = () => {
    const open = panel.style.left === '0px';
    panel.style.left = open ? '-300px' : '0px';
  };

  // Apply theme styling
  currentTheme.subscribe(theme => {
    const colors = theme.colors;
    panel.style.background = colors.surface;
    panel.style.color = colors.foreground;
    panel.style.boxShadow = `2px 0 6px ${colors.border}`;

    closeBtn.style.background = 'transparent';
    closeBtn.style.color = colors.foreground;
    closeBtn.style.border = 'none';
  });
});
