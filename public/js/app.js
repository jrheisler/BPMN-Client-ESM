import customReplaceModule from './modules/customReplaceMenuProvider.js';
import { createRaciMatrix } from './components/raciMatrix.js';
import { reactiveButton, dropdownStream, showToast } from './components/index.js';
import { showProperties, hideSidebar } from './components/showProperties.js';
import { treeStream, setSelectedId, setOnSelect, togglePanel } from './components/diagramTree.js';
import { logUser, currentUser, authMenuOption } from './auth.js';
import { openDiagramPickerModal, promptDiagramMetadata, selectVersionModal } from './modals/index.js';
import { Stream } from './core/stream.js';
import { currentTheme, applyThemeToPage, themedThemeSelector } from './core/theme.js';
import BpmnSnapping from 'bpmn-js/lib/features/snapping';
import './addons/store.js';
import './palette-toggle.js';
import { row } from './components/layout.js';
import { db } from './firebase.js';
import { doc, collection, updateDoc, setDoc, addDoc, getDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { setupPageScaffolding, createHiddenFileInput } from './app/init.js';
import { typeIcons, createOverlay, setupCanvasLayout, attachOverlay } from './app/overlay.js';
import { setupTimeline } from './app/timeline.js';
import { timelineEntries, setTimelineEntries, updateTimelineEntry } from './modules/timeline.js';
import { initializeAddOnServices, setupAvatarMenu } from './app/addons.js';
import { bootstrapSimulation } from './app/simulation.js';
// Initialization function will handle dynamic imports and DOM setup later.

// A reactive store of the current user’s addOns
const addOnsStream = new Stream([]);
window.addOnsStream = addOnsStream;
// Example options for the avatar (styling options)
const avatarOptions = { width: '60px', height: '60px', rounded: true };


const notesStream = new Stream(null);
window.notesStream = notesStream;
const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                    id="Definitions_1">
    <bpmn:process id="Process_1" isExecutable="true">
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>Flow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>Flow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" />
    </bpmn:process>
    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
        <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
          <dc:Bounds x="173" y="81" width="36" height="36" />
        </bpmndi:BPMNShape>
        <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
          <dc:Bounds x="329" y="81" width="36" height="36" />
        </bpmndi:BPMNShape>
        <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
          <di:waypoint x="209" y="99" />
          <di:waypoint x="329" y="99" />
        </bpmndi:BPMNEdge>
      </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
  </bpmn:definitions>`;

// === Initial BPMN XML template ===
const diagramXMLStream = new Stream(defaultXml);
async function init() {
  const { addOnStore } = window;

  const avatarStream = new Stream('flow.png');
let currentDiagramId = null;
let diagramName = null;
let diagramVersion = 1;
const diagramDataStream = new Stream(null);
const nameStream = new Stream(diagramName);

const versionStream = new Stream(diagramVersion);
const overlay = createOverlay({
  nameStream,
  versionStream,
  currentTheme
});

const { canvasEl, header } = setupPageScaffolding({ currentTheme });
setupCanvasLayout({ canvasEl, header, currentTheme });

  // ─── pull in the UMD globals ───────────────────────────────────────────────
  const { BpmnJS }       = window;
  const layoutProcess    = window.bpmnAutoLayout?.layoutProcess;
  const NavigatorModule  = window.NavigatorModule;
  
  // ─── sanity check ───────────────────────────────────────────────────────────
  if (typeof BpmnJS !== 'function') {
    console.error("bpmn-js not found! Did you load the UMD bundle?");
    return;
  }

  // ─── instantiate modeler with navigator only ───────────────────────────────
  const navModule = window.navigatorModule || window.bpmnNavigator;

  const additionalModules = [
    customReplaceModule,
    BpmnSnapping
  ];
  if (navModule) additionalModules.push(navModule);

  // load custom moddle descriptor for variables and mappings
  const customModdle = await fetch('js/custom-moddle.json').then(r => r.json());

  const modeler = new BpmnJS({
    container:       canvasEl,
    selection:       { mode: 'multiple' },
    additionalModules,
    moddleExtensions: { custom: customModdle }
    });
  // ─── expose services ────────────────────────────────────────────────────────
  const moddle          = modeler.get('moddle');
  const elementFactory  = modeler.get('elementFactory');
  const modeling        = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const selectionService= modeler.get('selection');
  const canvas          = modeler.get('canvas');
  const eventBus        = modeler.get('eventBus');
  const overlays        = modeler.get('overlays');

  const timelineController = setupTimeline({
    canvas,
    eventBus,
    elementRegistry,
    onEditEntry(entry) {
      const initialName = entry.metadata?.name ?? entry.label ?? '';
      const initialNotes = entry.metadata?.notes ?? '';

      promptDiagramMetadata(initialName, initialNotes, currentTheme).subscribe(metadata => {
        if (!metadata) return;

        updateTimelineEntry(entry.id, {
          label: metadata.name?.trim() || entry.label || '',
          metadata: { ...entry.metadata, ...metadata }
        });
      });
    }
  });

  const { simulation } = bootstrapSimulation({ modeler, currentTheme });

  const clamp01 = value => Math.min(Math.max(value ?? 0, 0), 1);

  function getProcessBusinessObject() {
    const root = canvas.getRootElement();
    if (!root) return null;

    if (root.type === 'bpmn:Collaboration') {
      const participants = root.children || [];
      for (const participant of participants) {
        const processRef = participant?.businessObject?.processRef;
        if (processRef) {
          return processRef;
        }
      }
      return null;
    }

    return root.businessObject || null;
  }

  function ensureExtensionElements(businessObject) {
    if (!businessObject) return null;

    if (!businessObject.extensionElements) {
      businessObject.extensionElements = moddle.create('bpmn:ExtensionElements');
    }

    if (!Array.isArray(businessObject.extensionElements.values)) {
      businessObject.extensionElements.values = businessObject.extensionElements.values
        ? [].concat(businessObject.extensionElements.values)
        : [];
    }

    return businessObject.extensionElements;
  }

  function ensureTimelineExtension(businessObject) {
    const extensionElements = ensureExtensionElements(businessObject);
    if (!extensionElements) return null;

    let timelineExtension = extensionElements.values.find(value => value.$type === 'custom:Timeline');

    if (!timelineExtension) {
      timelineExtension = moddle.create('custom:Timeline');
      timelineExtension.entries = [];
      extensionElements.values.push(timelineExtension);
    }

    if (!Array.isArray(timelineExtension.entries)) {
      timelineExtension.entries = timelineExtension.entries ? [].concat(timelineExtension.entries) : [];
    }

    return timelineExtension;
  }

  function removeTimelineExtension(businessObject) {
    const extensionElements = businessObject?.extensionElements;
    if (!extensionElements?.values) {
      return;
    }

    extensionElements.values = extensionElements.values.filter(value => value.$type !== 'custom:Timeline');

    if (!extensionElements.values.length) {
      businessObject.extensionElements = null;
    }
  }

  function serializeTimelineExtension() {
    const processBo = getProcessBusinessObject();
    if (!processBo) return;

    const entries = timelineEntries.get() || [];

    if (!entries.length) {
      removeTimelineExtension(processBo);
      return;
    }

    const timelineExtension = ensureTimelineExtension(processBo);
    if (!timelineExtension) return;

    timelineExtension.entries = entries.map(entry => {
      const metadata = entry.metadata && Object.keys(entry.metadata).length
        ? JSON.stringify(entry.metadata)
        : null;

      const timelineEntryBo = moddle.create('custom:TimelineEntry', {
        id: entry.id,
        position: clamp01(entry.offset),
        label: entry.label ?? ''
      });

      if (entry.color) {
        timelineEntryBo.color = entry.color;
      }

      if (metadata) {
        timelineEntryBo.metadata = metadata;
      }

      return timelineEntryBo;
    });
  }

  function hydrateTimelineFromProcess() {
    const processBo = getProcessBusinessObject();
    if (!processBo) {
      setTimelineEntries([]);
      return;
    }

    const extensionElements = processBo.extensionElements;
    const values = extensionElements?.values || [];
    const timelineExtension = values.find(value => value.$type === 'custom:Timeline');

    if (!timelineExtension) {
      setTimelineEntries([]);
      return;
    }

    const deserialized = (timelineExtension.entries || []).map(entry => {
      const rawPosition = entry.position ?? entry.offset ?? 0;
      const numericPosition = typeof rawPosition === 'number'
        ? rawPosition
        : parseFloat(rawPosition) || 0;

      let metadata = {};
      if (typeof entry.metadata === 'string' && entry.metadata.trim()) {
        try {
          metadata = JSON.parse(entry.metadata);
        } catch (err) {
          console.warn('Failed to parse timeline entry metadata:', err);
          metadata = {};
        }
      }

      return {
        id: entry.id || undefined,
        offset: clamp01(numericPosition),
        label: entry.label ?? '',
        color: entry.color || null,
        metadata
      };
    });

    setTimelineEntries(deserialized);
    timelineController?.update?.();
  }

  async function saveXMLWithTimeline(options = {}) {
    serializeTimelineExtension();
    return modeler.saveXML(options);
  }

  const { scheduleOverlayUpdate, loadAddOnData, applyAddOnsToElements, syncAddOnStoreFromElements } =
    initializeAddOnServices({
      overlays,
      elementRegistry,
      modeling,
      canvas,
      currentTheme,
      addOnStore,
      diagramXMLStream,
      typeIcons
    });

  const commandStack = modeler.get('commandStack');
  const isDirty = new Stream(false);
  const showSaveButton = new Stream(false);

  // push every change into your XML Stream:
  eventBus.on('commandStack.changed', async () => {
      try {
        const { xml } = await saveXMLWithTimeline({ format: true });
        diagramXMLStream.set(xml);
        isDirty.set(true);
        syncAddOnStoreFromElements();
      } catch (err) {
        console.error('failed to save current XML:', err);
      }
  });

  let treeBtn;
  setOnSelect(id => {
    const element = elementRegistry.get(id);
    if (element) {
      selectionService.select(element);
      showProperties(element, modeling, moddle);
    }
    setSelectedId(id);
  });

  eventBus.on('selection.changed', ({ newSelection }) => {
    const element = newSelection[0];
    setSelectedId(element?.id || null);
  });

  function updateDiagramTree() {
    const registry = modeler.get('elementRegistry');
    const canvas = modeler.get('canvas');
    let root = canvas.getRootElement();
    if (root.type === 'bpmn:Collaboration' && root.children?.length) {
      root = root.children[0]; // pick first participant/process
    }
    if (!root) {
      treeStream.set(null);
      return;
    }

    const visited = new Set();

    function build(node) {
      if (!node || visited.has(node.id)) return null;
      visited.add(node.id);

      const owner = node.businessObject?.get('ownerRole') || '';

      // Classify element type for tree rendering
      let kind = 'node';
      if (node.type === 'label' || node.businessObject?.$type === 'bpmn:TextAnnotation') {
        kind = 'text';
      } else if (node.waypoints) {
        kind = 'line';
      }

      const children = (node.children || [])
        .map(build)
        .filter(Boolean);

      return {
        id: node.id,
        name: node.businessObject?.name || '',
        owner,
        kind,
        children
      };
    }

    const tree = build(root);
    treeStream.set(tree);
  }
  // ─── theme (page background) ────────────────────────────────────────────────
  currentTheme.subscribe(applyThemeToPage);
 
  // ─── hidden file-input for BPMN import ──────────────────────────────────────
  const fileInput = createHiddenFileInput({
    accept: '.bpmn,.xml',
    onChange: async e => {
      const file = e.target.files[0];
      if (!file) return;
      const xml = await file.text();

      // Store the new XML in your stream
      diagramXMLStream.set(xml);

      // Append the new diagram to the current diagram
      await appendXml(xml);
    }
  });

async function appendXml(xml) {
  try {
    // Import the new XML into the current diagram
    await modeler.importXML(xml);
    hydrateTimelineFromProcess();
    updateDiagramTree();
    syncAddOnStoreFromElements();
    scheduleOverlayUpdate();
    

    // Get the current diagram's canvas
    const canvas = modeler.get('canvas');
    const currentRootElement = canvas.getRootElement();

    // If you want to adjust the zoom level (optional)
    const svg = canvasEl.querySelector('svg');
    if (svg) svg.style.height = '100%';

    // Use BPMN-js API to append new diagram elements (if needed)
    // This could include positioning, adjusting flow, or modifying specific elements

    // Example: Add new elements and modify existing ones if needed
    // You might need to adjust connections or nodes depending on how your diagrams are structured
    const modeling = modeler.get('modeling');

    // Example: Optionally adjust the position of the imported elements
    modeling.moveElements([/* elements to move */], { x: 100, y: 100 });

  } catch (err) {
    console.error("Error appending BPMN XML:", err);
  }
}
  // ─── import / initial render ───────────────────────────────────────────────
  async function importXml(xml) {
    try {
      await modeler.importXML(xml);
      hydrateTimelineFromProcess();
      updateDiagramTree();
      syncAddOnStoreFromElements();
      scheduleOverlayUpdate();
      const svg = canvasEl.querySelector('svg');
      if (svg) svg.style.height = '100%';
      simulation.clearTokenLog();
      simulation.reset();
    } catch (err) {
      console.error("Import error:", err);
    }
  }
  importXml(diagramXMLStream.get());


const jsonFileInput = createHiddenFileInput({
  accept: '.json',
  onChange: async e => {
    const file = e.target.files[0];
    if (!file) return;

    const json = JSON.parse(await file.text());
    await importJson(json);
  }
});


  // ─── build controls bar ────────────────────────────────────────────────────

// hide the “Save” button until there are edits and logged in…


const saveBtn = reactiveButton(
  new Stream('💾'),
  async () => {
    console.debug('Save button pressed');
    syncAddOnStoreFromElements();
    const allAddOns = addOnStore.getAllAddOns();
    applyAddOnsToElements(allAddOns);
    const { xml } = await saveXMLWithTimeline({ format: true });

    // Use fallback/defaults if diagramDataStream is null
    const currentDiagramData = diagramDataStream.get() || {
      name: '',      
      versions: []
    };

    const currentNotes = notesStream.get() || '';




    // Destructure metadata from currentDiagramData
    const { name: initialName, versions } = currentDiagramData;
    const initialNotes = currentNotes;

    // Prompt the user to edit metadata (if necessary)
    promptDiagramMetadata(initialName, initialNotes, currentTheme).subscribe(async metadata => {
      if (!metadata) return; // If metadata is null, exit

      // Metadata received

      const localTimestamp = Date.now();

      // If we have an existing diagram, update it
      if (currentDiagramId) {
        // 🔁 UPDATE EXISTING DIAGRAM
        const diagramRef = doc(db, 'users', currentUser.uid, 'diagrams', currentDiagramId);

        // Add the new version to the diagram
        await updateDoc(diagramRef, {
          name: metadata.name, // Update diagram name
          lastUpdated: Timestamp.fromMillis(localTimestamp), // Update lastUpdated
          versions: arrayUnion({
            xml, // Save XML data
            timestamp: localTimestamp, // Timestamp of this version
            notes: metadata.notes, // Save the updated notes
            addOns: allAddOns
          })
        });

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const diagrams = userDoc.data()?.diagrams || [];

        const updatedIndex = diagrams.map(d =>
          d.id === currentDiagramId
            ? { ...d, name: metadata.name, notes: metadata.notes, lastUpdated: localTimestamp }
            : d
        );


        // Save the updated index list back to Firestore
        await setDoc(
          doc(db, 'users', currentUser.uid),
          { diagrams: updatedIndex },
          { merge: true }
        );

        // Update local diagram metadata state
        diagramDataStream.set({
          ...currentDiagramData,
          name: metadata.name, // Update name locally
          notes: metadata.notes, // Update notes locally
          lastUpdated: localTimestamp, // Update lastUpdated locally
          versions: [...versions, { xml, timestamp: localTimestamp, notes: metadata.notes, addOns: allAddOns }]
        });

      } else {
        // 🆕 CREATE NEW DIAGRAM
        const diagramRef = await addDoc(
          collection(doc(db, 'users', currentUser.uid), 'diagrams'),
          {
            name: metadata.name || 'Untitled Diagram',
            versions: [{ xml, timestamp: localTimestamp, notes: metadata.notes, addOns: allAddOns }],
            lastUpdated: Timestamp.fromMillis(localTimestamp)
          }
        );

        const newIndexEntry = {
          id: diagramRef.id,
          name: metadata.name || 'Untitled Diagram',
          notes: metadata.notes, // Ensure we add the notes
          lastUpdated: localTimestamp
        };

        // Add the new diagram to the user's index list
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            diagrams: arrayUnion(newIndexEntry)
          },
          { merge: true }
        );

        // Update the diagram ID locally and metadata stream
        currentDiagramId = diagramRef.id;
        diagramDataStream.set({
          ...currentDiagramData,
          id: currentDiagramId,
          name: metadata.name || 'Untitled Diagram',
          notes: metadata.notes, // Update notes here as well
          lastUpdated: localTimestamp,
          versions: [{ xml, timestamp: localTimestamp, notes: metadata.notes, addOns: allAddOns }]
        });
      }

      // Set dirty state to false and show success toast
      isDirty.set(false);
      showToast("Diagram saved successfully!", { type: 'success' });
    });
  },
  {
    outline: true,
    disabled: isDirty,
    title: "Save",
    visible: showSaveButton
  }
);





// when dirty changes, enable/disable the button automatically:
isDirty.subscribe(d => {
  saveBtn.disabled = !d;
  saveBtn.style.opacity = d ? '1' : '0.5';
  saveBtn.style.cursor  = d ? 'pointer' : 'not-allowed';
});

// when showSaveButton changes, enable/disable the button automatically:
showSaveButton.subscribe(d => {
  if (d) {
    saveBtn.visible = true;
  } else {
    saveBtn.visible = false;
  }
});



              

let rebuildMenu = () => {};

// Example dropdown options (choices)
function buildDropdownOptions() {
  return [        
        ...(currentUser ? [
        {
        label: "📋 Select or New Diagram",
        onClick: () => {
          openDiagramPickerModal().subscribe(result => {
            if (result === null) {
            } else if (result.new) {
              currentDiagramId = null;
              diagramDataStream.set(null);
              diagramName = null;
              diagramVersion = 1;
              nameStream.set(diagramName);
              notesStream.set(null); 
              versionStream.set(diagramVersion); // wherever version is selected
              clearModeler();
            } else {
               const { id, data } = result;
              currentDiagramId = id;

              // size check
              // Assuming result.data is the diagram data that was fetched from Firestore
              const diagramData = result.data;

              // Convert diagram data to JSON string
              const diagramDataJson = JSON.stringify(diagramData);

              // Get the size of the JSON string in bytes
              const dataSizeInBytes = new Blob([diagramDataJson]).size;

              // Firestore document size limit (in bytes)
              const firestoreLimit = 1048576; // 1MB in bytes

              // Check if the size is approaching the limit
              if (dataSizeInBytes > firestoreLimit * 0.9) {
                showToast(`Warning: Diagram data size is approaching the Firestore 1MB limit. Current size: ${dataSizeInBytes} bytes`, { type: 'warning' });
              } else {
                showToast(`Diagram data size is within limits. Current size: ${dataSizeInBytes} bytes`, { type: 'warning' });
              }

              // Set the diagram data
              diagramDataStream.set(diagramData);

              // Handle diagram name and versioning
              diagramName = data.name || `Untitled (${id})`;
              nameStream.set(diagramName);
              
              // Handling versions
              const versions = data.versions || [];

              if (!versions.length) {
                showToast("Diagram has no versions", { type: 'warning' });
                return;
              }

              // Build choices for the dropdown
              const versionChoices = versions.map((ver, index) => ({
                value: index.toString(),
                label: `Version ${index + 1} — ${new Date(ver.timestamp).toLocaleString()}`
              })).reverse();

              versionStream.set((versions.length - 1).toString()); // Default to latest version
              const dropdown = dropdownStream(versionStream, {
                choices: versionChoices,
                width: '100%',
                margin: '0.5rem 0'
              });

              // Handle confirm button click (loading selected version)
              const confirmBtn = reactiveButton(new Stream("📥 Load Selected Version"), async () => {
                const selectedIndex = parseInt(versionStream.get(), 10);
                const selectedVersion = versions[selectedIndex];

                if (selectedVersion?.xml) {
                  diagramVersion = selectedIndex + 1;
                  versionStream.set(diagramVersion); // wherever version is selected

                  await importXml(selectedVersion.xml);
                  if (selectedVersion.addOns) {
                    loadAddOnData(selectedVersion.addOns);
                  } else {
                    syncAddOnStoreFromElements();
                  }
                } else {
                  showToast("Selected version has no XML", { type: 'warning' });
                }

                modal.remove();
                }, { accent: true }, currentTheme);

                const modal = document.createElement('div');
                Object.assign(modal.style, {
                  position: 'fixed',
                  top: '0',
                  left: '0',
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: '9999'
                });

                const box = document.createElement('div');
                Object.assign(box.style, {
                  backgroundColor: currentTheme.get().colors.surface,
                  color: currentTheme.get().colors.foreground,
                  padding: '1.5rem',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minWidth: '360px',
                  fontFamily: currentTheme.get().fonts?.base || 'system-ui, sans-serif',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                });

                const label = document.createElement('label');
                label.textContent = `Choose version for "${diagramName}"`;
                label.style.fontWeight = 'bold';
                box.appendChild(label);

                box.appendChild(dropdown);
                box.appendChild(confirmBtn);
                modal.appendChild(box);
                document.body.appendChild(modal);

                modal.addEventListener('click', e => {
                  if (e.target === modal) modal.remove();
                });
              }
          });
        }
      },
      {
        label: "🔁 Switch Version",            
        onClick: () => {           
          const versions = diagramDataStream.get().versions;

          selectVersionModal(diagramName, versions).subscribe(async index => {
            if (index == null) return;

            const selected = versions[index]; // No reversing, index is direct
            diagramVersion = index + 1;
            versionStream.set(diagramVersion);

            if (selected?.xml) {
              await importXml(selected.xml);
              if (selected.addOns) {
                loadAddOnData(selected.addOns);
              } else {
                syncAddOnStoreFromElements();
              }
              showToast("Loaded version " + diagramVersion, { type: 'success' });
            } else {
              showToast("Selected version has no XML", { type: 'warning' });
            }
          });
        }
      },
      {
        label: "🧩 Add AddOns", 
        onClick: () => {
          window.openAddOnChooserModal().subscribe(selectedAddOn => {
            if (selectedAddOn) {
              // Process the selected AddOn (either picked, newly added, or edited)

              // 👉 Here you can attach it to your diagram element, if needed.
              // e.g., handleAttachmentSelection(selectedAddOn.address, ...);
            }
          });
        } 
      }

    ] : []),
    { label: "📂 Import BPMN file", onClick: () => fileInput.click() },
    {
      label: '📄 Download XML', onClick: async () => {
        try {
          const { xml } = await saveXMLWithTimeline({ format: true });
          const blob = new Blob([xml], { type: 'application/xml' });
          const url  = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = 'diagram.bpmn';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          diagramXMLStream.set(xml);
        } catch (err) {
          console.error("Export failed:", err);
        }
      }
    },
    authMenuOption({ avatarStream, showSaveButton, currentTheme, rebuildMenu })
  ];
}

  const menuManager = setupAvatarMenu({
    avatarStream,
    avatarOptions,
    currentTheme,
    buildDropdownOptions,
    diagramDataStream
  });
  rebuildMenu = menuManager.rebuildMenu;
  rebuildMenu();
  const avatarMenu = menuManager.avatarMenu;

  function openRaciMatrixModal() {
    const matrix = createRaciMatrix(modeler);
    if (!matrix) return;

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
      zIndex: 10000
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      maxHeight: '80vh',
      overflowY: 'auto',
      padding: '1rem',
      borderRadius: '8px'
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginBottom = '0.5rem';

    box.appendChild(closeBtn);
    box.appendChild(matrix);
    modal.appendChild(box);
    document.body.appendChild(modal);

    function applyTheme(theme) {
      const { colors } = theme;
      box.style.background = colors.surface;
      box.style.color = colors.foreground;
      closeBtn.style.background = 'transparent';
      closeBtn.style.color = colors.foreground;
      closeBtn.style.border = `1px solid ${colors.border}`;
    }

    const unsubscribe = currentTheme.subscribe(applyTheme);
    applyTheme(currentTheme.get());

    function close() {
      closeBtn.removeEventListener('click', close);
      modal.removeEventListener('click', onOverlayClick);
      unsubscribe();
      modal.remove();
    }

    function onOverlayClick(e) {
      if (e.target === modal) close();
    }

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', onOverlayClick);
  }

  const controls = [
  // 1) avatar menu
  avatarMenu,

  // Simulation controls
  reactiveButton(
    new Stream("▶"),
    () => simulation.start(),
    {
      outline: true,
      title: "Play"
    }
  ),
  reactiveButton(new Stream("⏸"), () => simulation.pause(), { outline: true, title: "Pause" }),
  reactiveButton(new Stream("⏭"), () => simulation.step(), { outline: true, title: "Step" }),

  // ─── Continuous Zoom In ────────────────────────────────────────────────────
  reactiveButton(
    new Stream("➕"),
    () => {
      const canvas = modeler.get('canvas');
      const vb     = canvas.viewbox();                 // { x, y, width, height, scale }
      const next   = vb.scale * 1.2;                   // bump up by 20%
      canvas.zoom(next, true);                         // 'true' keeps it centered
    },
    { outline: true, title: "Zoom In" }
  ),

  // ─── Continuous Zoom Out ───────────────────────────────────────────────────
  reactiveButton(
    new Stream("➖"),
    () => {
      const canvas = modeler.get('canvas');
      const vb     = canvas.viewbox();
      const next   = vb.scale * 0.8;                   // shrink by 20%
      canvas.zoom(next, true);
    },
    { outline: true, title: "Zoom Out" }
  ),

  // ─── center
    reactiveButton(new Stream("↔"), () => modeler.get('canvas').zoom('fit-viewport'), { outline: true, title: "Stretch" }),

  // ─── Continuous Zoom Out Export PNG
    reactiveButton(new Stream("📷"), async () => {
      const { svg } = await modeler.saveSVG();
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img,0,0);
        c.toBlob(b => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'diagram.png';
          a.click();
        });
      };
      }, { outline: true, title: "Download as PNG" })
  ];

  controls.push(saveBtn);

  let treeToggle = () => {};
  treeBtn = reactiveButton(
    new Stream("🌳"),
    () => treeToggle && treeToggle(),
    { outline: true, title: "Toggle diagram tree" }
  );
  treeBtn.id = 'diagram-tree-toggle';
  controls.push(treeBtn);

  (function bindTreeToggle() {
    if (togglePanel) {
      treeToggle = togglePanel;
    } else {
      requestAnimationFrame(bindTreeToggle);
    }
  })();
  controls.push(
    reactiveButton(
      new Stream('📊'),
      openRaciMatrixModal,
      { outline: true, title: 'RACI Matrix', 'aria-label': 'RACI Matrix' }
    )
  );
  controls.push(
    reactiveButton(
      new Stream('❔'),
      () => window.openHelpGuideModal(),
      { outline: true, title: 'Help guide' }
    )
  );
  controls.push(themedThemeSelector());

  const controlsBar = row(controls, {
    justify: 'flex-start',
    align:   'center',
    padding: '1rem',
    bg:      currentTheme.get().colors.surface,
    wrap:    true,
  });

  // keep background / border in sync
  currentTheme.subscribe(theme => {
    controlsBar.style.backgroundColor = theme.colors.surface;
    controlsBar.style.borderBottom    = `1px solid ${theme.colors.border}`;
  });

  // insert the controls bar before the canvas
  document.body.insertBefore(controlsBar, canvasEl);

  // 6) Wire up double-click on any BPMN element
  eventBus.on('element.dblclick', ({ element }) => {
    if (element.type && element.type.startsWith('bpmn:')) {
      showProperties(element, modeling, moddle);
    }
  });

  // 7) Hide sidebar if user clicks elsewhere

 
  const canvasContainer = modeler.get('canvas').getContainer();
  
  canvasContainer.addEventListener('click', () => {
    hideSidebar();
  });


  // ─── theming overrides ────────────────────────────────────────────────────
const bpmnThemeStyle = document.createElement('style');
document.head.appendChild(bpmnThemeStyle);

currentTheme.subscribe(theme => {
  const { colors, bpmn } = theme;

  bpmnThemeStyle.textContent = `
    /* canvas background */
    #canvas,
    #canvas .djs-container,
    #canvas .djs-container svg {
      background: ${colors.background} !important;
      --canvas-fill-color: ${colors.background};
    }

    /* ── base shape styles ──────────────────────────────────────────────── */
    .djs-element .djs-shape {
      fill: ${bpmn.shape.fill} !important;
      stroke: ${bpmn.shape.stroke} !important;
      stroke-width: ${bpmn.shape.strokeWidth}px !important;
    }

    /* ── BPMN element specifics ─────────────────────────────────────────── */
    .djs-element[class*="start-event"] .djs-shape {
      fill: ${bpmn.startEvent.fill} !important;
      stroke: ${bpmn.startEvent.stroke} !important;
    }
    .djs-element[class*="end-event"] .djs-shape {
      fill: ${bpmn.endEvent.fill} !important;
      stroke: ${bpmn.endEvent.stroke} !important;
    }
    .djs-element[class*="task"] .djs-shape {
      fill: ${bpmn.task.fill} !important;
      stroke: ${bpmn.task.stroke} !important;
    }
    .djs-element[class*="gateway"] .djs-shape {
      fill: ${bpmn.gateway.fill} !important;
      stroke: ${bpmn.gateway.stroke} !important;
    }

    /* keep event outlines clear if you like: */
    .djs-element.djs-event .djs-shape {
      stroke-width: ${bpmn.shape.strokeWidth}px !important;
    }

    /* ── text labels use theme-defined fill with foreground fallback ───── */
    .djs-element .djs-label {
      fill: ${bpmn.label.fill || colors.foreground} !important;
      font-family: ${bpmn.label.fontFamily} !important;
    }

    /* ── connections & arrows ───────────────────────────────────────────── */
    .djs-connection .djs-connection-inner,
    .djs-connection .djs-connection-outer {
      stroke: ${bpmn.connection.stroke} !important;
      stroke-width: ${bpmn.connection.strokeWidth}px !important;
    }
    .djs-connection .djs-marker {
      fill: ${bpmn.marker.fill} !important;
      stroke: ${bpmn.marker.stroke} !important;
    }

    /* ── selected styles ───────────────────────────────────────────────── */
    .djs-element.djs-element-selected .djs-shape,
    .djs-connection.djs-connection-selected .djs-outline {
      stroke: ${bpmn.selected.stroke} !important;
      stroke-width: ${bpmn.selected.strokeWidth}px !important;
    }

    /* ── simulation active token highlight ─────────────────────────────── */
    .djs-element.active .djs-visual > :nth-child(1),
    .djs-connection.active .djs-visual > path {
      stroke: ${colors.accent} !important;
      stroke-width: 4px !important;
    }

    /* ── direct editing overlay ───────────────────────────────────────── */
    .djs-direct-editing-parent,
    .djs-direct-editing-content {
      background: ${colors.surface} !important;
      color: ${colors.foreground} !important;
      border: 1px solid ${colors.border} !important;
      outline: 1px solid ${colors.border} !important;
    }
  `;
});

function clearModeler() {

  importXml(defaultXml).then(() => {
    addOnStore.clear();
    scheduleOverlayUpdate();
    const canvas = modeler.get('canvas');
    canvas.zoom('fit-viewport');
    diagramXMLStream.set(defaultXml);
    isDirty.set(false);
  }).catch(err => {
    console.error("Failed to clear modeler:", err);
  });
  currentDiagramId = null;
  diagramName = null;
  nameStream.set(diagramName);
  diagramVersion = 1;  
  versionStream.set(diagramVersion); // wherever version is selected
}

     
attachOverlay(overlay);

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
