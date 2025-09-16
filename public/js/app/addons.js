import { avatarDropdown } from '../components/index.js';
import { initAddOnOverlays } from '../addons/overlays.js';
import { initAddOnFiltering } from '../addons/filtering.js';

export function initializeAddOnServices({
  overlays,
  elementRegistry,
  modeling,
  canvas,
  currentTheme,
  addOnStore,
  diagramXMLStream,
  typeIcons
}) {
  const { scheduleOverlayUpdate } = initAddOnOverlays({
    overlays,
    elementRegistry,
    typeIcons
  });

  const filteringApi = initAddOnFiltering({
    currentTheme,
    elementRegistry,
    modeling,
    canvas,
    scheduleOverlayUpdate,
    addOnStore,
    diagramXMLStream,
    typeIcons
  });

  return {
    scheduleOverlayUpdate,
    ...filteringApi
  };
}

export function setupAvatarMenu({
  avatarStream,
  avatarOptions,
  currentTheme,
  buildDropdownOptions,
  diagramDataStream
}) {
  let avatarMenu = avatarDropdown(avatarStream, avatarOptions, currentTheme, buildDropdownOptions());

  function rebuildMenu() {
    const newMenu = avatarDropdown(avatarStream, avatarOptions, currentTheme, buildDropdownOptions());
    if (avatarMenu && avatarMenu.parentNode) {
      avatarMenu.parentNode.replaceChild(newMenu, avatarMenu);
    }
    avatarMenu = newMenu;
    return avatarMenu;
  }

  if (diagramDataStream?.subscribe) {
    diagramDataStream.subscribe(() => rebuildMenu());
  }

  return {
    get avatarMenu() {
      return avatarMenu;
    },
    rebuildMenu
  };
}
