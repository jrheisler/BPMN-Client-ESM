const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tagName);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
}

function ensureTimelineGroup(layer) {
  let group = layer.querySelector('g.djs-timeline');

  if (!group) {
    group = createSvgElement('g', { class: 'djs-timeline' });
    layer.appendChild(group);
  }

  return group;
}

export function setupTimeline({ canvas, eventBus }) {
  const layer = canvas.getLayer('timeline', 1000);
  const timelineGroup = ensureTimelineGroup(layer);

  function clearGroup() {
    while (timelineGroup.firstChild) {
      timelineGroup.removeChild(timelineGroup.firstChild);
    }
  }

  function drawTimeline() {
    const root = canvas.getRootElement();
    if (!root) {
      return;
    }

    const rootGfx = canvas.getGraphics(root);
    if (!rootGfx || typeof rootGfx.getBBox !== 'function') {
      return;
    }

    const bounds = rootGfx.getBBox();
    const width = Math.max(bounds.width, 1);
    const translateX = bounds.x;
    const translateY = bounds.y + bounds.height + 30;

    if (!timelineGroup.isConnected) {
      layer.appendChild(timelineGroup);
    }

    timelineGroup.setAttribute('transform', `translate(${translateX}, ${translateY})`);

    clearGroup();

    const axis = createSvgElement('line', {
      x1: 0,
      y1: 0,
      x2: width,
      y2: 0,
      stroke: '#4a5568',
      'stroke-width': '2',
      'stroke-linecap': 'round'
    });

    timelineGroup.appendChild(axis);

    const slotCount = 5;
    const step = slotCount > 1 ? width / (slotCount - 1) : width;

    for (let i = 0; i < slotCount; i += 1) {
      const positionX = Math.min(step * i, width);

      const slot = createSvgElement('circle', {
        cx: positionX,
        cy: 0,
        r: 6,
        fill: '#2b6cb0',
        stroke: '#1a365d',
        'stroke-width': '1'
      });

      const label = createSvgElement('text', {
        x: positionX,
        y: 20,
        'text-anchor': 'middle',
        'font-size': '12',
        fill: '#2d3748'
      });

      label.textContent = `T${i + 1}`;

      timelineGroup.appendChild(slot);
      timelineGroup.appendChild(label);
    }
  }

  drawTimeline();

  eventBus.on('import.done', drawTimeline);
  eventBus.on('canvas.viewbox.changed', drawTimeline);
  eventBus.on('commandStack.changed', drawTimeline);

  return {
    update: drawTimeline
  };
}
