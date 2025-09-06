(function(global) {
  function createModal(themeStream = currentTheme, onClose = () => {}) {
    const theme = themeStream.get ? themeStream.get() : themeStream;
    const colors = theme.colors || {};

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '9999'
    });

    const content = document.createElement('div');
    content.classList.add('responsive-modal');
    Object.assign(content.style, {
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      maxWidth: '90%',
      backgroundColor: colors.surface || '#fff',
      color: colors.foreground || '#000',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    });

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        onClose();
        modal.remove();
      }
    });

    return { modal, content };
  }

  global.createModal = createModal;
})(window);

