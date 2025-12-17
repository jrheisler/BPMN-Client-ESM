// Copy this file to firebase.js and replace the placeholder values with your
// Firebase project configuration. The exported surface should stay the same so
// that other modules can import `getFirebase`, `showFirebaseLoading`, and
// `hideFirebaseLoading` without modification.

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  // …
};

let firebaseInitPromise = null;

function ensureFirebaseLoadingIndicator() {
  let indicator = document.querySelector('[data-firebase-loading]');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.dataset.firebaseLoading = 'true';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '1rem';
    indicator.style.right = '1rem';
    indicator.style.padding = '0.65rem 0.9rem';
    indicator.style.borderRadius = '999px';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.gap = '0.5rem';
    indicator.style.background = 'rgba(0, 0, 0, 0.75)';
    indicator.style.color = '#fff';
    indicator.style.fontSize = '0.9rem';
    indicator.style.fontFamily = 'system-ui, sans-serif';
    indicator.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
    indicator.style.zIndex = '10000';
    indicator.hidden = true;

    const spinner = document.createElement('span');
    spinner.textContent = '⏳';
    spinner.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.dataset.firebaseLoadingLabel = 'true';
    label.textContent = 'Connecting…';

    indicator.appendChild(spinner);
    indicator.appendChild(label);
    document.body.appendChild(indicator);
  }

  return indicator;
}

export function showFirebaseLoading(message = 'Connecting to cloud…') {
  const indicator = ensureFirebaseLoadingIndicator();
  const label = indicator.querySelector('[data-firebase-loading-label]');

  if (label) {
    label.textContent = message;
  }

  indicator.hidden = false;
  indicator.style.display = 'flex';
  indicator.setAttribute('aria-hidden', 'false');
}

export function hideFirebaseLoading() {
  const indicator = ensureFirebaseLoadingIndicator();
  indicator.hidden = true;
  indicator.style.display = 'none';
  indicator.setAttribute('aria-hidden', 'true');
}

export async function getFirebase() {
  if (!firebaseInitPromise) {
    firebaseInitPromise = (async () => {
      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore')
      ]);

      const app = initializeApp(firebaseConfig);
      return {
        app,
        auth: getAuth(app),
        db: getFirestore(app)
      };
    })();
  }

  return firebaseInitPromise;
}

// Provide an explicit named export map to ensure module systems can resolve
// the Firebase helpers even if tree-shaking or minification happens in
// hosting environments.
export const firebaseClient = getFirebase;
export default getFirebase;
