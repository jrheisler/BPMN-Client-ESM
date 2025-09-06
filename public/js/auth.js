export const logUser = new Stream('👤 Login');
export let currentUser = null;
window.currentUser = currentUser;

export function authMenuOption({ avatarStream, showSaveButton, currentTheme, rebuildMenu }) {
  return {
    label: logUser.get(),
    onClick: () => {
      if (currentUser) {
        firebase.auth().signOut().then(() => {
          logUser.set('👤 Login');
          avatarStream.set('flow.png');
          showSaveButton.set(false);
          currentUser = null;
          window.currentUser = currentUser;
          rebuildMenu();
        }).catch(() => {
          if (window.showToast) {
            window.showToast('Logout failed: ', { type: 'error' });
          }
        });
      } else {
        const userStream = window.reactiveLoginModal(currentTheme);
        userStream.subscribe(result => {
          if (result instanceof Error) {
            if (window.showToast) {
              window.showToast(`Error: ${result.message}`, { type: 'error' });
            }
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
