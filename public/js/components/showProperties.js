// 1) Create the sidebar container (hidden by default)
const propsSidebar = document.createElement('div');
propsSidebar.classList.add('props-sidebar');
document.body.appendChild(propsSidebar);

const RACI_FIELDS = ['responsible', 'accountable', 'consulted', 'informed'];
const RACI_MRU_KEY = 'raciMru';

const BPMN_PROPERTY_MAP = {
  'bpmn:Task': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:UserTask': [
    'name', 'documentation', 'assignee',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 'variables', 'inputMappings', 'outputMappings', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ServiceTask': [
    'name', 'documentation', 'implementation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ScriptTask': [
    'name', 'documentation', 'script', 'scriptFormat',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:CallActivity': [
    'name', 'documentation', 'calledElement',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 'variables', 'inputMappings', 'outputMappings', 'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:SubProcess': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:StartEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',   'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:EndEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:IntermediateCatchEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:IntermediateThrowEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:BoundaryEvent': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',   'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ExclusiveGateway': [
    'name', 'documentation', 'default',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:InclusiveGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ParallelGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:ComplexGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:EventBasedGateway': [
    'name', 'documentation',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime',
  'variables', 'inputMappings', 'outputMappings',
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:SequenceFlow': [
    'name', 'documentation', 'conditionExpression',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:DataObjectReference': [
    'name', 'itemSubjectRef',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:DataStoreReference': [
    'name', 'itemSubjectRef',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Participant': [
    'name', 'processRef',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Lane': [
    'name',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:TextAnnotation': [
    'text',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
    'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ],
  'bpmn:Group': [
    'name', 'categoryValueRef',
    'estimatedDuration', 'actualDuration',
  'costEstimate', 'ownerRole',
  'inputQuality', 'outputQuality',
  'processOwner', 'creator', 'downTime', 'upTime', 'changeOverTime', 'perCompleteAccurate', 'availability', 'leadTime', 
  'kpiNotes', 'responsible', 'accountable', 'consulted', 'informed'
  ]
};


  const FIELD_DEFINITIONS = [
  { key: 'name',              label: 'Name',                type: 'text' },
  { key: 'documentation',     label: 'Documentation',       type: 'textarea' },
  { key: 'assignee',          label: 'Assignee',            type: 'text' },
  { key: 'calledElement',     label: 'Called Element',      type: 'text' },
  { key: 'script',            label: 'Script Content',      type: 'textarea' },
  { key: 'scriptFormat',      label: 'Script Format',       type: 'text' },
  { key: 'implementation',    label: 'Implementation',      type: 'text' },
  { key: 'default',           label: 'Default Flow ID',     type: 'text' },
  { key: 'conditionExpression', label: 'Condition (for flow)', type: 'textarea' },
  { key: 'variables',        label: 'Variables',           type: 'array' },
  { key: 'inputMappings',    label: 'Input Mappings',      type: 'array' },
  { key: 'outputMappings',   label: 'Output Mappings',     type: 'array' },
  { key: 'itemSubjectRef',    label: 'Data Type (ItemRef)', type: 'text' },
  { key: 'processRef',        label: 'Linked Process ID',   type: 'text' },
  { key: 'text',              label: 'Annotation Text',     type: 'textarea' },
  { key: 'processOwner',      label: 'Process Owner',       type: 'text' },
  { key: 'creator',           label: 'Creator',             type: 'text' },
  { key: 'categoryValueRef',  label: 'Category Reference',  type: 'text' },
  { key: 'estimatedDuration',  label: 'Estimated Duration (mins)', type: 'text' },
  { key: 'actualDuration',     label: 'Actual Duration (mins)',    type: 'text' },
  { key: 'costEstimate',       label: 'Estimated Cost ($)',        type: 'text' },
  { key: 'ownerRole',          label: 'Responsible Role',          type: 'text' },
  { key: 'inputQuality',       label: 'Input Quality Score',       type: 'text' },
  { key: 'outputQuality',      label: 'Output Quality Score',      type: 'text' },
  { key: 'downTime',           label: 'Down Time',                 type: 'text' },
  { key: 'upTime',             label: 'Up Time',                   type: 'text' },
  { key: 'changeOverTime',     label: 'Change Over Time',          type: 'text' },
  { key: 'perCompleteAccurate', label: 'Percent Complete and Accurate',          type: 'text' },
  { key: 'availability ',       label: 'Availability',            type: 'text' },
  { key: 'leadTime ',           label: 'Lead Time',               type: 'text' },
  { key: 'kpiNotes',           label: 'KPI Notes',                 type: 'textarea' },
  { key: 'responsible',       label: 'Responsible',             type: 'text' },
  { key: 'accountable',       label: 'Accountable',             type: 'text' },
  { key: 'consulted',         label: 'Consulted',               type: 'text' },
  { key: 'informed',          label: 'Informed',                type: 'text' },

];

function openUrlModal(url) {
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  });

  const content = document.createElement('div');
  Object.assign(content.style, {
    width: '80%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    position: 'relative',
  });

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding: '0.5rem 1rem',
    backgroundColor: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  });
  closeBtn.addEventListener('click', () => modal.remove());

  content.appendChild(iframe);
  content.appendChild(closeBtn);
  modal.appendChild(content);

  document.body.appendChild(modal);
}

function showProperties(element, modeling, moddle) {
  const bo = element.businessObject;
  const type = element.businessObject.$type;
  const fieldKeys = BPMN_PROPERTY_MAP[type] || [];

  const fieldsToShow = FIELD_DEFINITIONS.filter(f => fieldKeys.includes(f.key));

  propsSidebar.replaceChildren();
  if (propsSidebar._unsubTheme) {
    propsSidebar._unsubTheme();
  }

  const form = document.createElement('form');

  const raciDatalist = document.createElement('datalist');
  raciDatalist.id = 'raci-mru';
  let raciMru = JSON.parse(localStorage.getItem(RACI_MRU_KEY) || '[]');
  function renderRaciOptions() {
    raciDatalist.replaceChildren();
    raciMru.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      raciDatalist.appendChild(opt);
    });
  }
  renderRaciOptions();
  form.appendChild(raciDatalist);

  // Local AddOns array
  let currentAddOns = [];

  // Hidden field to hold JSON value for saving
  const addOnsField = document.createElement('input');
  addOnsField.type = 'hidden';
  addOnsField.name = 'addOns';
  addOnsField.value = '';

  // Load existing addOns value from element
  let existingVal = bo?.$attrs?.addOns || bo.addOns;
  if (Array.isArray(existingVal)) {
    currentAddOns = existingVal;
    addOnsField.value = JSON.stringify(currentAddOns, null, 2);
  } else if (existingVal != null) {
    addOnsField.value = existingVal;
    try {
      currentAddOns = JSON.parse(existingVal);
    } catch (e) {
      console.warn("Invalid existing AddOns JSON; starting fresh");
      currentAddOns = [];
    }
  }

  // Sync store on open
  if (window.addOnStore) {
    addOnStore.setAddOns(bo.id, currentAddOns);
  }

  // Attach button
  const attachBtn = reactiveButton(
    new Stream("Attach AddOn"),
    () => {
      openAddOnChooserModal(currentTheme).subscribe(selectedAddOn => {
        if (!selectedAddOn) return;

        const newEntry = {
          id: selectedAddOn.address,
          ...selectedAddOn
        };

        if (!currentAddOns.some(a => a.id === newEntry.id)) {
          currentAddOns.push(newEntry);
        }

        // Update hidden field value
        addOnsField.value = JSON.stringify(currentAddOns, null, 2);

        // Update visual list
        renderAddOnsList();

        // Sync store after add
        if (window.addOnStore) {
          addOnStore.setAddOns(bo.id, currentAddOns);
        }

      });
    },
    { accent: true },
    currentTheme
  );

  // AddOns visual list
  const addOnsListContainer = document.createElement('div');
  addOnsListContainer.style.display = 'flex';
  addOnsListContainer.style.flexDirection = 'column';
  addOnsListContainer.style.gap = '0.5rem';
  addOnsListContainer.style.marginTop = '1rem';
  addOnsListContainer.style.padding = '0.5rem';
  
  
  function renderAddOnsList() {
    addOnsListContainer.replaceChildren();

  if (!currentAddOns.length) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'No AddOns attached yet.';
    addOnsListContainer.appendChild(emptyMsg);
    return;
  }

  currentAddOns.forEach((addOn, index) => {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.padding = '0.5rem 0';
  

  // — Row 1: Image (icon) and Type
  const row1 = document.createElement('div');
  row1.style.display = 'flex';
  row1.style.alignItems = 'center';
  row1.style.gap = '0.5rem';

  const icon = document.createElement('span');
  icon.textContent = (window.typeIcons || {})[addOn.type] || '❓';
  icon.style.fontSize = '1.5rem';
  row1.appendChild(icon);

  const typeText = document.createElement('div');
  typeText.textContent = `${addOn.type || 'Unknown Type'}`;
  typeText.style.fontWeight = 'bold';
  row1.appendChild(typeText);

  container.appendChild(row1);

  // — Row 2a: Subtype
  if (addOn.name) {
    const row2a = document.createElement('div');
    row2a.textContent = `Name: ${addOn.name}`;
    row2a.style.marginLeft = '2rem';
    container.appendChild(row2a);
  }

  // — Row 2: Subtype
  if (addOn.subtype) {
    const row2 = document.createElement('div');
    row2.textContent = `Subtype: ${addOn.subtype}`;
    row2.style.marginLeft = '2rem';
    container.appendChild(row2);
  }

  // — Row 3: Notes
  if (addOn.notes) {
    const row3 = document.createElement('div');
    row3.textContent = `Notes: ${addOn.notes.length > 80 ? addOn.notes.slice(0, 80) + '…' : addOn.notes}`;
    row3.style.marginLeft = '2rem';
    container.appendChild(row3);
  }

  // — Row 4: URL link
  if (addOn.url) {
    if (!/^https?:\/\//i.test(addOn.url)) {
      addOn.url = 'https://' + addOn.url;
    }

    const row4 = document.createElement('div');

    const link = document.createElement('a');
    link.href = addOn.url;
    link.textContent = 'Open URL in New Tab';
    link.target = '_blank';
    link.style.marginLeft = '2rem';
    link.style.color = '#007BFF';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';

    row4.appendChild(link);
    container.appendChild(row4);
  }

    // — Row 5: Remove button
    const row5 = document.createElement('div');
    row5.style.marginLeft = '2rem';
    row5.style.marginTop = '0.5rem';

    const removeBtn = reactiveButton(
      new Stream('Remove'),
      async () => {
        const confirmed = await showConfirmationDialog('Are you sure you want to remove this AddOn?', currentTheme);
        if (confirmed) {
          currentAddOns.splice(index, 1);
          addOnsField.value = JSON.stringify(currentAddOns, null, 2);
          renderAddOnsList();

          // Sync store after remove
          if (window.addOnStore) {
            addOnStore.setAddOns(bo.id, currentAddOns);
          }
        }
      },
      // ✅ Use a fresh options object literal inside each call
      {
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
      },
      currentTheme
    );

    row5.appendChild(removeBtn);
    container.appendChild(row5);
    container.appendChild(divider({ margin: '1rem 0' }, currentTheme));  


  addOnsListContainer.appendChild(container);
  });

}


  // Initial render
  renderAddOnsList();

  // Save button
  const saveBtn = reactiveButton(
    new Stream('Save'),
    () => {
      let parsedAddOns = [];
      try {
        parsedAddOns = addOnsField.value ? JSON.parse(addOnsField.value) : [];
        currentAddOns = parsedAddOns;
        addOnsField.value = JSON.stringify(currentAddOns, null, 2);
        if (window.addOnStore) {
          addOnStore.setAddOns(bo.id, currentAddOns);
        }
      } catch (e) {
        alert('AddOns must be valid JSON');
        return;
      }

      const data = new FormData(form);
      const props = {};
      const standardKeys = BPMN_PROPERTY_MAP[bo.$type] || [];
      const arrayKeys = ['variables', 'inputMappings', 'outputMappings'];

      bo.$attrs = bo.$attrs || {};

      standardKeys.forEach(key => {
        const val = data.get(key);
        if (val !== null && !arrayKeys.includes(key) && key !== 'conditionExpression') {
          props[key] = val;
        }
      });

      const expr = data.get('conditionExpression')?.trim();
      props.conditionExpression = expr ? moddle.create('bpmn:FormalExpression', { body: expr }) : undefined;

      modeling.updateProperties(element, props);

      const raciKeys = RACI_FIELDS;
      bo.$attrs = bo.$attrs || {};
      let raciEl = (bo.extensionElements?.values || []).find(v => v.$type === 'custom:Raci');
      if (!raciEl) {
        const extEl = getOrCreateExtEl(bo, moddle);
        raciEl = moddle.create('custom:Raci', {});
        extEl.values.push(raciEl);
      }
      raciKeys.forEach(k => {
        const v = data.get(k) || '';
        if (v) {
          bo.$attrs[k] = v;
          raciEl[k] = v;
        } else {
          delete bo.$attrs[k];
          delete raciEl[k];
        }
      });

      // handle array-based custom elements
      const extEl = getOrCreateExtEl(bo, moddle);
      arrayKeys.forEach(key => {
        const val = data.get(key);
        const type = key === 'variables' ? 'custom:Variable' : 'custom:Mapping';
        const direction = key === 'inputMappings' ? 'input' : key === 'outputMappings' ? 'output' : null;

        // remove existing elements of this kind
        extEl.values = (extEl.values || []).filter(v => {
          if (v.$type !== type) return true;
          if (type === 'custom:Mapping' && direction) return v.direction !== direction;
          return false;
        });

        if (val) {
          let items;
          try {
            items = JSON.parse(val);
          } catch (e) {
            items = [];
          }
          items.forEach(it => {
            const attrs = { ...it };
            if (direction) attrs.direction = direction;
            extEl.values.push(moddle.create(type, attrs));
          });
        }

        delete bo[key];
      });

      // Store addOns under $attrs for custom serialization
      if (addOnsField.value) {
        bo.$attrs.addOns = addOnsField.value;
      } else {
        delete bo.$attrs.addOns;
      }
      delete bo.addOns;

      hideSidebar();
    },
    {
      accent: true,
      size: '1rem',
      padding: '0.5rem 1rem',
      // Remove margin to keep them tight
      margin: '0',
      title: 'Save changes'
    },
    currentTheme
  );

  // Cancel button
  const cancelBtn = reactiveButton(
    new Stream('Cancel'),
    () => {
      hideSidebar();
    },
    {
      outline: true,
      size: '1rem',
      padding: '0.5rem 1rem',
      margin: '0', // No extra margin
      title: 'Discard changes'
    },
    currentTheme
  );

  const topBtnRow = row(
    [saveBtn, cancelBtn],
    {
      justify: 'flex-start', // Move them together to the right
      gap: '0.5rem',      // Smaller gap between buttons
      marginBottom: '1rem'
    },
    currentTheme
  );


  // Append top buttons first
  form.appendChild(topBtnRow);
  
  form.appendChild(divider({ margin: '1rem 0' }, currentTheme));

  // Fields
  fieldsToShow.forEach(({ key, label, type }) => {
    if (key === 'addOns') {
      // Already handled
      return;
    }

    if (type === 'array') {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '0.75rem';

      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.style.display = 'block';
      wrapper.appendChild(lbl);

      const listContainer = document.createElement('div');
      listContainer.style.display = 'flex';
      listContainer.style.flexDirection = 'column';
      listContainer.style.gap = '0.5rem';
      wrapper.appendChild(listContainer);

      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = key;
      wrapper.appendChild(hiddenInput);

      let items = [];
      const extVals = (bo.extensionElements && bo.extensionElements.values) || [];
      if (key === 'variables') {
        items = extVals
          .filter(v => v.$type === 'custom:Variable')
          .map(v => ({ name: v.name || '', type: v.type || '', default: v.default || '' }));
      } else if (key === 'inputMappings' || key === 'outputMappings') {
        const dir = key === 'inputMappings' ? 'input' : 'output';
        items = extVals
          .filter(v => v.$type === 'custom:Mapping' && v.direction === dir)
          .map(v => ({ name: v.name || '', type: v.type || '', default: v.default || '' }));
      }

      if (!items.length) {
        let existingVal = bo?.$attrs?.[key] || bo.get(key);
        if (existingVal) {
          try {
            items = typeof existingVal === 'string' ? JSON.parse(existingVal) : existingVal;
          } catch (e) {
            items = [];
          }
        }
      }

      function renderItems() {
        listContainer.replaceChildren();
        items.forEach((it, idx) => {
          const rowEl = document.createElement('div');
          rowEl.style.display = 'flex';
          rowEl.style.flexDirection = 'column';
          rowEl.style.gap = '0.5rem';

          ['name', 'type', 'default'].forEach(field => {
            const fieldWrap = document.createElement('div');
            fieldWrap.style.display = 'flex';
            fieldWrap.style.flexDirection = 'column';
            fieldWrap.style.gap = '0.25rem';

            const lbl = document.createElement('label');
            lbl.textContent = field.charAt(0).toUpperCase() + field.slice(1);
            fieldWrap.appendChild(lbl);

            const inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = field.charAt(0).toUpperCase() + field.slice(1);
            inp.style.width = '100%';
            inp.value = it[field] || '';
            inp.addEventListener('input', () => {
              it[field] = inp.value;
              hiddenInput.value = JSON.stringify(items);
            });

            fieldWrap.appendChild(inp);
            rowEl.appendChild(fieldWrap);
          });

          const removeBtn = reactiveButton(
            new Stream('Remove'),
            () => {
              items.splice(idx, 1);
              hiddenInput.value = JSON.stringify(items);
              renderItems();
            },
            { padding: '0.25rem 0.5rem' },
            currentTheme
          );

          removeBtn.style.alignSelf = 'flex-start';
          rowEl.appendChild(removeBtn);
          listContainer.appendChild(rowEl);
        });

        hiddenInput.value = items.length ? JSON.stringify(items) : '';
      }

      const addBtn = reactiveButton(
        new Stream('Add'),
        () => {
          items.push({ name: '', type: '', default: '' });
          hiddenInput.value = JSON.stringify(items);
          renderItems();
        },
        { accent: true, padding: '0.25rem 0.5rem', marginBottom: '0.5rem' },
        currentTheme
      );

      wrapper.insertBefore(addBtn, listContainer);

      renderItems();
      form.appendChild(wrapper);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '0.75rem';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.display = 'block';
    wrapper.appendChild(lbl);

    let input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      if (key === 'conditionExpression') {
        input.rows = 4;
        input.wrap = 'soft';
      } else {
        input.rows = 3;
      }
    } else {
      input = document.createElement('input');
      input.type = type;
    }
    input.name = key;
    input.style.width = '100%';

    let val = bo.get(key);
    if (val == null) {
      val = bo.$attrs?.[key];
    }
    if (val == null && RACI_FIELDS.includes(key)) {
      const raci = (bo.extensionElements?.values || []).find(v => v.$type === 'custom:Raci');
      val = raci?.[key];
    }
    if (val == null) {
      const extEl = bo.extensionElements;
      if (extEl) {
        const ext = (extEl.values || []).find(v => v.$type === 'custom:Attribute' && v.name === key);
        if (ext) val = ext.value;
      }
    }
    if (key === 'conditionExpression') {
      input.value = val?.body || '';
    } else if (val != null) {
      input.value = val;
    }

    if (key === 'url') {
      let link = document.createElement('a');
      link.textContent = 'Open';
      link.style.display = input.value ? 'inline-block' : 'none';
      link.style.margin = '0.25rem 0 0 0';
      link.target = '_blank';
      link.href = input.value;
      wrapper.appendChild(link);

      input.addEventListener('input', () => {
        const u = input.value.trim();
        if (u) {
          link.href = u;
          link.style.display = 'inline-block';
        } else {
          link.style.display = 'none';
        }
      });
    }

    if (RACI_FIELDS.includes(key)) {
      input.setAttribute('list', 'raci-mru');
      const updateRaciMru = () => {
        const value = input.value.trim();
        if (!value) return;
        let mru = JSON.parse(localStorage.getItem(RACI_MRU_KEY) || '[]');
        mru = mru.filter(v => v !== value);
        mru.unshift(value);
        if (mru.length > 10) mru = mru.slice(0, 10);
        localStorage.setItem(RACI_MRU_KEY, JSON.stringify(mru));
        raciMru = mru;
        renderRaciOptions();
      };
      input.addEventListener('change', updateRaciMru);
      input.addEventListener('blur', updateRaciMru);
    }

    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });





  // Append
  form.appendChild(attachBtn);
  form.appendChild(divider({ margin: '1rem 0' }, currentTheme));
  form.appendChild(addOnsListContainer);
  form.appendChild(addOnsField);
  form.style.paddingBottom = '3rem';



  propsSidebar.append(form);
  propsSidebar.style.display = 'flex';
  propsSidebar.classList.add('open');

  const unsub = currentTheme.subscribe(theme => {
    propsSidebar.style.backgroundColor = theme.colors.surface;
    propsSidebar.style.color = theme.colors.foreground;
    propsSidebar.style.fontFamily = theme.fonts.base;

    form.querySelectorAll('label').forEach(lbl => {
      lbl.style.color = theme.colors.foreground;
      lbl.style.fontFamily = theme.fonts.base;
    });

    form.querySelectorAll('input, textarea, button').forEach(el => {
      el.style.backgroundColor = theme.colors.background;
      el.style.color = theme.colors.foreground;
      el.style.border = `1px solid ${theme.colors.border}`;
      el.style.fontFamily = theme.fonts.base;
      el.style.padding = '0.25rem';
      el.style.borderRadius = '4px';
      if (el.tagName === 'BUTTON') {
        el.style.cursor = 'pointer';
      }
    });
  });

  propsSidebar._unsubTheme = unsub;
}


  // 2) Define the fields you want to edit


  // 3) Utility to get or create extensionElements for your custom attributes
function getOrCreateExtEl(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', {
      values: []
    });
  }
  return bo.extensionElements;
}


      
  // hide helper cleans up subscription
  function hideSidebar() {
    propsSidebar.classList.remove('open');
    propsSidebar.style.display = 'none';
    if (propsSidebar._unsubTheme) {
      propsSidebar._unsubTheme();
      delete propsSidebar._unsubTheme;
    }
  }

