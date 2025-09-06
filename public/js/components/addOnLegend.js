(function(global){
  function createAddOnLegend(typeIcons = {}, themeStream = currentTheme){
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '0.5rem',
      right: '1rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      zIndex: '1000',
      fontSize: '14px'
    });

    const countEls = {};
    Object.entries(typeIcons).forEach(([type, icon]) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      });
      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      const countSpan = document.createElement('span');
      countSpan.textContent = '0';
      row.appendChild(iconSpan);
      row.appendChild(countSpan);
      container.appendChild(row);
      countEls[type] = countSpan;
    });

    function computeCounts(){
      const counts = {};
      if(!global.addOnStore || !addOnStore.getAllAddOns) return counts;
      const all = addOnStore.getAllAddOns();
      Object.values(all).forEach(addOns => {
        const seen = new Set();
        (addOns || []).forEach(a => {
          if(a && a.type) seen.add(a.type);
        });
        seen.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      });
      return counts;
    }

    const countsStream = new Stream(computeCounts());
    countsStream.subscribe(counts => {
      Object.keys(typeIcons).forEach(type => {
        countEls[type].textContent = counts[type] || 0;
      });
    });

    if(global.addOnStore){
      const originalSet = addOnStore.setAddOns;
      addOnStore.setAddOns = function(nodeId, addOns){
        originalSet(nodeId, addOns);
        countsStream.set(computeCounts());
      };
      const originalClear = addOnStore.clear;
      addOnStore.clear = function(){
        originalClear();
        countsStream.set(computeCounts());
      };
    }

    themeStream.subscribe(theme => {
      container.style.background = theme.colors.surface;
      container.style.color = theme.colors.foreground;
      container.style.border = `1px solid ${theme.colors.border}`;
      container.style.fontFamily = theme.fonts.base || 'sans-serif';
    });

    return container;
  }

  global.addOnLegend = { createAddOnLegend };
})(window);
