import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAILS = ['hamzahyousaf@gmail.com', 'estrowner@gmail.com'];

export async function checkWhitelist(email: string) {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  const whitelistRef = doc(db, 'whitelisted_users', email.toLowerCase());
  const docSnap = await getDoc(whitelistRef);
  return docSnap.exists();
}

export async function testConnection() {
  try {
    // Attempt to read a non-existent doc to trigger connection check
    await getDocFromServer(doc(db, 'system', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
