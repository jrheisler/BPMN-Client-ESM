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
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import './addons/store.js';
import './palette-toggle.js';
import { row } from './components/layout.js';
import * as firebaseModule from './firebase.js';
import { doc, collection, updateDoc, setDoc, addDoc, getDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { setupPageScaffolding, createHiddenFileInput } from './app/init.js';
import { typeIcons, createOverlay, setupCanvasLayout, attachOverlay } from './app/overlay.js';
import { setupTimeline } from './app/timeline.js';
import { timelineEntries, setTimelineEntries, updateTimelineEntry, spaceTimelineEntriesEvenly, removeTimelineEntry } from './modules/timeline.js';
import { initializeAddOnServices, setupAvatarMenu } from './app/addons.js';
import { bootstrapSimulation } from './app/simulation.js';
import { promptTimelineEntryMetadata } from './timeline/entryModal.js';
// Initialization function will handle dynamic imports and DOM setup later.

const DEBUG_FORCE_LABEL_NORMAL = true;

function resolveFirebaseExports(module) {
  return {
    getFirebase: module?.getFirebase ?? module?.default,
    showFirebaseLoading: module?.showFirebaseLoading ?? (() => {}),
    hideFirebaseLoading: module?.hideFirebaseLoading ?? (() => {})
  };
}

let { getFirebase, showFirebaseLoading, hideFirebaseLoading } = resolveFirebaseExports(firebaseModule);

if (typeof getFirebase !== 'function') {
  console.warn('Firebase module missing expected exports; attempting fallback client.');

  const fallbackModule = await import('./firebase.example.js').catch(() => null);
  ({ getFirebase, showFirebaseLoading, hideFirebaseLoading } = resolveFirebaseExports(fallbackModule ?? {}));
}

if (typeof getFirebase !== 'function') {
  throw new Error('Firebase client failed to load. Ensure firebase.js exports getFirebase().');
}

// A reactive store of the current user’s addOns
const addOnsStream = new Stream([]);
window.addOnsStream = addOnsStream;
// Example options for the avatar (styling options)
const avatarOptions = { width: '60px', height: '60px', rounded: true };


const notesStream = new Stream(null);
window.notesStream = notesStream;
const minimalThemeEnabled = new Stream(false);
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
let cleanupCurrentModeler = null;

const loadCustomModdle = (() => {
  let moddlePromise = null;

  return () => {
    if (!moddlePromise) {
      moddlePromise = fetch('js/custom-moddle.json', { cache: 'force-cache' }).then(r => r.json());
    }

    return moddlePromise;
  };
})();

function waitForIdle() {
  return new Promise(resolve => {
    const start = () => queueMicrotask(resolve);

    if ('requestIdleCallback' in window) {
      requestIdleCallback(start);
    } else {
      setTimeout(start, 0);
    }
  });
}

let shellLayout = null;
function ensureShellLayout() {
  if (shellLayout) return shellLayout;

  const { canvasEl, header } = setupPageScaffolding({ currentTheme });
  setupCanvasLayout({ canvasEl, header, currentTheme });

  if (!canvasEl.style.position) {
    canvasEl.style.position = 'relative';
  }

  const spinner = document.createElement('div');
  spinner.id = 'modeler-loading-indicator';
  spinner.textContent = 'Loading diagram…';
  Object.assign(spinner.style, {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--canvas-spinner-bg, rgba(0,0,0,0.04))',
    color: 'var(--canvas-spinner-fg, #333)',
    fontSize: '1rem',
    zIndex: 5,
    pointerEvents: 'none'
  });
  spinner.hidden = true;
  canvasEl.appendChild(spinner);

  shellLayout = { canvasEl, header, spinner };
  return shellLayout;
}

function toggleShellSpinner(visible) {
  const shell = ensureShellLayout();
  shell.spinner.hidden = !visible;
  shell.spinner.style.display = visible ? 'grid' : 'none';
  shell.spinner.setAttribute('aria-hidden', String(!visible));
}

function primeCustomModdleFetch() {
  waitForIdle().then(() => loadCustomModdle().catch(err => {
    console.warn('Failed to prefetch custom moddle descriptor:', err);
  }));
}

async function init() {
  const shell = ensureShellLayout();
  toggleShellSpinner(true);

  await waitForIdle();

  const { addOnStore } = window;

  cleanupCurrentModeler?.();

  const cleanups = [];
  const registerCleanup = fn => {
    if (typeof fn === 'function') {
      cleanups.push(fn);
    }
  };

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

const { canvasEl, header } = shell;

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
    BpmnSnapping,
    GridSnappingModule
  ];
  if (navModule) additionalModules.push(navModule);

  // load custom moddle descriptor for variables and mappings
  const customModdle = await loadCustomModdle();

  const modeler = new BpmnJS({
    container:       canvasEl,
    selection:       { mode: 'multiple' },
    additionalModules,
    gridSnapping:    { active: true },
    moddleExtensions: { custom: customModdle }
  });

  // Ensure any cloud loading indicator is cleared once a diagram finishes importing
  modeler.on('import.done', hideFirebaseLoading);
  modeler.on('import.error', hideFirebaseLoading);
  // ─── expose services ────────────────────────────────────────────────────────
  const moddle          = modeler.get('moddle');
  const elementFactory  = modeler.get('elementFactory');
  const modeling        = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const selectionService= modeler.get('selection');
  const alignElements   = modeler.get('alignElements');
  const canvas          = modeler.get('canvas');
  const eventBus        = modeler.get('eventBus');
  const overlays        = modeler.get('overlays');

  const timelineController = setupTimeline({
    canvas,
    eventBus,
    elementRegistry,
    themeStream: currentTheme,
    onEditEntry(entry) {
      const initialLabel = entry.label ?? '';
      const initialNotes = entry.metadata?.notes ?? '';

      promptTimelineEntryMetadata(initialLabel, initialNotes, currentTheme, { allowDelete: true }).subscribe(result => {
        if (!result) return;

        if (result.delete) {
          removeTimelineEntry(entry.id);
          return;
        }

        updateTimelineEntry(entry.id, result);
      });
    }
  });

  const { simulation } = bootstrapSimulation({ modeler, currentTheme });

  let isHydratingTimeline = false;

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
    isHydratingTimeline = true;

    try {
      const processBo = getProcessBusinessObject();
      if (!processBo) {
        setTimelineEntries([]);
        timelineController?.update?.();
        return;
      }

      const extensionElements = processBo.extensionElements;
      const values = extensionElements?.values || [];
      const timelineExtension = values.find(value => value.$type === 'custom:Timeline');

      if (!timelineExtension) {
        setTimelineEntries([]);
        timelineController?.update?.();
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
    } finally {
      isHydratingTimeline = false;
    }
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
      debugBpmnLabelStyles();
    } catch (err) {
      console.error("Import error:", err);
    }
  }
  await importXml(diagramXMLStream.get());

  let skipTimelineEmission = true;
  const unsubscribeTimelineEntries = timelineEntries.subscribe(async () => {
    if (skipTimelineEmission) {
      skipTimelineEmission = false;
      return;
    }

    if (isHydratingTimeline) {
      return;
    }

    try {
      const { xml } = await saveXMLWithTimeline({ format: true });
      diagramXMLStream.set(xml);
      isDirty.set(true);
    } catch (err) {
      console.error('Failed to persist timeline updates:', err);
    }
  });

  registerCleanup(unsubscribeTimelineEntries);


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

      showFirebaseLoading('Saving diagram…');

      try {
        const { db } = await getFirebase();

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
      } catch (err) {
        console.error('Failed to save diagram:', err);
        showToast(`Failed to save diagram: ${err.message}`, { type: 'error' });
      } finally {
        hideFirebaseLoading();
      }
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

function showDiagramPickerDialog() {
  openDiagramPickerModal().subscribe(result => {
    if (result === null) {
      return;
    }

    if (result.new) {
      currentDiagramId = null;
      diagramDataStream.set(null);
      diagramName = null;
      diagramVersion = 1;
      nameStream.set(diagramName);
      notesStream.set(null);
      versionStream.set(diagramVersion); // wherever version is selected
      clearModeler();
      return;
    }

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
  });
}

// Example dropdown options (choices)
function buildDropdownOptions() {
  return [
        ...(currentUser ? [
        {
        label: "📋 Select or New Diagram",
        onClick: showDiagramPickerDialog
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
    authMenuOption({ avatarStream, showSaveButton, currentTheme, rebuildMenu, onLogin: showDiagramPickerDialog })
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

  function createMinimalThemeToggle() {
    const label = document.createElement('label');
    label.style.display = 'inline-flex';
    label.style.alignItems = 'center';
    label.style.gap = '0.25rem';
    label.style.fontSize = '0.9rem';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = minimalThemeEnabled.get();

    const text = document.createElement('span');
    text.textContent = 'Minimal Theme';

    checkbox.addEventListener('change', () => {
      minimalThemeEnabled.set(checkbox.checked);
      applyBpmnTheme(currentTheme.get());
      debugBpmnLabelStyles();
    });

    minimalThemeEnabled.subscribe(enabled => {
      checkbox.checked = enabled;
      label.title = enabled
        ? 'Minimal BPMN overrides active to isolate bpmn-js defaults'
        : 'Full themed BPMN overrides active';
    });

    currentTheme.subscribe(theme => {
      const fg = theme?.colors?.foreground ?? 'inherit';
      label.style.color = fg;
    });

    label.append(checkbox, text);
    return label;
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
  controls.push(
    reactiveButton(
      new Stream('🕒'),
      () => {
        const spacedEntries = spaceTimelineEntriesEvenly();
        if (!spacedEntries.length) {
          showToast('Add timeline entries before using timeline tools.', { type: 'info' });
          return;
        }

        showToast('Evenly distributed timeline markers.', { type: 'success' });
      },
      { outline: true, title: 'Timeline tools', 'aria-label': 'Timeline tools' }
    )
  );
  controls.push(
    reactiveButton(
      new Stream('📐'),
      () => {
        const selected = selectionService?.get?.() ?? [];
        const selectedElements = Array.isArray(selected) ? selected : [];

        if (!alignElements?.trigger) {
          showToast('Alignment tools are unavailable in this modeler instance.', { type: 'error' });
          return;
        }

        if (selectedElements.length < 2) {
          showToast('Select at least two elements to align.', { type: 'warning' });
          return;
        }

        alignElements.trigger(selectedElements, 'middle');
        showToast('Aligned selected elements.', { type: 'success' });
      },
      {
        outline: true,
        title: 'Align selected elements',
        'aria-label': 'Align selected elements'
      }
    )
  );
  controls.push(createMinimalThemeToggle());
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


function parseColor(color) {
  if (!color) return null;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const num = parseInt(hex, 16);
      return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
    }
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(',').map(v => Number.parseFloat(v.trim()));
    if (parts.length >= 3 && parts.every(Number.isFinite)) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
}

function luminance({ r, g, b }) {
  const srgb = [r, g, b]
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatioFromCss(colorA, colorB) {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a || !b) return null;
  const L1 = luminance(a);
  const L2 = luminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function warnIfLabelInvisible() {
  const label = document.querySelector('#canvas text.djs-label');
  if (!label) return;
  const canvas = document.querySelector('#canvas .djs-container') || document.querySelector('#canvas');
  if (!canvas) return;

  const labelStyle = getComputedStyle(label);
  const canvasStyle = getComputedStyle(canvas);
  const labelFill = labelStyle.fill || labelStyle.color;
  const canvasFill = canvasStyle.getPropertyValue('--canvas-fill-color') || canvasStyle.backgroundColor;
  const contrast = contrastRatioFromCss(labelFill, canvasFill);

  if (contrast !== null && contrast < 2) {
    console.warn('[theme] Label fill has low contrast against canvas', { labelFill, canvasFill, contrast });
  } else if (labelFill && canvasFill && labelFill.trim() === canvasFill.trim()) {
    console.warn('[theme] Label fill matches canvas background', { labelFill, canvasFill });
  }
}

function isTransparentColor(value) {
  if (!value) return true;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'transparent') return true;

  const rgbaMatch = normalized.match(/^rgba?\(([^)]+)\)/);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(v => Number.parseFloat(v.trim()));
    if (parts.length >= 4) {
      const alpha = parts[3];
      if (Number.isFinite(alpha) && alpha <= 0) return true;
    }
  }

  return false;
}

function debugBpmnLabelStyles() {
  const labels = Array.from(document.querySelectorAll('#canvas text.djs-label')).slice(0, 10);
  if (!labels.length) {
    console.info('[debug] No BPMN labels found for style dump.');
    return;
  }

  if (document.fonts?.check) {
    console.info('[debug] Font availability check', {
      inter400: document.fonts.check('400 12px Inter'),
      segoe400: document.fonts.check('400 12px "Segoe UI"')
    });
  } else {
    console.info('[debug] document.fonts.check not supported in this browser.');
  }

  labels.forEach((el, idx) => {
    const computed = getComputedStyle(el);
    const summary = {
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      fontSize: computed.fontSize,
      fill: computed.fill,
      stroke: computed.stroke,
      strokeWidth: computed.strokeWidth,
      filter: computed.filter,
      textRendering: computed.textRendering || computed.getPropertyValue('text-rendering'),
      fontSynthesis: computed.fontSynthesis ?? computed.getPropertyValue('font-synthesis'),
      fontSynthesisWeight: computed.fontSynthesisWeight ?? computed.getPropertyValue('font-synthesis-weight')
    };

    const attributes = {
      fontWeight: el.getAttribute('font-weight'),
      textRendering: el.getAttribute('text-rendering'),
      style: el.getAttribute('style')
    };

    console.groupCollapsed(`[debug] Label ${idx + 1}: "${(el.textContent || '').trim().slice(0, 30)}"`);
    console.log('Computed:', summary);
    console.log('Attributes:', attributes);
    console.groupEnd();
  });
}

  // ─── theming overrides ────────────────────────────────────────────────────
const bpmnThemeStyle = document.createElement('style');
document.head.appendChild(bpmnThemeStyle);

const forcedNormalLabelStyle = document.createElement('style');
document.head.appendChild(forcedNormalLabelStyle);

function applyDebugLabelNormalization(enabled) {
  forcedNormalLabelStyle.textContent = enabled ? `
#canvas text.djs-label,
#canvas text.djs-label tspan {
  font-weight: 400 !important;
  font-synthesis: none !important;
  text-rendering: auto !important;
  stroke: none !important;
  stroke-width: 0 !important;
  filter: none !important;
  paint-order: fill !important;
}
` : '';
}

applyDebugLabelNormalization(DEBUG_FORCE_LABEL_NORMAL);

function applyBpmnTheme(theme) {
  const colors = theme?.colors ?? {};
  const bpmn = theme?.bpmn ?? {};

  const fallbackLabelFont = "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const shape = bpmn.shape ?? {};
  const startEvent = bpmn.startEvent ?? {};
  const endEvent = bpmn.endEvent ?? {};
  const task = bpmn.task ?? {};
  const gateway = bpmn.gateway ?? {};
  const label = bpmn.label ?? {};
  const labelFontFamily = label.fontFamily ?? fallbackLabelFont;
  const connection = bpmn.connection ?? {};
  const marker = bpmn.marker ?? {};
  const selected = bpmn.selected ?? {};
  const labelFontSize = label.fontSize ?? '12px';
  const quickMenu = bpmn.quickMenu ?? {
    background: colors.surface ?? '#fff',
    hoverBackground: colors.primary ?? colors.surface ?? '#fff',
    text: colors.foreground ?? '#000',
    hoverText: colors.accent ?? colors.foreground ?? '#000',
    border: colors.border ?? 'transparent',
    hoverBorder: colors.accent ?? colors.border ?? 'transparent',
    shadow: 'none',
    hoverShadow: 'none'
  };

  const palette = bpmn.palette ?? {};
  const paletteBackground = palette.background ?? colors.surface ?? '#fff';
  const paletteText = palette.text ?? colors.foreground ?? '#000';
  const paletteBorder = palette.border ?? colors.border ?? 'transparent';
  const paletteShadow = palette.shadow ?? 'none';
  const paletteGroupBackground = palette.groupBackground ?? paletteBackground;
  const paletteGroupText = palette.groupText ?? paletteText;
  const paletteGroupBorder = palette.groupBorder ?? paletteBorder;
  const paletteEntryBackground = palette.entryBackground ?? 'transparent';
  const paletteEntryText = palette.entryText ?? paletteText;
  const paletteEntryBorder = palette.entryBorder ?? 'transparent';
  const paletteEntryHoverBackground = palette.entryHoverBackground ?? (paletteEntryBackground === 'transparent' ? paletteBackground : paletteEntryBackground);
  const paletteEntryHoverText = palette.entryHoverText ?? paletteEntryText;
  const paletteEntryHoverBorder = palette.entryHoverBorder ?? paletteEntryBorder;
  const paletteEntryHoverShadow = palette.entryHoverShadow ?? 'none';
  const paletteEntryActiveBackground = palette.entryActiveBackground ?? colors.accent ?? paletteEntryHoverBackground;
  const paletteEntryActiveText = palette.entryActiveText ?? paletteEntryHoverText;
  const paletteEntryActiveBorder = palette.entryActiveBorder ?? colors.accent ?? paletteEntryHoverBorder;
  const paletteEntryActiveShadow = palette.entryActiveShadow ?? paletteEntryHoverShadow;

  const popupMenuConfig = bpmn.popupMenu ?? {};
  const popupBackground = popupMenuConfig.background ?? colors.surface ?? '#fff';
  const popupText = popupMenuConfig.text ?? colors.foreground ?? '#000';
  const popupBorder = popupMenuConfig.border ?? colors.border ?? 'transparent';
  const popupShadow = popupMenuConfig.shadow ?? 'none';
  const popupHoverBackground = popupMenuConfig.hoverBackground ?? colors.primary ?? popupBackground;
  const popupHoverText = popupMenuConfig.hoverText ?? colors.accent ?? popupText;
  const popupHoverBorder = popupMenuConfig.hoverBorder ?? colors.accent ?? popupBorder;
  const popupHoverShadow = popupMenuConfig.hoverShadow ?? popupShadow;
  const popupSearchBackground = popupMenuConfig.searchBackground ?? popupBackground;
  const popupSearchText = popupMenuConfig.searchText ?? popupText;
  const popupSearchPlaceholder = popupMenuConfig.searchPlaceholder ?? colors.muted ?? popupSearchText;
  const popupSearchBorder = popupMenuConfig.searchBorder ?? popupBorder;
  const popupSearchFocusShadow = popupMenuConfig.searchFocusShadow ?? `0 0 0 1px ${popupHoverBorder}`;

  const shapeFill = shape.fill ?? 'transparent';
  const shapeStroke = shape.stroke ?? 'transparent';
  const shapeStrokeWidth = shape.strokeWidth ?? 1;

  const startFill = startEvent.fill ?? shapeFill;
  const startStroke = startEvent.stroke ?? shapeStroke;
  const endFill = endEvent.fill ?? shapeFill;
  const endStroke = endEvent.stroke ?? shapeStroke;
  const taskFill = task.fill ?? shapeFill;
  const taskStroke = task.stroke ?? shapeStroke;
  const gatewayFill = gateway.fill ?? shapeFill;
  const gatewayStroke = gateway.stroke ?? shapeStroke;
  const connectionStrokeValue = connection.stroke ?? colors.accent ?? colors.foreground ?? shapeStroke ?? '#000';
  const markerFillValue = marker.fill ?? marker.accent ?? colors.accent ?? connectionStrokeValue ?? colors.foreground ?? '#000';
  const markerStrokeValue = marker.stroke ?? marker.outline ?? colors.foreground ?? colors.accent ?? connectionStrokeValue ?? '#000';

  const backgroundColor = colors.background ?? 'transparent';
  const backgroundRgb = parseColor(backgroundColor);
  const fallbackContrastFill = backgroundRgb ? (luminance(backgroundRgb) >= 0.5 ? '#111' : '#eee') : '#111';
  const labelFill = !isTransparentColor(label.fill) ? label.fill : null;
  const foregroundFill = !isTransparentColor(colors.foreground) ? colors.foreground : null;
  const resolvedLabelFill = labelFill || foregroundFill || fallbackContrastFill;
  const isDevEnv = typeof process !== 'undefined' ? process?.env?.NODE_ENV !== 'production' : true;

  if (isDevEnv && !colors.foreground && Object.values(bpmn ?? {}).some(section => (section || {}))) {
    console.warn('[theme] Missing colors.foreground; label fill resolved to', resolvedLabelFill, 'for theme', theme?.name ?? 'unknown');
  }

  const labelTextRules = `
    /* text rendering is scoped to labels only */
    #canvas text,
    #canvas tspan {
      text-rendering: auto !important;
    }

    /* ── text labels use theme-defined fill with foreground fallback ───── */
    .djs-element .djs-label,
    .djs-element.djs-label .djs-visual > text,
    .djs-element .djs-visual > text.djs-label,
    .djs-element[data-element-type="bpmn:TextAnnotation"] .djs-visual > text {
      fill: ${resolvedLabelFill} !important;
      font-family: ${labelFontFamily};
      font-size: ${labelFontSize} !important;
      font-weight: 400 !important;
      stroke: none !important;
      stroke-width: 0 !important;
      text-shadow: none !important;
      filter: none !important;
      paint-order: fill !important;
    }
  `;

  if (minimalThemeEnabled.get()) {
    bpmnThemeStyle.textContent = `
      /* canvas background */
      #canvas,
      #canvas .djs-container,
      #canvas .djs-container svg {
        background: ${backgroundColor} !important;
        --canvas-fill-color: ${backgroundColor};
      }

      ${labelTextRules}
    `;

    warnIfLabelInvisible();
    debugBpmnLabelStyles();
    return;
  }

  bpmnThemeStyle.textContent = `
    /* canvas background */
    #canvas,
    #canvas .djs-container,
    #canvas .djs-container svg {
      background: ${backgroundColor} !important;
      --canvas-fill-color: ${backgroundColor};
    }

    #canvas .djs-container,
    #canvas .djs-parent {
      --context-pad-entry-background-color: ${quickMenu.background ?? colors.surface ?? 'transparent'};
      --context-pad-entry-hover-background-color: ${quickMenu.hoverBackground ?? quickMenu.background ?? colors.primary ?? colors.surface ?? 'transparent'};
    }

    /* palette styling */
    #palette {
      background: ${paletteBackground} !important;
      color: ${paletteText} !important;
      border-right: 1px solid ${paletteBorder} !important;
      box-shadow: ${paletteShadow} !important;
    }

    #palette .djs-palette-entries {
      background: ${paletteGroupBackground} !important;
      color: ${paletteGroupText} !important;
      border-top: 1px solid ${paletteGroupBorder} !important;
    }

    #palette .entry {
      background: ${paletteEntryBackground} !important;
      color: ${paletteEntryText} !important;
      border: 1px solid ${paletteEntryBorder} !important;
    }

    #palette .entry:hover {
      background: ${paletteEntryHoverBackground} !important;
      color: ${paletteEntryHoverText} !important;
      border: 1px solid ${paletteEntryHoverBorder} !important;
      box-shadow: ${paletteEntryHoverShadow} !important;
    }

    #palette .entry:active {
      background: ${paletteEntryActiveBackground} !important;
      color: ${paletteEntryActiveText} !important;
      border: 1px solid ${paletteEntryActiveBorder} !important;
      box-shadow: ${paletteEntryActiveShadow} !important;
    }

    /* quick menu styling */
    #canvas .djs-context-pad .djs-overlay-container {
      background: ${colors.surface ?? '#fff'} !important;
    }

    .djs-context-pad .entry {
      color: ${quickMenu.text ?? colors.foreground ?? '#000'} !important;
    }

    #canvas .djs-context-pad .djs-overlay {
      background: ${quickMenu.background ?? colors.surface ?? '#fff'} !important;
      border: 1px solid ${quickMenu.border ?? 'transparent'} !important;
      box-shadow: ${quickMenu.shadow ?? 'none'} !important;
    }

    /* ensure buttons stay legible */
    .djs-context-pad .entry:hover,
    .djs-context-pad .entry:focus,
    .djs-context-pad .entry:active {
      background: ${quickMenu.hoverBackground ?? quickMenu.background ?? colors.primary ?? colors.surface ?? '#fff'} !important;
      color: ${quickMenu.hoverText ?? quickMenu.text ?? colors.foreground ?? '#000'} !important;
      border-color: ${quickMenu.hoverBorder ?? quickMenu.border ?? 'transparent'} !important;
      box-shadow: ${quickMenu.hoverShadow ?? quickMenu.shadow ?? 'none'} !important;
    }

    /* keep palette toggle buttons neutral */
    #palette .djs-toggle { color: ${paletteText} !important; }

    /* 👻 Ghost visuals (during drag / drop) should stay muted */
    .djs-drag-active .djs-visual :not(text) {
      opacity: 0.6 !important;
    }

    /* 🔍 Align handles */
    .bjsl-button:hover,
    .bjsl-button:focus { background: ${colors.surface ?? '#fff'} !important; }

    /* ⌨️ Keyboard helpers */
    .djs-context-pad .entry:focus { box-shadow: 0 0 0 1px ${colors.accent ?? '#00f'} !important; }

    /* 🎯 highlight selected items */
    .djs-highlights .djs-outline,
    .djs-highlights .djs-visual > rect,
    .djs-highlights .djs-visual > path,
    .djs-highlights .djs-visual > circle {
      stroke: ${colors.accent ?? '#00f'} !important;
    }

    /* 🔳 general shapes */
    .djs-element.djs-shape .djs-visual > :first-child {
      fill: ${shapeFill} !important;
      stroke: ${shapeStroke} !important;
      stroke-width: ${shapeStrokeWidth}px !important;
    }

    /* ensure multi-primitive shapes inherit fills */
    .djs-element.djs-shape:not(.djs-label) .djs-visual > :first-child + :where(rect, circle, ellipse) {
      fill: ${shapeFill} !important;
    }

    /* ── BPMN element specifics ─────────────────────────────────────────── */
    .djs-element[data-element-type="bpmn:StartEvent"] .djs-visual > :is(:first-child, circle:nth-child(2)) {
      fill: ${startFill} !important;
      stroke: ${startStroke} !important;
    }
    .djs-element[data-element-type="bpmn:BoundaryEvent"] .djs-visual > :is(:first-child, circle:nth-child(2)) {
      fill: ${startFill} !important;
      stroke: ${startStroke} !important;
    }
    .djs-element[data-element-type="bpmn:EndEvent"] .djs-visual > :is(:first-child, circle:nth-child(2)) {
      fill: ${endFill} !important;
      stroke: ${endStroke} !important;
    }
    .djs-element[data-element-type*="Task"] .djs-visual > :first-child,
    .djs-element[data-element-type*="Activity"] .djs-visual > :first-child {
      fill: ${taskFill} !important;
      stroke: ${taskStroke} !important;
    }
    .djs-element[data-element-type*="Gateway"] .djs-visual > :first-child {
      fill: ${gatewayFill} !important;
      stroke: ${gatewayStroke} !important;
    }

    /* keep event outlines clear */
    .djs-element.djs-event .djs-visual > :first-child {
      stroke-width: ${shapeStrokeWidth}px !important;
    }

    ${labelTextRules}

    /* ── connections & arrows ───────────────────────────────────────────── */
    .djs-connection .djs-connection-inner,
    .djs-connection .djs-connection-outer {
      stroke: ${connectionStrokeValue} !important;
      stroke-width: ${connection.strokeWidth ?? shapeStrokeWidth}px !important;
    }
    .djs-connection .djs-marker {
      fill: ${markerFillValue} !important;
      stroke: ${markerStrokeValue} !important;
    }

    /* ── selected styles ───────────────────────────────────────────────── */
    .djs-element.djs-element-selected .djs-visual > :first-child,
    .djs-connection.djs-connection-selected .djs-outline {
      stroke: ${selected.stroke ?? colors.accent ?? shapeStroke} !important;
      stroke-width: ${selected.strokeWidth ?? (shapeStrokeWidth + 1)}px !important;
    }

    .djs-context-pad .entry {
      background: var(--context-pad-entry-background-color, ${quickMenu.background ?? 'transparent'}) !important;
      color: ${quickMenu.text ?? colors.foreground ?? '#000'} !important;
      border: 1px solid ${quickMenu.border ?? 'transparent'} !important;
      box-shadow: ${quickMenu.shadow ?? 'none'} !important;
    }

    .djs-context-pad .entry:hover {
      background: var(--context-pad-entry-hover-background-color, ${quickMenu.hoverBackground ?? quickMenu.background ?? 'transparent'}) !important;
      color: ${quickMenu.hoverText ?? quickMenu.text ?? colors.foreground ?? '#000'} !important;
      border: 1px solid ${quickMenu.hoverBorder ?? quickMenu.border ?? 'transparent'} !important;
      box-shadow: ${quickMenu.hoverShadow ?? quickMenu.shadow ?? 'none'} !important;
    }

    /* ── popup / replace menu ───────────────────────────────────────────── */
    #canvas .djs-popup {
      --popup-background: ${popupBackground};
      --popup-text: ${popupText};
      --popup-border: ${popupBorder};
      --popup-shadow: ${popupShadow};
      --popup-hover-background: ${popupHoverBackground};
      --popup-hover-text: ${popupHoverText};
      --popup-hover-border: ${popupHoverBorder};
      --popup-hover-shadow: ${popupHoverShadow};
      --popup-search-background: ${popupSearchBackground};
      --popup-search-text: ${popupSearchText};
      --popup-search-placeholder: ${popupSearchPlaceholder};
      --popup-search-border: ${popupSearchBorder};
      --popup-search-focus-shadow: ${popupSearchFocusShadow};
    }

    #canvas .djs-popup,
    #canvas .djs-popup .djs-popup-header,
    #canvas .djs-popup .djs-popup-body,
    #canvas .djs-popup .djs-popup-title {
      background: var(--popup-background) !important;
      color: var(--popup-text) !important;
    }

    #canvas .djs-popup {
      border: 1px solid var(--popup-border) !important;
      box-shadow: var(--popup-shadow) !important;
    }

    #canvas .djs-popup .djs-popup-header,
    #canvas .djs-popup .djs-popup-search {
      border-bottom: 1px solid var(--popup-border) !important;
    }

    #canvas .djs-popup .entry {
      color: var(--popup-text) !important;
      border: 1px solid transparent !important;
    }

    #canvas .djs-popup .djs-popup-body .entry:hover,
    #canvas .djs-popup .djs-popup-body .entry:focus,
    #canvas .djs-popup .djs-popup-body .entry.active {
      background: var(--popup-hover-background) !important;
      color: var(--popup-hover-text) !important;
      border-color: var(--popup-hover-border) !important;
      box-shadow: var(--popup-hover-shadow) !important;
    }

    #canvas .djs-popup .entry .djs-popup-description {
      color: var(--popup-search-placeholder) !important;
    }

    #canvas .djs-popup .djs-popup-search input {
      background: var(--popup-search-background) !important;
      color: var(--popup-search-text) !important;
      border: 1px solid var(--popup-search-border) !important;
      box-shadow: none !important;
    }

    #canvas .djs-popup .djs-popup-search input::placeholder {
      color: var(--popup-search-placeholder) !important;
    }

    #canvas .djs-popup .djs-popup-search input:focus {
      border-color: var(--popup-hover-border) !important;
      box-shadow: var(--popup-search-focus-shadow) !important;
    }

    /* ── simulation active token highlight ─────────────────────────────── */
    .djs-element.active .djs-visual > :nth-child(1),
    .djs-connection.active .djs-visual > path {
      stroke: ${colors.accent ?? '#00f'} !important;
      stroke-width: 4px !important;
    }

    /* ── direct editing overlay ───────────────────────────────────────── */
    .djs-direct-editing-parent,
    .djs-direct-editing-content {
      background: ${colors.surface ?? '#fff'} !important;
      color: ${colors.foreground ?? '#000'} !important;
      border: 1px solid ${colors.border ?? '#000'} !important;
      outline: 1px solid ${colors.border ?? '#000'} !important;
    }

    /* ── diagnostic: ensure labels stay readable ─────────────────────────── */
  `;

  warnIfLabelInvisible();
  debugBpmnLabelStyles();
}

currentTheme.subscribe(applyBpmnTheme);
minimalThemeEnabled.subscribe(() => applyBpmnTheme(currentTheme.get()));

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


  registerCleanup(() => {
    try {
      modeler.destroy?.();
    } catch (err) {
      console.error('Failed to destroy modeler during cleanup:', err);
    }
  });

  cleanupCurrentModeler = () => {
    while (cleanups.length) {
      const cleanup = cleanups.pop();
      try {
        cleanup();
      } catch (err) {
        console.error('Error during modeler cleanup:', err);
      }
    }

    cleanupCurrentModeler = null;
  };

attachOverlay(overlay);

  toggleShellSpinner(false);

}
const bootstrapShell = () => {
  ensureShellLayout();
  primeCustomModdleFetch();
};

function scheduleInit(reason = 'visibility') {
  if (scheduleInit.scheduled) return;
  scheduleInit.scheduled = true;

  const start = () => {
    init().catch(err => {
      console.error(`Modeler initialization failed (${reason}):`, err);
    }).finally(() => toggleShellSpinner(false));
  };

  requestAnimationFrame(start);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapShell();
    scheduleInit('dom-ready');
  });
} else {
  bootstrapShell();
  scheduleInit('dom-ready');
}

document.addEventListener('click', event => {
  const trigger = event.target?.closest('[data-diagram-action="new"],[data-diagram-action="open"],[data-action="open-diagram"],[data-action="new-diagram"]');
  if (!trigger) return;

  scheduleInit('diagram-action');
});
