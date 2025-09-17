import { Stream } from '../core/stream.js';
import { currentTheme } from '../core/theme.js';

export function promptTimelineEntryMetadata(
  initialLabel = '',
  initialNotes = '',
  themeStream = currentTheme,
  { allowDelete = false } = {}
) {
  const resultStream = new Stream(null);
  const theme = themeStream.get();
  const colors = theme.colors;

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '9999'
  });

  const box = document.createElement('div');
  box.classList.add('responsive-modal');
  Object.assign(box.style, {
    backgroundColor: colors.surface,
    color: colors.foreground,
    padding: '1.5rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    fontFamily: theme.fonts?.base || 'system-ui, sans-serif',
    maxWidth: '90%'
  });

  const title = document.createElement('h2');
  title.textContent = 'Timeline Entry Details';
  title.style.margin = '0';
  title.style.fontSize = '1.25rem';
  title.style.color = colors.accent;

  const labelInput = document.createElement('input');
  labelInput.placeholder = 'Timeline entry label';
  labelInput.value = initialLabel;
  Object.assign(labelInput.style, {
    padding: '0.5rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    backgroundColor: colors.primary,
    color: colors.foreground,
    fontSize: '1rem'
  });

  const notesInput = document.createElement('textarea');
  notesInput.placeholder = 'Notes (optional)';
  notesInput.value = initialNotes;
  notesInput.rows = 4;
  Object.assign(notesInput.style, {
    padding: '0.5rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    backgroundColor: colors.primary,
    color: colors.foreground,
    fontSize: '1rem'
  });

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginTop: '0.5rem'
  });

  function styledButton(label, onClick, isAccent = false) {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: 1,
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      border: 'none',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer',
      backgroundColor: isAccent ? colors.accent : colors.border,
      color: colors.background,
      transition: 'background-color 0.2s ease'
    });
    btn.onmouseenter = () => btn.style.backgroundColor = isAccent ? colors.foreground : '#999';
    btn.onmouseleave = () => btn.style.backgroundColor = isAccent ? colors.accent : colors.border;
    btn.onclick = onClick;
    return btn;
  }

  const cancelBtn = styledButton('Cancel', () => {
    resultStream.set(null);
    modal.remove();
  });

  const saveBtn = styledButton('Save Timeline Entry', () => {
    const trimmedLabel = labelInput.value.trim();
    resultStream.set({
      label: trimmedLabel || initialLabel || '',
      metadata: {
        notes: notesInput.value.trim()
      }
    });
    modal.remove();
  }, true);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  if (allowDelete) {
    const deleteBtn = styledButton('Delete timeline entry', () => {
      resultStream.set({ delete: true });
      modal.remove();
    });
    const deleteColor = colors.danger || '#c0392b';
    const deleteHoverColor = colors.dangerHover || '#922b21';
    deleteBtn.style.backgroundColor = deleteColor;
    deleteBtn.style.color = colors.background;
    deleteBtn.onmouseenter = () => deleteBtn.style.backgroundColor = deleteHoverColor;
    deleteBtn.onmouseleave = () => deleteBtn.style.backgroundColor = deleteColor;
    btnRow.appendChild(deleteBtn);
  }
  box.append(title, labelInput, notesInput, btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);

  setTimeout(() => labelInput.focus(), 0);

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      resultStream.set(null);
      modal.remove();
    }
  });

  return resultStream;
}
