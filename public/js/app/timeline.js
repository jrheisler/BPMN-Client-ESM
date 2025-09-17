import {
  timelineEntries,
  addTimelineEntry,
  updateTimelineEntry,
  selectTimelineEntry,
  selectedTimelineEntryId,
  getTimelineEntry
} from '../modules/timeline.js';
import { currentTheme } from '../core/theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_HEIGHT = 12;
const TIMELINE_VERTICAL_GAP = 30;
const MARKER_RADIUS = 8;
const MARKER_LABEL_OFFSET = 26;
const MARKER_FONT_SIZE = 13;
const DEFAULT_COLOR = '#2b6cb0';
const DEFAULT_STROKE = '#1a365d';
const SELECTED_COLOR = '#ed8936';
const SELECTED_STROKE = '#c05621';

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

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
    group.style.pointerEvents = 'auto';
    layer.appendChild(group);
  }

  return group;
}

function dispatchTimelineEvent(type, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function setupTimeline({
  canvas,
  eventBus,
  onEditEntry,
  themeStream = currentTheme
} = {}) {
  const layer = canvas.getLayer('timeline', 1000);
  const timelineGroup = ensureTimelineGroup(layer);

  const axis = createSvgElement('rect', {
    class: 'djs-timeline-axis',
    x: 0,
    y: -(AXIS_HEIGHT / 2),
    width: 0,
    height: AXIS_HEIGHT,
    rx: AXIS_HEIGHT / 2,
    ry: AXIS_HEIGHT / 2,
    fill: '#4a5568'
  });
  axis.style.cursor = 'crosshair';
  axis.style.pointerEvents = 'all';
  axis.style.touchAction = 'none';

  const markersGroup = createSvgElement('g', { class: 'djs-timeline-markers' });

  timelineGroup.appendChild(axis);
  timelineGroup.appendChild(markersGroup);

  const markerElements = new Map();

  const fallbackThemeColors = {
    axisFill: '#4a5568',
    markerFill: DEFAULT_COLOR,
    markerStroke: DEFAULT_STROKE,
    selectedFill: SELECTED_COLOR,
    selectedStroke: SELECTED_STROKE,
    label: '#2d3748'
  };

  let themeColors = { ...fallbackThemeColors };

  function applyTheme(theme) {
    const colors = theme?.colors || {};
    themeColors = {
      axisFill: colors.border || fallbackThemeColors.axisFill,
      markerFill: colors.accent || fallbackThemeColors.markerFill,
      markerStroke: colors.border || fallbackThemeColors.markerStroke,
      selectedFill: colors.accent || fallbackThemeColors.selectedFill,
      selectedStroke:
        colors.foreground || colors.accent || fallbackThemeColors.selectedStroke,
      label: colors.foreground || fallbackThemeColors.label
    };

    axis.setAttribute('fill', themeColors.axisFill);

    markerElements.forEach(({ group, circle, label }) => {
      const entryId = group.dataset.entryId;
      const entry = entryId ? getTimelineEntry(entryId) : null;
      const fill = entry?.color || themeColors.markerFill;
      circle.setAttribute('fill', fill);
      circle.setAttribute('stroke', themeColors.markerStroke);
      label.setAttribute('fill', themeColors.label);
    });

    updateSelection(selectedTimelineEntryId.get());
  }

  let axisLength = 0;

  function updateLayout() {
    const root = canvas.getRootElement();
    if (!root) {
      axisLength = 0;
      timelineGroup.style.display = 'none';
      return;
    }

    const rootGfx = canvas.getGraphics(root);
    if (!rootGfx || typeof rootGfx.getBBox !== 'function') {
      return;
    }

    const bounds = rootGfx.getBBox();
    axisLength = Math.max(bounds.width, 1);

    if (!timelineGroup.isConnected) {
      layer.appendChild(timelineGroup);
    }

    timelineGroup.style.display = 'block';

    const translateX = bounds.x;
    const translateY =
      bounds.y + bounds.height + TIMELINE_VERTICAL_GAP + AXIS_HEIGHT / 2;

    timelineGroup.setAttribute('transform', `translate(${translateX}, ${translateY})`);
    axis.setAttribute('width', axisLength);

    renderMarkers(timelineEntries.get());
  }

  function getLocalX(event) {
    const svg = axis.ownerSVGElement;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = axis.getScreenCTM();
    if (!matrix) return null;
    const local = point.matrixTransform(matrix.inverse());
    return clamp(local.x, 0, axisLength);
  }

  function updateSelection(selectedId) {
    markerElements.forEach(({ group, circle }) => {
      if (group.dataset.entryId === selectedId) {
        group.classList.add('is-selected');
        circle.setAttribute('fill', themeColors.selectedFill);
        circle.setAttribute('stroke', themeColors.selectedStroke);
      } else {
        group.classList.remove('is-selected');
        const entry = getTimelineEntry(group.dataset.entryId);
        const fill = entry?.color || themeColors.markerFill;
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', themeColors.markerStroke);
      }
    });
  }

  function updateMarker(entry, index, elements) {
    const offset = clamp(entry.offset ?? 0);
    const positionX = axisLength * offset;

    elements.group.setAttribute('transform', `translate(${positionX}, 0)`);
    const labelText = entry.label?.trim() || `T${index + 1}`;
    elements.label.textContent = labelText;

    const fillColor = entry.color || themeColors.markerFill;
    elements.circle.setAttribute('fill', fillColor);
    elements.circle.setAttribute('stroke', themeColors.markerStroke);
    elements.label.setAttribute('fill', themeColors.label);
  }

  function renderMarkers(entries) {
    const ids = new Set(entries.map(entry => entry.id));

    Array.from(markerElements.keys())
      .filter(id => !ids.has(id))
      .forEach(id => {
        const elements = markerElements.get(id);
        if (elements) {
          elements.group.remove();
          markerElements.delete(id);
        }
      });

    entries.forEach((entry, index) => {
      let elements = markerElements.get(entry.id);
      if (!elements) {
        elements = createMarker(entry.id);
        markerElements.set(entry.id, elements);
        markersGroup.appendChild(elements.group);
      }

      updateMarker(entry, index, elements);
    });

    updateSelection(selectedTimelineEntryId.get());
  }

  const dragState = {
    id: null,
    pointerId: null,
    hasMoved: false,
    startX: 0
  };

  function finishDrag(event) {
    if (!dragState.id || dragState.pointerId !== event.pointerId) {
      return;
    }

    const marker = markerElements.get(dragState.id);
    if (marker) {
      marker.group.releasePointerCapture(event.pointerId);
    }

    const entry = getTimelineEntry(dragState.id);
    const wasMoved = dragState.hasMoved;

    dragState.id = null;
    dragState.pointerId = null;
    dragState.hasMoved = false;
    dragState.startX = 0;

    if (!wasMoved && entry) {
      requestEdit(entry.id, 'select');
    } else if (entry) {
      dispatchTimelineEvent('timeline:moved', { entry });
    }
  }

  function attachMarkerInteraction(elements, id) {
    const { group } = elements;
    group.style.cursor = 'pointer';
    group.style.touchAction = 'none';

    group.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      } else {
        event.stopPropagation();
      }

      selectTimelineEntry(id);
      dispatchTimelineEvent('timeline:select', { entry: getTimelineEntry(id) });

      dragState.id = id;
      dragState.pointerId = event.pointerId;
      dragState.hasMoved = false;
      dragState.startX = getLocalX(event) ?? 0;
      group.setPointerCapture(event.pointerId);
    });

    group.addEventListener('pointermove', event => {
      if (dragState.id !== id || dragState.pointerId !== event.pointerId) {
        return;
      }

      const localX = getLocalX(event);
      if (localX == null) return;

      if (Math.abs(localX - dragState.startX) > 2) {
        dragState.hasMoved = true;
      }

      const offset = axisLength ? clamp(localX / axisLength) : 0;
      updateTimelineEntry(id, { offset });
    });

    group.addEventListener('pointerup', finishDrag);
    group.addEventListener('pointercancel', finishDrag);

    group.addEventListener('mousedown', event => {
      event.preventDefault();
    });
  }

  function createMarker(id) {
    const group = createSvgElement('g', { class: 'djs-timeline-entry', 'data-entry-id': id });
    const circle = createSvgElement('circle', {
      cx: 0,
      cy: 0,
      r: MARKER_RADIUS,
      fill: themeColors.markerFill,
      stroke: themeColors.markerStroke,
      'stroke-width': '2'
    });

    const label = createSvgElement('text', {
      x: 0,
      y: MARKER_LABEL_OFFSET,
      'text-anchor': 'middle',
      'font-size': MARKER_FONT_SIZE,
      fill: themeColors.label
    });

    group.appendChild(circle);
    group.appendChild(label);

    const elements = { group, circle, label };
    attachMarkerInteraction(elements, id);

    return elements;
  }

  function requestEdit(id, context = 'select') {
    const entry = getTimelineEntry(id);
    if (!entry) return;

    if (typeof onEditEntry === 'function') {
      onEditEntry(entry, context);
    }

    dispatchTimelineEvent('timeline:edit', { entry, context });
  }

  const handleAxisPointerDown = event => {
    if (event.button !== 0) return;
    if (!axisLength) return;

    const localX = getLocalX(event);
    if (localX == null) return;

    const offset = axisLength ? clamp(localX / axisLength) : 0;
    const entry = addTimelineEntry({ offset });
    dispatchTimelineEvent('timeline:select', { entry });
    requestEdit(entry.id, 'create');
  };

  axis.addEventListener('pointerdown', handleAxisPointerDown);

  const unsubscribeTheme =
    typeof themeStream?.subscribe === 'function'
      ? themeStream.subscribe(applyTheme)
      : null;

  const unsubscribeEntries = timelineEntries.subscribe(entries => {
    renderMarkers(entries);
    dispatchTimelineEvent('timeline:entriesChanged', {
      entries: entries.map(entry => ({ ...entry }))
    });
  });

  const unsubscribeSelection = selectedTimelineEntryId.subscribe(updateSelection);

  eventBus.on('import.done', updateLayout);
  eventBus.on('canvas.viewbox.changed', updateLayout);
  eventBus.on('commandStack.changed', updateLayout);

  updateLayout();

  return {
    update: updateLayout,
    destroy() {
      unsubscribeTheme?.();
      unsubscribeEntries?.();
      unsubscribeSelection?.();
      axis.removeEventListener('pointerdown', handleAxisPointerDown);
    }
  };
}
