import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyBPZymdl18kIYm3h4VZMIay23Do6DWQ51g",
  authDomain: "ultimate-decision-maker.firebaseapp.com",
  projectId: "ultimate-decision-maker",
  storageBucket: "ultimate-decision-maker.firebasestorage.app",
  messagingSenderId: "688962303534",
  appId: "1:688962303534:web:73496a6cd5da3107cdd1bf"
};

let firebaseConfig = defaultFirebaseConfig;

// Dynamic configuration loader for AI Studio workspace
try {
  const response = await fetch('./firebase-applet-config.json');
  if (response.ok) {
    const sandboxConfig = await response.json();
    if (sandboxConfig && sandboxConfig.apiKey) {
      firebaseConfig = sandboxConfig;
    }
  }
} catch (e) {
  console.log("Using default user-provided Firebase configuration.");
}

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Helpers
export async function saveUserProfile(uid, { name, todaySpins, champion, theme }) {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      name: name || "Anonymous User",
      todaySpins: todaySpins || 0,
      champion: champion || "—",
      theme: theme || "dark",
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function onUserProfileChanged(uid, callback) {
  const path = `users/${uid}`;
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

// Spin History Helpers
export async function saveSpinRecord(uid, winner, title, time) {
  const path = `users/${uid}/history`;
  try {
    const colRef = collection(db, 'users', uid, 'history');
    await addDoc(colRef, {
      userId: uid,
      winner: winner || "—",
      title: title || "Untitled",
      time: time || "",
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function onSpinHistoryChanged(uid, callback) {
  const path = `users/${uid}/history`;
  const q = query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'desc'), limit(20));
  return onSnapshot(q, (snapshot) => {
    const history = [];
    snapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });
    callback(history);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function deleteSpinRecord(uid, spinId) {
  const path = `users/${uid}/history/${spinId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'history', spinId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Wheel Preset Helpers
export async function saveWheelConfig(uid, title, options) {
  const path = `users/${uid}/wheels`;
  try {
    const colRef = collection(db, 'users', uid, 'wheels');
    await addDoc(colRef, {
      userId: uid,
      title: title || "Saved Wheel",
      options: options || [],
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function onSavedWheelsChanged(uid, callback) {
  const path = `users/${uid}/wheels`;
  const q = query(collection(db, 'users', uid, 'wheels'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const wheels = [];
    snapshot.forEach((doc) => {
      wheels.push({ id: doc.id, ...doc.data() });
    });
    callback(wheels);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function deleteWheelConfig(uid, wheelId) {
  const path = `users/${uid}/wheels/${wheelId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'wheels', wheelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Authentication Helpers
export { signInAnonymously, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut };
