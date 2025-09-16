import { Stream } from '../core/stream.js';
import { currentTheme } from '../core/theme.js';
import { createModal } from '../components/modal.js';
import { editText, reactiveButton } from '../components/index.js';
import { auth, db } from '../firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function reactiveLoginModal(themeStream = currentTheme) {
  const loginStream = new Stream(null); // emits user or error or null (cancel)
  const emailStream = new Stream('');
  const passwordStream = new Stream('');

  const { modal, content } = createModal(themeStream, () => loginStream.set(null));

  const title = document.createElement('h2');
  title.textContent = 'Log in to Flow Control Center';
  title.style.margin = '0';
  content.appendChild(title);

  content.appendChild(editText(emailStream, {
    placeholder: 'Email',
    width: '100%',
    padding: '0.5rem'
  }, themeStream));

  const passwordInput = editText(passwordStream, {
    placeholder: 'Password',
    width: '100%',
    padding: '0.5rem'
  }, themeStream);
  passwordInput.type = 'password';
  content.appendChild(passwordInput);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'space-between';
  btnRow.style.gap = '1rem';

  const loginBtn = reactiveButton(new Stream("Login"), async () => {
    const email = emailStream.get();
    const password = passwordStream.get();

    if (!email || !password) {
      loginStream.set(new Error("Email and password are required."));
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      loginStream.set(userCred.user);
      modal.remove();
    } catch (err) {
      loginStream.set(new Error(err.message));
    }
  }, { accent: true }, themeStream);

  const signupBtn = reactiveButton(new Stream("Subscribe"), async () => {
    const email = emailStream.get();
    const password = passwordStream.get();

    if (!email || !password) {
      loginStream.set(new Error("Email and password are required."));
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(
        doc(db, 'users', userCred.user.uid),
        {
          email: userCred.user.email,
          uid: userCred.user.uid,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );

      loginStream.set(userCred.user);
      modal.remove();
    } catch (err) {
      loginStream.set(new Error(err.message));
    }
  }, { outline: true }, themeStream);

  const cancelBtn = reactiveButton(new Stream("Cancel"), () => {
    loginStream.set(null);
    modal.remove();
  }, { outline: true }, themeStream);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(signupBtn);
  btnRow.appendChild(loginBtn);
  content.appendChild(btnRow);

  return loginStream;
}
