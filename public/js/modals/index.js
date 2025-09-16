import { reactiveLoginModal } from '../auth/loginModal.js';
import { openDiagramPickerModal, promptDiagramMetadata, selectVersionModal } from '../diagrams/modals.js';
import { openAddOnChooserModal } from '../addons/chooserModal.js';

(function ensureModalStyles() {
  if (document.getElementById('modal-responsive-styles')) return;
  const style = document.createElement('style');
  style.id = 'modal-responsive-styles';
  style.textContent = `
    @media (max-width: 768px) {
      .responsive-modal { max-width: 95% !important; }
    }
    @media (max-width: 480px) {
      .responsive-modal { max-width: 100% !important; }
    }
  `;
  document.head.appendChild(style);
})();

if (typeof window !== 'undefined') {
  window.openAddOnChooserModal = openAddOnChooserModal;
}

export {
  reactiveLoginModal,
  openDiagramPickerModal,
  promptDiagramMetadata,
  selectVersionModal,
  openAddOnChooserModal
};
