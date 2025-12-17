import { Stream } from './core/stream.js';
import { reactiveLoginModal } from './modals/index.js';
import { getFirebase, showFirebaseLoading, hideFirebaseLoading } from './firebase.js';
import { signOut } from 'firebase/auth';
import { showToast } from './components/index.js';

export const logUser = new Stream('👤 Login');
export let currentUser = null;
window.currentUser = currentUser;

export function authMenuOption({ avatarStream, showSaveButton, currentTheme, rebuildMenu, onLogin }) {
  const handleLogin = typeof onLogin === 'function' ? onLogin : () => {};
  return {
    label: logUser.get(),
    onClick: async () => {
      if (currentUser) {
        showFirebaseLoading('Signing out…');

        try {
          const { auth } = await getFirebase();
          await signOut(auth);
          logUser.set('👤 Login');
          avatarStream.set('flow.png');
          showSaveButton.set(false);
          currentUser = null;
          window.currentUser = currentUser;
          rebuildMenu();
        } catch (err) {
          showToast('Logout failed: ' + (err?.message || ''), { type: 'error' });
        } finally {
          hideFirebaseLoading();
        }
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
            handleLogin();
          }
        });
      }
    }
  };
}
