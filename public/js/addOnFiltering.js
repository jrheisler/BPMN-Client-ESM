export function initAddOnFiltering({ currentTheme, elementRegistry, modeling, canvas, scheduleOverlayUpdate, addOnStore, diagramXMLStream, typeIcons }) {
  const { createAddOnFilterPanel, selectedType, selectedSubtype } = window.addOnFilter;
  let addOnFilterPanelEl = null;

  const filterToggleBtn = document.createElement('button');
  filterToggleBtn.textContent = 'Filters';
  filterToggleBtn.classList.add('addon-filter-toggle');

  filterToggleBtn.addEventListener('click', () => {
    if (!addOnFilterPanelEl) {
      addOnFilterPanelEl = createAddOnFilterPanel(currentTheme);
      document.body.appendChild(addOnFilterPanelEl);
    }
    const isVisible = addOnFilterPanelEl.style.display === 'flex';
    if (isVisible) {
      selectedType.set(null);
      selectedSubtype.set(null);
    }
    addOnFilterPanelEl.style.display = isVisible ? 'none' : 'flex';
  });

  if (window.addOnLegend) {
    const legendEl = addOnLegend.createAddOnLegend(typeIcons, currentTheme);
    legendEl.prepend(filterToggleBtn);
    document.body.appendChild(legendEl);
  }

  const highlightedNodes = new Set();
  function updateHighlightedNodes() {
    highlightedNodes.forEach(id => canvas.removeMarker(id, 'bpmn-addOn-highlight'));
    highlightedNodes.clear();
    const type = selectedType.get();
    if (!type || !addOnStore) return;
    const subtype = selectedSubtype.get();
    const nodeIds = subtype ? addOnStore.findNodesBySubtype(type, subtype) : addOnStore.findNodesByType(type);
    nodeIds.forEach(id => {
      canvas.addMarker(id, 'bpmn-addOn-highlight');
      highlightedNodes.add(id);
    });
  }

  selectedType.subscribe(() => { updateHighlightedNodes(); scheduleOverlayUpdate(); });
  selectedSubtype.subscribe(() => { updateHighlightedNodes(); scheduleOverlayUpdate(); });

  if (addOnStore) {
    const originalSetAddOns = addOnStore.setAddOns;
    const originalClear = addOnStore.clear;
    addOnStore.setAddOns = function(nodeId, addOns) {
      originalSetAddOns(nodeId, addOns);
      scheduleOverlayUpdate();
      updateHighlightedNodes();
    };
    addOnStore.clear = function() {
      originalClear();
      scheduleOverlayUpdate();
      updateHighlightedNodes();
    };
  }

  function syncAddOnStoreFromElements() {
    if (!addOnStore) return;
    addOnStore.clear();
    elementRegistry.getAll().forEach(el => {
      const bo = el.businessObject;
      const raw = bo?.$attrs?.addOns || bo?.addOns;
      if (raw) {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          addOnStore.setAddOns(bo.id, data);
        } catch (err) {
          console.warn('Failed to parse addOns for', bo.id, err);
        }
      }
    });
  }

  function applyAddOnsToElements(data) {
    Object.entries(data || {}).forEach(([id, addOns]) => {
      const el = elementRegistry.get(id);
      if (el) {
        modeling.updateProperties(el, { addOns: JSON.stringify(addOns) });
      }
    });
  }

  function loadAddOnData(data = {}) {
    if (!addOnStore) return;
    addOnStore.clear();
    Object.entries(data || {}).forEach(([id, addOns]) => {
      addOnStore.setAddOns(id, addOns);
    });
    applyAddOnsToElements(data);
    scheduleOverlayUpdate();
    updateHighlightedNodes();
  }

  diagramXMLStream.subscribe(() => {
    syncAddOnStoreFromElements();
    scheduleOverlayUpdate();
    updateHighlightedNodes();
  });

  return { loadAddOnData, applyAddOnsToElements, syncAddOnStoreFromElements };
}
