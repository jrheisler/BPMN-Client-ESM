import { Stream } from '../core/stream.js';
import { currentTheme } from '../core/theme.js';
import { createModal } from '../components/modal.js';
import { reactiveButton, dropdownStream, showConfirmationDialog, showToast } from '../components/index.js';
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove } from 'firebase/firestore';

export function openDiagramPickerModal(themeStream = currentTheme) {
  const pickStream = new Stream(null); // emits selected diagram or null

  const { modal, content } = createModal(themeStream, () => pickStream.set(null));
  content.style.maxHeight = '80vh';
  content.style.overflowY = 'auto';

  const title = document.createElement('h2');
  title.textContent = 'Select a Diagram';
  content.appendChild(title);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '0.5rem';
  content.appendChild(list);

  getDoc(doc(db, 'users', window.currentUser.uid))
    .then(docSnap => {
      const userData = docSnap.data();
      const index = userData.diagrams || [];

      if (index.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = "No saved diagrams.";
        list.appendChild(empty);
      } else {
        index.sort((a, b) => b.lastUpdated - a.lastUpdated);

        index.forEach(entry => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          item.style.padding = '0.5rem 1rem';
          item.style.border = '1px solid #ccc';
          item.style.borderRadius = '4px';
          item.style.backgroundColor = '#f9f9f9';
          item.style.cursor = 'pointer';
          item.style.gap = '1rem';

          const name = entry.name || `Untitled (${entry.id})`;
          const notes = entry.notes || '';

          const textContainer = document.createElement('div');
          textContainer.style.flex = '1';
          textContainer.style.display = 'flex';
          textContainer.style.flexDirection = 'column';

          const nameEl = document.createElement('div');
          nameEl.textContent = name;
          nameEl.style.fontWeight = 'bold';

          const notesEl = document.createElement('div');
          notesEl.textContent = notes;
          notesEl.style.fontSize = '0.9rem';
          notesEl.style.color = themeStream.get().colors.foreground + 'aa';

          textContainer.appendChild(nameEl);
          textContainer.appendChild(notesEl);

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '🗑️';
          deleteBtn.title = 'Delete Diagram';
          deleteBtn.style.border = 'none';
          deleteBtn.style.background = 'transparent';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.style.fontSize = '1.2rem';
          deleteBtn.style.color = '#b00';

          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirmationDialog(`Are you sure you want to delete "${entry.name}"?`, themeStream);
            if (!confirmed) return;

            try {
              const userRef = doc(db, 'users', window.currentUser.uid);
              const diagramRef = doc(db, 'users', window.currentUser.uid, 'diagrams', entry.id);

              await deleteDoc(diagramRef);

              await updateDoc(userRef, {
                diagrams: arrayRemove(entry)
              });

              showToast(`🗑️ Diagram "${entry.name}" deleted.`, { type: 'warning' });

              item.remove();
            } catch (err) {
              showToast(`❌ Failed to delete diagram: ${err.message}`, { type: 'error' });
            }
          });

          item.addEventListener('click', async () => {
            const docSnap = await getDoc(doc(db, 'users', window.currentUser.uid, 'diagrams', entry.id));

            if (window.notesStream) window.notesStream.set(entry.notes);

            pickStream.set({ id: entry.id, data: docSnap.data() });
            modal.remove();
          });

          item.addEventListener('mouseenter', () => item.style.backgroundColor = '#eee');
          item.addEventListener('mouseleave', () => item.style.backgroundColor = '#f9f9f9');

          item.appendChild(textContainer);
          item.appendChild(deleteBtn);
          list.appendChild(item);
        });
      }
    })
    .catch(err => {
      const error = document.createElement('p');
      error.textContent = "❌ Failed to load diagram index: " + err.message;
      error.style.color = 'red';
      list.appendChild(error);
    });

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'space-between';
  btnRow.style.gap = '1rem';

  const newBtn = reactiveButton(new Stream("🆕 New Diagram"), () => {
    pickStream.set({ new: true });
    modal.remove();
  }, { accent: true }, themeStream);

  const cancelBtn = reactiveButton(new Stream("Cancel"), () => {
    pickStream.set(null);
    modal.remove();
  }, { outline: true }, themeStream);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(newBtn);
  content.appendChild(btnRow);

  return pickStream;
}

export function promptDiagramMetadata(initialName = '', initialNotes = '', themeStream = currentTheme) {
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
  title.textContent = 'Save Diagram';
  title.style.margin = '0';
  title.style.fontSize = '1.25rem';
  title.style.color = colors.accent;
  box.appendChild(title);

  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Diagram Name';
  nameInput.value = initialName;
  Object.assign(nameInput.style, {
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

  const saveBtn = styledButton('Save', () => {
    resultStream.set({
      name: nameInput.value.trim(),
      notes: notesInput.value.trim()
    });
    modal.remove();
  }, true);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  box.appendChild(nameInput);
  box.appendChild(notesInput);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      resultStream.set(null);
      modal.remove();
    }
  });

  return resultStream;
}

export function selectVersionModal(diagramName, versions, themeStream = currentTheme) {
  const versionStream = new Stream((versions.length - 1).toString());
  const pickStream = new Stream(null);

  const versionChoices = versions.map((ver, index) => ({
    value: index.toString(),
    label: `Version ${index + 1} — ${new Date(ver.timestamp).toLocaleString()}`
  })).reverse();

  const dropdown = dropdownStream(versionStream, {
    choices: versionChoices,
    width: '100%',
    margin: '0.5rem 0'
  }, themeStream);

  const confirmBtn = reactiveButton(new Stream("📥 Load Selected Version"), () => {
    pickStream.set(parseInt(versionStream.get(), 10));
    modal.remove();
  }, { accent: true }, themeStream);

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
  box.classList.add('responsive-modal');
  Object.assign(box.style, {
    backgroundColor: themeStream.get().colors.surface,
    color: themeStream.get().colors.foreground,
    padding: '1.5rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    fontFamily: themeStream.get().fonts?.base || 'system-ui, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    maxWidth: '90%'
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
    if (e.target === modal) {
      pickStream.set(null);
      modal.remove();
    }
  });

  return pickStream;
}
