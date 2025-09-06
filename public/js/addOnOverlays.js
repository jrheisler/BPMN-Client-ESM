export function initAddOnOverlays({ overlays, elementRegistry, typeIcons }) {
  let addOnOverlayIds = [];

  function updateAddOnOverlays() {
    addOnOverlayIds.forEach(id => overlays.remove(id));
    addOnOverlayIds = [];
    const processed = new Set();
    elementRegistry.getAll().forEach(el => {
      if (el.type === 'label' || el.labelTarget) return;
      const bo = el.businessObject;
      const elementId = bo?.id;
      if (!elementId || processed.has(elementId)) return;
      processed.add(elementId);
      const raw = bo?.$attrs?.addOns || bo?.addOns;
      if (!raw) return;
      let addOns;
      try {
        addOns = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (err) {
        return;
      }
      if (!Array.isArray(addOns) || !addOns.length) return;
      const icons = addOns
        .map(a => typeIcons[a.type] || '')
        .filter(Boolean)
        .join('');
      if (!icons) return;
      const badge = document.createElement('div');
      badge.className = 'addon-overlay';
      badge.style.background = 'rgba(255, 255, 255, 0.8)';
      badge.style.borderRadius = '4px';
      badge.style.padding = '2px';
      badge.style.fontSize = '14px';
      badge.innerText = icons;
      const overlayId = overlays.add(el, {
        position: { top: -10, left: -10 },
        html: badge
      });
      addOnOverlayIds.push(overlayId);
    });
  }

  let overlayUpdateScheduled = false;
  function scheduleOverlayUpdate() {
    if (overlayUpdateScheduled) return;
    overlayUpdateScheduled = true;
    setTimeout(() => {
      overlayUpdateScheduled = false;
      updateAddOnOverlays();
    }, 0);
  }

  return { scheduleOverlayUpdate, updateAddOnOverlays };
}
