import customReplaceModule from './modules/customReplaceMenuProvider.js';
import './components/raciMatrix.js';
import { logUser, currentUser, authMenuOption } from './auth.js';
import { initAddOnOverlays } from './addOnOverlays.js';
import { initAddOnFiltering } from './addOnFiltering.js';
import BpmnSnapping from 'bpmn-js/lib/features/snapping';
import AttachBoundaryModule from '../features/attach-boundary/index.js';

// js/app.js
  const typeIcons = {
    'Knowledge': '📚',
    'Business': '💼',
    'Requirement': '📝',
    'Lifecycle': '🔄',
    'Measurement': '📊',
    'Condition': '⚖️',
    'Material': '🧱',
    'Role': '👤',
    'Equipment': '🛠️',
    'System': '⚙️',
    'Tool': '🧰',
    'Information': 'ℹ️'
  };
  window.typeIcons = typeIcons;
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

document.addEventListener('DOMContentLoaded', async () => {

const avatarStream = new Stream('flow.png');
let currentDiagramId = null;
let diagramName = null;
let diagramVersion = 1;
const diagramDataStream = new Stream(null);
const nameStream = new Stream(diagramName);

const versionStream = new Stream(diagramVersion);
const overlay = createDiagramOverlay(
  nameStream,
  versionStream,
  currentTheme
);

Object.assign(document.body.style, {
    display:      'flex',
    flexDirection:'column',
    height:       '100vh',
    margin:       '0'
  });
  // ─── pull in the UMD globals ───────────────────────────────────────────────
  const { BpmnJS }       = window;
  const layoutProcess    = window.bpmnAutoLayout?.layoutProcess;
  const NavigatorModule  = window.NavigatorModule;

  // ─── build canvas + xml-editor elements ────────────────────────────────────
  const canvasEl = document.getElementById('canvas');

  const helpGuideEl = document.getElementById('help-guide');
  window.openHelpGuideModal = () => {
    if (!helpGuideEl) return;
    helpGuideEl.hidden = false;
  };

  if (helpGuideEl) {
    const iframe = helpGuideEl.querySelector('iframe');
    if (iframe) {
      const applyIframeTheme = () => {
        const body = iframe.contentDocument?.body;
        if (!body) return;
        applyThemeToPage(currentTheme.get(), body);
        currentTheme.subscribe(theme => applyThemeToPage(theme, body));
      };

      if (iframe.contentDocument?.readyState === 'complete') {
        applyIframeTheme();
      }

      iframe.addEventListener('load', applyIframeTheme);
    }

    const helpGuideCloseBtn = document.getElementById('help-guide-close');
    if (helpGuideCloseBtn) {
      helpGuideCloseBtn.addEventListener('click', () => {
        helpGuideEl.hidden = true;
      });
    }

    helpGuideEl.addEventListener('click', e => {
      if (e.target === helpGuideEl) helpGuideEl.hidden = true;
    });
  }

  // Touch interactions are handled via CSS (see `touch-action: none`).
  // Previously, we suppressed page scrolling by preventing the default
  // `touchmove` behavior on the canvas element which also blocked BPMN's
  // internal handlers. Rely on CSS instead and only prevent scrolling when
  // touches originate outside the BPMN diagram container.
  document.addEventListener(
    'touchmove',
    e => {
      if (!e.target.closest('.djs-container')) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
  const header   = document.querySelector('header');

  const setCanvasHeight = () => {
    if (!header) return;
    canvasEl.style.height = `calc(100vh - ${header.offsetHeight}px)`;
  };

  Object.assign(canvasEl.style, {
    flex:   '1 1 auto',
    width:  '100%',
    border: `1px solid ${currentTheme.get().colors.border}`
  });

  setCanvasHeight();
  window.addEventListener('resize', setCanvasHeight);


  // ─── mount theme selector, spacer, canvas & xml ────────────────────────────
  document.body.appendChild(canvasEl);
  
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
    AttachBoundaryModule
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
  const simulation      = createSimulation({ elementRegistry, canvas });
  window.simulation = simulation;
  const overlays        = modeler.get('overlays');

  const { scheduleOverlayUpdate } = initAddOnOverlays({ overlays, elementRegistry, typeIcons });
  const { loadAddOnData, applyAddOnsToElements, syncAddOnStoreFromElements } =
    initAddOnFiltering({
      currentTheme,
      elementRegistry,
      modeling,
      canvas,
      scheduleOverlayUpdate,
      addOnStore,
      diagramXMLStream,
      typeIcons
    });

  const eventBus     = modeler.get('eventBus');
  const commandStack = modeler.get('commandStack');
  const isDirty = new Stream(false);
  const showSaveButton = new Stream(false);

  // push every change into your XML Stream:
  eventBus.on('commandStack.changed', async () => {
      try {
        const { xml } = await modeler.saveXML({ format: true });
        diagramXMLStream.set(xml);
        isDirty.set(true);
        syncAddOnStoreFromElements();
      } catch (err) {
        console.error('failed to save current XML:', err);
      }
  });

  // Token list panel for simulation log
  const tokenPanel = window.tokenListPanel
    .createTokenListPanel(simulation.tokenLogStream, currentTheme);
  document.body.appendChild(tokenPanel.el);


  let treeBtn;
  // render persisted log immediately if entries exist
  if (simulation.tokenLogStream.get().length) {
    tokenPanel.show();
  }

  let blockchain;
  let processedTokens = 0;
  let blockchainPersistPromise = Promise.resolve();
  window.blockchain = blockchain;

  function initBlockchain() {
    tokenPanel.hide();
    blockchain = new Blockchain();
    window.blockchain = blockchain;
    processedTokens = 0;
  }

  const origStart = simulation.start;
  simulation.start = (...args) => {
    initBlockchain();
    tokenPanel.show();
    return origStart.apply(simulation, args);
  };

  const origReset = simulation.reset;
  simulation.reset = (...args) => {
    initBlockchain();
    const res = origReset.apply(simulation, args);
    return res;
  };

  if (tokenPanel.setDownloadHandler)
    tokenPanel.setDownloadHandler(() => {
      const data = JSON.stringify(blockchain?.chain ?? [], null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blockchain.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

  simulation.tokenLogStream.subscribe(entries => {
    if (entries.length) {
      tokenPanel.show();
    } else {
      tokenPanel.hide();
    }

    if (blockchain && entries.length > processedTokens) {
      const toPersist = entries.slice(processedTokens);
      blockchainPersistPromise = blockchainPersistPromise.then(() => {
        for (let i = 0; i < toPersist.length; i++) {
          blockchain.addBlock(toPersist[i]);
        }
        processedTokens = entries.length;
        window.dispatchEvent(new Event('blockchain-persisted'));
      });
    }
  });

  let prevTokenCount = simulation.tokenStream.get().length;
  simulation.tokenStream.subscribe(tokens => {
    if (prevTokenCount > 0 && tokens.length === 0) {
      tokenPanel.show();
      blockchainPersistPromise.then(() => tokenPanel.showDownload());
    }
    prevTokenCount = tokens.length;
  });

  window.diagramTree.onSelect = id => {
    const element = elementRegistry.get(id);
    if (element) {
      selectionService.select(element);
      showProperties(element, modeling, moddle);
    }
    window.diagramTree.setSelectedId(id);
  };

  eventBus.on('selection.changed', ({ newSelection }) => {
    const element = newSelection[0];
    window.diagramTree.setSelectedId(element?.id || null);
  });

  function updateDiagramTree() {
    const registry = modeler.get('elementRegistry');
    const canvas = modeler.get('canvas');
    let root = canvas.getRootElement();
    if (root.type === 'bpmn:Collaboration' && root.children?.length) {
      root = root.children[0]; // pick first participant/process
    }
    if (!root) {
      window.diagramTree?.treeStream.set(null);
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
    window.diagramTree?.treeStream.set(tree);
  }
  // Prompt user to choose path at gateways
  simulation.pathsStream.subscribe(data => {
    if (!data) return;
    const { flows: flowOptions, type } = data;
    if (!flowOptions || !flowOptions.length) return;
    const isInclusive = type === 'bpmn:InclusiveGateway';
    // Access modal helper via `window` to avoid ReferenceError when used
    // within modules or strict scopes
    window.openFlowSelectionModal(flowOptions, currentTheme, isInclusive).subscribe(chosen => {
      if (chosen && chosen.length) {
        if (isInclusive) {
          simulation.step(chosen.map(f => f.id));
        } else {
          simulation.step(chosen[0].id);
        }
      }
    });
  });

  // ─── theme (page background) ────────────────────────────────────────────────
  currentTheme.subscribe(applyThemeToPage);
 
  // ─── hidden file-input for BPMN import ──────────────────────────────────────
  const fileInput = document.createElement('input');
  fileInput.type    = 'file';
  fileInput.accept  = '.bpmn,.xml';
  fileInput.style.display = 'none';
 
  fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const xml = await file.text();

  // Store the new XML in your stream
  diagramXMLStream.set(xml);

  // Append the new diagram to the current diagram
  await appendXml(xml);
};

async function appendXml(xml) {
  try {
    // Import the new XML into the current diagram
    await modeler.importXML(xml);
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

  
  document.body.appendChild(fileInput);

  // ─── import / initial render ───────────────────────────────────────────────
  async function importXml(xml) {
    try {
      await modeler.importXML(xml);
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


const jsonFileInput = document.createElement('input');
jsonFileInput.type = 'file';
jsonFileInput.accept = '.json';
jsonFileInput.style.display = 'none';

jsonFileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const json = JSON.parse(await file.text());
  await importJson(json);
};

document.body.appendChild(jsonFileInput);


  // ─── build controls bar ────────────────────────────────────────────────────

// hide the “Save” button until there are edits and logged in…


const saveBtn = reactiveButton(
  new Stream('💾'),
  async () => {
    console.debug('Save button pressed');
    syncAddOnStoreFromElements();
    const allAddOns = addOnStore.getAllAddOns();
    applyAddOnsToElements(allAddOns);
    const { xml } = await modeler.saveXML({ format: true });

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
        const diagramRef = db.collection('users')
          .doc(currentUser.uid)
          .collection('diagrams')
          .doc(currentDiagramId);

        // Add the new version to the diagram
        await diagramRef.update({
          name: metadata.name, // Update diagram name
          lastUpdated: firebase.firestore.Timestamp.fromMillis(localTimestamp), // Update lastUpdated
          versions: firebase.firestore.FieldValue.arrayUnion({
            xml, // Save XML data
            timestamp: localTimestamp, // Timestamp of this version
            notes: metadata.notes, // Save the updated notes
            addOns: allAddOns
          })
        });

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const diagrams = userDoc.data()?.diagrams || [];

        const updatedIndex = diagrams.map(d =>
          d.id === currentDiagramId
            ? { ...d, name: metadata.name, notes: metadata.notes, lastUpdated: localTimestamp }
            : d
        );


        // Save the updated index list back to Firestore
        await db.collection('users')
          .doc(currentUser.uid)
          .set({ diagrams: updatedIndex }, { merge: true });

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
        const diagramRef = await db.collection('users')
          .doc(currentUser.uid)
          .collection('diagrams')
          .add({
            name: metadata.name || 'Untitled Diagram',
            versions: [{ xml, timestamp: localTimestamp, notes: metadata.notes, addOns: allAddOns }],
            lastUpdated: firebase.firestore.Timestamp.fromMillis(localTimestamp)
          });

        const newIndexEntry = {
          id: diagramRef.id,
          name: metadata.name || 'Untitled Diagram',
          notes: metadata.notes, // Ensure we add the notes
          lastUpdated: localTimestamp
        };

        // Add the new diagram to the user's index list
        await db.collection('users')
          .doc(currentUser.uid)
          .set({
            diagrams: firebase.firestore.FieldValue.arrayUnion(newIndexEntry)
          }, { merge: true });

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
          openAddOnChooserModal().subscribe(selectedAddOn => {
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
          const { xml } = await modeler.saveXML({ format: true });
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

let avatarMenu;  // global or outer-scope reference

function rebuildMenu() {  
  const newMenu = avatarDropdown(avatarStream, avatarOptions, currentTheme, buildDropdownOptions());
  if (avatarMenu && avatarMenu.parentNode) {
    avatarMenu.parentNode.replaceChild(newMenu, avatarMenu);
  }
  avatarMenu = newMenu;
}

  diagramDataStream.subscribe(() => rebuildMenu());
  
  avatarMenu = avatarDropdown(avatarStream, avatarOptions, currentTheme, buildDropdownOptions());

  function openRaciMatrixModal() {
    const matrix = window.raciMatrix?.createRaciMatrix(modeler);
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
  reactiveButton(new Stream("▶"), () => simulation.start(), { outline: true, title: "Play" }),
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
    if (window.diagramTree?.togglePanel) {
      treeToggle = window.diagramTree.togglePanel;
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
    #canvas {
      background: ${colors.background} !important;
    }

    /* ── force all shape backgrounds to theme.surface ────────────────────── */
    .djs-element .djs-shape {
      fill: ${colors.surface} !important;
      stroke: ${bpmn.shape.stroke} !important;
      stroke-width: ${bpmn.shape.strokeWidth}px !important;
    }

    /* keep event outlines clear if you like: */
    .djs-element.djs-event .djs-shape {
      stroke-width: ${bpmn.shape.strokeWidth}px !important;
    }

    /* ── text labels use theme.foreground ───────────────────────────────── */
    .djs-element .djs-label {
      fill: ${colors.foreground} !important;
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
    .djs-connection.djs-connection-selected .djs-connection-outer {
      stroke: ${bpmn.selected.stroke} !important;
      stroke-width: ${bpmn.selected.strokeWidth}px !important;
    }

    /* ── simulation active token highlight ─────────────────────────────── */
    .djs-element.active .djs-visual > :nth-child(1),
    .djs-connection.active .djs-visual > path {
      stroke: orange !important;
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

     
const bjsContainer = document.querySelector('.bjs-container') || document.getElementById('canvas');
bjsContainer.style.position = 'relative'; // ensure container can host absolute overlay
bjsContainer.appendChild(overlay);


});
