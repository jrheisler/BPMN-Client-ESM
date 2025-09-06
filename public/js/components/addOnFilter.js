(function(global){
  const addOnTypes = {
    'Knowledge': [
      'Process Assumptions',
      'Process Issues',
      'Lessons Learned',
      'Best Practices',
      'Practical Solutions',
      'Other'
    ],
    'Business': [
      'Corporate Mission',
      'Critical Success',
      'Goals',
      'Objectives',
      'Others'
    ],
    'Requirement': [
      'Availability',
      'Resource',
      'Customer',
      'Directive',
      'Governance',
      'Quality (e.g., ISO)',
      'Legal',
      'Maintainability',
      'Policy',
      'Procedure(s)',
      'Work Instruction',
      'Regulations',
      'Reliability',
      'Safety',
      'Service Responsibility',
      'Standards',
      'System',
      'Others'
    ],
    'Lifecycle': [
      'Create',
      'In Work',
      'In Review',
      'Approved',
      'Released',
      'Archived',
      'Obsolete',
      'Others'
    ],
    'Measurement': [
      'Quality',
      'Quantity',
      'Time',
      'Cost',
      'Service Level Agreement',
      'Utilization',
      'Others'
    ],
    'Condition': [
      'Start Event',
      'Stop Event',
      'Others'
    ],
    'Material': [
      'Raw',
      'Processed',
      'Others'
    ],
    'Role': [
      'Individual',
      'Group',
      'Organization',
      'Stakeholders',
      'Others'
    ],
    'Equipment': [
      'Apparatus',
      'Fixed',
      'Asset',
      'Others'
    ],
    'System': [
      'Transaction Processing',
      'Office Automation',
      'Knowledge Work',
      'Management Information',
      'Decision Support',
      'Executive Support',
      'Others'
    ],
    'Tool': [
      'Hardware',
      'Software',
      'Techno-mechanical',
      'Others'
    ],
    'Information': [
      'Artifact',
      'Data',
      'Others'
    ]
  };

  const selectedType = new Stream(null);
  const selectedSubtype = new Stream(null);
  const expandedType = new Stream(null);

  function adjustColor(hex, amount) {
    const col = hex.startsWith('#') ? hex.slice(1) : hex;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0xFF) + amount;
    let b = (num & 0xFF) + amount;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function getContrastingHoverBg(primary) {
    const col = primary.startsWith('#') ? primary : `#${primary}`;
    const num = parseInt(col.slice(1), 16);
    const r = num >> 16;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const amount = 40;
    return adjustColor(col, brightness < 128 ? amount : -amount);
  }

  function createAddOnFilterPanel(themeStream = currentTheme){
    const panel = document.createElement('div');
    panel.classList.add('addon-filter');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '3rem',
      right: '1rem',
      width: '250px',
      maxHeight: '80vh',
      overflowY: 'auto',
      padding: '1rem',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      flexDirection: 'column',
      gap: '0.5rem',
      zIndex: '1000',
      display: 'none'
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00d7';
    closeBtn.className = 'addon-filter-close';
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      selectedType.set(null);
      selectedSubtype.set(null);
      expandedType.set(null);
    });

    const list = document.createElement('ul');
    panel.appendChild(list);
    panel.prepend(closeBtn);

    Object.entries(addOnTypes).forEach(([type, subtypes]) => {
      const typeItem = document.createElement('li');
      typeItem.className = 'addon-type';

      const header = document.createElement('div');
      header.className = 'addon-type-header';
      header.textContent = type;
      header.addEventListener('click', () => {
        expandedType.set(expandedType.get() === type ? null : type);
        selectedType.set(type);
        selectedSubtype.set(null);
      });
      typeItem.appendChild(header);

      const subList = document.createElement('ul');
      subList.className = 'subtype-list';

      subtypes.forEach(sub => {
        const subItem = document.createElement('li');
        subItem.className = 'subtype-item';
        subItem.textContent = sub;
        subItem.addEventListener('click', e => {
          e.stopPropagation();
          selectedSubtype.set(sub);
        });
        selectedSubtype.subscribe(sel => {
          subItem.classList.toggle('selected', sel === sub);
        });
        subList.appendChild(subItem);
      });

      typeItem.appendChild(subList);
      list.appendChild(typeItem);

      selectedType.subscribe(sel => {
        header.classList.toggle('selected', sel === type);
      });

      expandedType.subscribe(exp => {
        typeItem.classList.toggle('expanded', exp === type);
      });
    });

    themeStream.subscribe(theme => {
      panel.style.backgroundColor = theme.colors.surface;
      panel.style.color = theme.colors.foreground;
      panel.style.borderRight = `1px solid ${theme.colors.border}`;
      panel.style.fontFamily = theme.fonts.base || 'sans-serif';
      panel.style.setProperty('--addon-hover-bg', getContrastingHoverBg(theme.colors.primary));
      panel.style.setProperty('--addon-icon-color', theme.colors.foreground);
    });

    return panel;
  }

  global.addOnFilter = {
    createAddOnFilterPanel,
    selectedType,
    selectedSubtype
  };

})(window);
