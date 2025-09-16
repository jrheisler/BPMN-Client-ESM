export const RACI_FIELDS = ['responsible', 'accountable', 'consulted', 'informed'];
const RACI_MRU_KEY = 'raciMru';
const RACI_DATALIST_ID = 'raci-mru';
const MAX_MRU_ENTRIES = 10;

function loadMru() {
  try {
    const stored = localStorage.getItem(RACI_MRU_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveMru(values) {
  try {
    localStorage.setItem(RACI_MRU_KEY, JSON.stringify(values));
  } catch (e) {
    // ignore storage errors
  }
}

function renderOptions(datalist, values = loadMru()) {
  datalist.replaceChildren();
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    datalist.appendChild(option);
  });
}

function updateMru(value) {
  if (!value) {
    return loadMru();
  }
  let values = loadMru().filter(entry => entry !== value);
  values.unshift(value);
  if (values.length > MAX_MRU_ENTRIES) {
    values = values.slice(0, MAX_MRU_ENTRIES);
  }
  saveMru(values);
  return values;
}

function ensureExtensionElements(bo, moddle) {
  if (!bo.extensionElements) {
    bo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
  }
  bo.extensionElements.values = bo.extensionElements.values || [];
  return bo.extensionElements;
}

function ensureRaciElement(bo, moddle) {
  const extEl = ensureExtensionElements(bo, moddle);
  let raciEl = extEl.values.find(v => v.$type === 'custom:Raci');
  if (!raciEl) {
    raciEl = moddle.create('custom:Raci', {});
    extEl.values.push(raciEl);
  }
  return raciEl;
}

export function createRaciDatalist() {
  const datalist = document.createElement('datalist');
  datalist.id = RACI_DATALIST_ID;
  renderOptions(datalist);
  return datalist;
}

export function attachRaciMruHandlers(input, datalist) {
  input.setAttribute('list', RACI_DATALIST_ID);
  const update = () => {
    const list = updateMru(input.value.trim());
    renderOptions(datalist, list);
  };
  input.addEventListener('change', update);
  input.addEventListener('blur', update);
}

export function getRaciFieldValue(bo, key) {
  const raci = (bo.extensionElements?.values || []).find(v => v.$type === 'custom:Raci');
  return raci?.[key];
}

export function updateRaciAssignments(bo, attrs, formData, moddle) {
  const raciEl = ensureRaciElement(bo, moddle);
  RACI_FIELDS.forEach(field => {
    const value = formData.get(field) || '';
    if (value) {
      attrs[field] = value;
      raciEl[field] = value;
    } else {
      delete attrs[field];
      delete raciEl[field];
    }
  });
}
