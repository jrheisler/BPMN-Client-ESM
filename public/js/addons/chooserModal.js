import { Stream } from '../core/stream.js';
import { currentTheme } from '../core/theme.js';
import { editText, reactiveButton, dropdownStream, showConfirmationDialog, showToast } from '../components/index.js';
import { column, row } from '../components/layout.js';
import { db } from '../firebase.js';
import { collection, doc, getDoc, addDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

function typeChoices(type) {
  let choices = [];

  if (type === 'Knowledge') {
    choices = [
      { label: 'Process Assumptions', value: 'Process Assumptions' },
      { label: 'Process Issues', value: 'Process Issues' },
      { label: 'Lessons Learned', value: 'Lessons Learned' },
      { label: 'Best Practices', value: 'Best Practices' },
      { label: 'Practical Solutions', value: 'Practical Solutions' },
      { label: 'Other', value: 'Other' }
    ];
  } else if (type === 'Business') {
    choices = [
      { label: 'Corporate Mission', value: 'Corporate Mission' },
      { label: 'Critical Success', value: 'Critical Success' },
      { label: 'Goals', value: 'Goals' },
      { label: 'Objectives', value: 'Objectives' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Tool') {
    choices = [
      { label: 'Hardware', value: 'Hardware' },
      { label: 'Software', value: 'Software' },
      { label: 'Techno-mechanical', value: 'Techno-mechanical' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Equipment') {
    choices = [
      { label: 'Apparatus', value: 'Apparatus' },
      { label: 'Fixed', value: 'Fixed' },
      { label: 'Asset', value: 'Asset' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'System') {
    choices = [
      { label: 'Transaction Processing', value: 'Transaction Processing' },
      { label: 'Office Automation', value: 'Office Automation' },
      { label: 'Knowledge Work', value: 'Knowledge Work' },
      { label: 'Management Information', value: 'Management Information' },
      { label: 'Decision Support', value: 'Decision Support' },
      { label: 'Executive Support', value: 'Executive Support' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Lifecycle') {
    choices = [
      { label: 'Create', value: 'Create' },
      { label: 'In Work', value: 'In Work' },
      { label: 'In Review', value: 'In Review' },
      { label: 'Approved', value: 'Approved' },
      { label: 'Released', value: 'Released' },
      { label: 'Archived', value: 'Archived' },
      { label: 'Obsolete', value: 'Obsolete' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Requirement') {
    choices = [
      { label: 'Availability', value: 'Availability' },
      { label: 'Resource', value: 'Resource' },
      { label: 'Customer', value: 'Customer' },
      { label: 'Directive', value: 'Directive' },
      { label: 'Governance', value: 'Governance' },
      { label: 'Quality (e.g., ISO)', value: 'Quality (e.g., ISO)' },
      { label: 'Legal', value: 'Legal' },
      { label: 'Maintainability', value: 'Maintainability' },
      { label: 'Policy', value: 'Policy' },
      { label: 'Procedure(s)', value: 'Procedure(s)' },
      { label: 'Work Instruction', value: 'Work Instruction' },
      { label: 'Regulations', value: 'Regulations' },
      { label: 'Reliability', value: 'Reliability' },
      { label: 'Safety', value: 'Safety' },
      { label: 'Service Responsibility', value: 'Service Responsibility' },
      { label: 'Standards', value: 'Standards' },
      { label: 'System', value: 'System' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Measurement') {
    choices = [
      { label: 'Quality', value: 'Quality' },
      { label: 'Quantity', value: 'Quantity' },
      { label: 'Time', value: 'Time' },
      { label: 'Cost', value: 'Cost' },
      { label: 'Service Level Agreement', value: 'Service Level Agreement' },
      { label: 'Utilization', value: 'Utilization' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Condition') {
    choices = [
      { label: 'Start Event', value: 'Start Event' },
      { label: 'Stop Event', value: 'Stop Event' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Material') {
    choices = [
      { label: 'Raw', value: 'Raw' },
      { label: 'Processed', value: 'Processed' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Role') {
    choices = [
      { label: 'Individual', value: 'Individual' },
      { label: 'Group', value: 'Group' },
      { label: 'Organization', value: 'Organization' },
      { label: 'Stakeholders', value: 'Stakeholders' },
      { label: 'Others', value: 'Others' }
    ];
  } else if (type === 'Information') {
    choices = [
      { label: 'Artifact', value: 'Artifact' },
      { label: 'Data', value: 'Data' },
      { label: 'Others', value: 'Others' }
    ];
  }

  return choices;
}

function openAddOnModal(mode = 'add', addOnData = null, themeStream = currentTheme) {
  const modalStream = new Stream(null);

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999
  });

  const content = document.createElement('div');
  content.classList.add('responsive-modal');
  Object.assign(content.style, {
    padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto',
    backgroundColor: themeStream.get().colors.surface || '#fff',
    color: themeStream.get().colors.foreground || '#000',
    display: 'flex', flexDirection: 'column', gap: '1rem'
  });
  modal.appendChild(content);

  const title = document.createElement('h2');
  title.textContent = mode === 'add' ? 'Add New AddOn' : 'Edit AddOn';
  content.appendChild(title);

  const typeStream = new Stream(addOnData?.type || '');
  const typeDropdown = dropdownStream(typeStream, {
    choices: [
      { label: '📚 Knowledge', value: 'Knowledge' },
      { label: '💼 Business', value: 'Business' },
      { label: '📝 Requirement', value: 'Requirement' },
      { label: '🔄 Lifecycle', value: 'Lifecycle' },
      { label: '📊 Measurement', value: 'Measurement' },
      { label: '⚖️ Condition', value: 'Condition' },
      { label: '🧱 Material', value: 'Material' },
      { label: '👤 Role', value: 'Role' },
      { label: '🛠️ Equipment', value: 'Equipment' },
      { label: '⚙️ System', value: 'System' },
      { label: '🧰 Tool', value: 'Tool' },
      { label: 'ℹ️ Information', value: 'Information' }
    ],
    width: '100%',
    margin: '0.5rem 0'
  }, themeStream);
  content.appendChild(column([ typeDropdown ], { width: '100%' }, themeStream));

  const subtypeStream = new Stream(addOnData?.subtype || '');
  const subtypeChoicesStream = new Stream([]);

  function renderSubtype(choices, preselect) {
    subtypeContainer.replaceChildren();
    if (preselect && choices.find(c => c.value === preselect)) {
      subtypeStream.set(preselect);
    } else {
      subtypeStream.set(choices[0]?.value || '');
    }
    const dd = dropdownStream(subtypeStream, {
      choices,
      width: '100%',
      margin: '0.5rem 0'
    }, themeStream);
    subtypeContainer.appendChild(column([ dd ], { width: '100%' }, themeStream));
  }

  const subtypeContainer = document.createElement('div');
  content.appendChild(subtypeContainer);
  renderSubtype([], mode === 'edit' ? addOnData?.subtype : null);

  typeStream.subscribe(type => {
    const choices = typeChoices(type);
    subtypeChoicesStream.set(choices);
    renderSubtype(choices, mode === 'edit' ? addOnData?.subtype : null);
  });

  const nameStream = new Stream(addOnData?.name || '');
  const nameInput = editText(nameStream, {
    placeholder: 'Name of AddOn',
    width: '100%', padding: '0.5rem'
  }, themeStream);
  content.appendChild(column([ nameInput ], { width: '100%' }, themeStream));

  const notesStream = new Stream(addOnData?.notes || '');
  const notesInput = document.createElement('textarea');
  Object.assign(notesInput.style, {
    padding: '0.5rem', width: '100%', height: '100px',
    borderRadius: '6px', border: `1px solid ${themeStream.get().colors.border}`,
    backgroundColor: themeStream.get().colors.primary,
    color: themeStream.get().colors.foreground,
    fontSize: '1rem', marginBottom: '0.5rem'
  });
  notesInput.placeholder = 'Add Notes';
  notesInput.value = notesStream.get();
  notesInput.addEventListener('input', () => notesStream.set(notesInput.value));
  content.appendChild(column([ notesInput ], { width: '100%' }, themeStream));

  const urlStream = new Stream(addOnData?.url || '');
  const urlInput = editText(urlStream, {
    placeholder: 'URL (optional)', width: '100%', padding: '0.5rem'
  }, themeStream);
  content.appendChild(column([ urlInput ], { width: '100%' }, themeStream));

  const btnRow = row([], { justify: 'space-between', gap: '1rem' }, themeStream);
  const cancelBtn = reactiveButton(new Stream('Cancel'), () => {
    modalStream.set(null);
    modal.remove();
  }, { outline: true }, themeStream);

  const saveBtn = reactiveButton(new Stream(mode === 'add' ? 'Add AddOn' : 'Save Changes'), async () => {
    const newAddOn = {
      type: typeStream.get(),
      subtype: subtypeStream.get(),
      name: nameStream.get(),
      notes: notesStream.get(),
      url: urlStream.get(),
      lastUpdated: serverTimestamp()
    };

    const userRef = doc(db, 'users', window.currentUser.uid);
    try {
      if (mode === 'add') {
        const version = {
          name: newAddOn.name,
          notes: newAddOn.notes,
          url: newAddOn.url,
          type: newAddOn.type,
          subtype: newAddOn.subtype,
          timestamp: new Date().toISOString()
        };
        const ref = await addDoc(
          collection(doc(db, 'users', window.currentUser.uid), 'addOns'),
          {
            versions: [version],
            lastUpdated: serverTimestamp()
          }
        );

        await updateDoc(userRef, {
          addOns: arrayUnion({
            address: ref.id,
            type: newAddOn.type,
            name: newAddOn.name,
            notes: newAddOn.notes,
            url: newAddOn.url,
            subtype: newAddOn.subtype
          })
        });

        modalStream.set(version);
        showToast("AddOn added!", { type: 'success' });
      } else {
        const version = {
          name: newAddOn.name,
          notes: newAddOn.notes,
          url: newAddOn.url,
          type: newAddOn.type,
          subtype: newAddOn.subtype,
          timestamp: new Date().toISOString()
        };

        await updateDoc(
          doc(db, 'users', window.currentUser.uid, 'addOns', addOnData.id),
          {
            versions: arrayUnion(version),
            lastUpdated: serverTimestamp()
          }
        );

        await updateDoc(userRef, {
          addOns: arrayRemove({
            address: addOnData.id,
            type: addOnData.type,
            name: addOnData.name,
            notes: addOnData.notes,
            url: addOnData.url,
            subtype: addOnData.subtype
          })
        });

        await updateDoc(userRef, {
          addOns: arrayUnion({
            address: addOnData.id,
            type: newAddOn.type,
            name: newAddOn.name,
            notes: newAddOn.notes,
            url: newAddOn.url,
            subtype: newAddOn.subtype
          })
        });

        modalStream.set(version);
        showToast("AddOn updated!", { type: 'success' });
      }
    } catch (err) {
      showToast("Error: " + err.message, { type: 'error' });
    } finally {
      modal.remove();
    }
  }, { accent: true }, themeStream);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  content.appendChild(btnRow);

  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modalStream.set(null);
      modal.remove();
    }
  });

  return modalStream;
}

async function refreshAddOns() {
  try {
    const snap = await getDoc(doc(db, 'users', window.currentUser.uid));
    const list = (snap.data()?.addOns) || [];
    window.addOnsStream.set(list);
  } catch (err) {
    console.error("Failed to fetch AddOns: ", err);
  }
}

function truncate(str, length = 40) {
  if (typeof str !== 'string') return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function openAddOnChooserModal(themeStream = currentTheme) {
  refreshAddOns();
  const modalStream = new Stream(null);

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  });

  const content = document.createElement('div');
  content.classList.add('responsive-modal');
  Object.assign(content.style, {
    width: '80%',
    maxWidth: '90%',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    maxHeight: '80vh',
    overflowY: 'auto',
    backgroundColor: themeStream.get().colors.surface || '#fff',
    color: themeStream.get().colors.foreground || '#000',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  });
  modal.appendChild(content);

  const title = document.createElement('h2');
  title.textContent = "Choose or Manage AddOn";
  content.appendChild(title);

  const listContainer = document.createElement('div');
  Object.assign(listContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  });
  content.appendChild(listContainer);

  window.addOnsStream.subscribe(addOns => {
    listContainer.replaceChildren();

    if (!addOns.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No AddOns available.';
      listContainer.appendChild(empty);
      return;
    }

    const sortedAddOns = [...addOns].sort((a, b) => {
      const typeA = (a.type || '').toUpperCase();
      const typeB = (b.type || '').toUpperCase();
      if (typeA < typeB) return -1;
      if (typeA > typeB) return 1;
      return 0;
    });

    sortedAddOns.forEach((addOn) => {
      const item = document.createElement('div');
      Object.assign(item.style, {
        border: `1px solid ${themeStream.get().colors.border}`,
        borderRadius: '6px',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      });

      const icon = document.createElement('span');
      icon.textContent = (window.typeIcons || {})[addOn.type] || '❓';
      icon.style.fontSize = '1.5rem';
      item.appendChild(icon);

      const truncatedNotes = truncate(addOn.notes, 40);
      const label = document.createElement('div');
      label.textContent = `${addOn.name} — ${addOn.type || ''} — ${addOn.subtype || ''} — ${truncatedNotes}`;
      label.style.flex = '1';
      item.appendChild(label);

      const selectBtn = document.createElement('button');
      selectBtn.textContent = 'Select';
      selectBtn.style.cursor = 'pointer';
      selectBtn.onclick = () => {
        modalStream.set(addOn);
        closeModal();
      };

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cursor = 'pointer';
      editBtn.onclick = async () => {
        try {
          const fullData = await loadLatestAddOnVersion(addOn.address);
          const editStream = openAddOnModal('edit', fullData, themeStream);
          editStream.subscribe(updated => {
            if (updated) {
              showToast("AddOn updated!", { type: 'success' });
              refreshAddOns();
            }
          });
        } catch (err) {
          showToast("Failed to load AddOn: " + err.message, { type: 'error' });
        }
      };

      const removeBtn = reactiveButton(new Stream("Remove"), async () => {
        const confirmed = await showConfirmationDialog("Are you sure you want to remove this AddOn from this list?", themeStream);
        if (confirmed) {
          addOns.splice(addOns.indexOf(addOn), 1);
          window.addOnsStream.set([...addOns]);
        }
      }, {
        padding: '0.25rem 0.75rem',
        borderRadius: '4px'
      }, themeStream);

      item.appendChild(selectBtn);
      item.appendChild(editBtn);
      item.appendChild(removeBtn);

      listContainer.appendChild(item);
    });
  });

  const cancelBtn = reactiveButton(new Stream("Cancel"), () => {
    modalStream.set(null);
    closeModal();
  }, { outline: true }, themeStream);

  const newBtn = reactiveButton(new Stream("➕ New AddOn"), () => {
    const addStream = openAddOnModal('add', null, themeStream);
    addStream.subscribe(newAddOn => {
      if (newAddOn) {
        showToast("AddOn added!", { type: 'success' });
        refreshAddOns();
      }
    });
  }, { accent: true }, themeStream);

  content.appendChild(row([ cancelBtn, newBtn ], { justify: 'space-between', gap: '1rem' }, themeStream));

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  document.body.appendChild(modal);

  function closeModal() {
    modalStream.set(null);
    if (modal.parentNode) modal.remove();
  }

  return modalStream;
}

async function loadLatestAddOnVersion(addOnId) {
  const docSnap = await getDoc(doc(db, 'users', window.currentUser.uid, 'addOns', addOnId));

  const data = docSnap.data();
  if (!data || !data.versions || data.versions.length === 0) {
    throw new Error("No versions found for this AddOn.");
  }

  const latestVersion = data.versions[data.versions.length - 1];

  return {
    ...latestVersion,
    id: addOnId
  };
}

function openAddOnHistoryModal(addOnId, themeStream = currentTheme) {
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '9999'
  });

  const content = document.createElement('div');
  content.classList.add('responsive-modal');
  Object.assign(content.style, {
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    maxWidth: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    backgroundColor: themeStream.get().colors.surface || '#fff',
    color: themeStream.get().colors.foreground || '#000',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  });

  const title = document.createElement('h2');
  title.textContent = "AddOn Version History";
  content.appendChild(title);

  const versionsContainer = document.createElement('div');
  Object.assign(versionsContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  });
  content.appendChild(versionsContainer);

  const loadHistory = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'users', window.currentUser.uid, 'addOns', addOnId));

      const data = docSnap.data();
      if (!data || !data.versions || data.versions.length === 0) {
        const msg = document.createElement('p');
        msg.textContent = "No versions found.";
        versionsContainer.appendChild(msg);
        return;
      }

      versionsContainer.replaceChildren();

      data.versions.forEach((version, idx) => {
        const versionItem = document.createElement('div');
        Object.assign(versionItem.style, {
          border: `1px solid ${themeStream.get().colors.border}`,
          borderRadius: '6px',
          padding: '0.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem'
        });

        const header = document.createElement('strong');
        header.textContent = `Version ${idx + 1} — ${new Date(version.timestamp).toLocaleString()}`;
        versionItem.appendChild(header);

        const nameEl = document.createElement('div');
        nameEl.textContent = `Name: ${version.name}`;
        versionItem.appendChild(nameEl);

        const typeEl = document.createElement('div');
        typeEl.textContent = `Type: ${version.type}`;
        versionItem.appendChild(typeEl);

        const notesEl = document.createElement('div');
        notesEl.textContent = `Notes: ${version.notes}`;
        versionItem.appendChild(notesEl);

        const urlEl = document.createElement('div');
        urlEl.textContent = `URL: ${version.url || '—'}`;
        versionItem.appendChild(urlEl);

        versionsContainer.appendChild(versionItem);
      });
    } catch (err) {
      const errorMsg = document.createElement('p');
      errorMsg.textContent = "Failed to load history: " + err.message;
      errorMsg.style.color = 'red';
      versionsContainer.appendChild(errorMsg);
    }
  };

  loadHistory();

  const closeBtn = reactiveButton(new Stream("Close"), () => {
    modal.remove();
  }, { outline: true }, themeStream);

  content.appendChild(closeBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}
