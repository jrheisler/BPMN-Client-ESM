import { Stream } from './core/stream.js';
import { reactiveLoginModal } from './login.js';
import { auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { showToast } from './components/elements.js';

export const logUser = new Stream('👤 Login');
export let currentUser = null;
window.currentUser = currentUser;

export function authMenuOption({ avatarStream, showSaveButton, currentTheme, rebuildMenu }) {
  return {
    label: logUser.get(),
    onClick: () => {
      if (currentUser) {
        signOut(auth).then(() => {
          logUser.set('👤 Login');
          avatarStream.set('flow.png');
          showSaveButton.set(false);
          currentUser = null;
          window.currentUser = currentUser;
          rebuildMenu();
        }).catch(() => {
          showToast('Logout failed: ', { type: 'error' });
        });
      } else {
        const userStream = reactiveLoginModal(currentTheme);
        userStream.subscribe(result => {
          if (result instanceof Error) {
            showToast(`Error: ${result.message}`, { type: 'error' });
          } else if (result) {
            currentUser = result;
            window.currentUser = currentUser;
            logUser.set('👤 Logout');
            avatarStream.set('flowLoggedIn.png');
            showSaveButton.set(true);
            rebuildMenu();
          }
        });
      }
    }
  };
}
