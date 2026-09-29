import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ShoppingItem } from '../types/shopping';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with configured databaseId
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot
(async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Expected if document doesn't exist, ensures client connection initialized
  }
})();

// Collections
export const ITEMS_COLLECTION = 'shopping_items';
export const USERS_COLLECTION = 'users';

// User Auth Service
export const authService = {
  subscribe(callback: (user: FirebaseUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
  },

  async signUp(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    // Record profile in Firestore
    try {
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
        id: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || cred.user.displayName || 'Usuário',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not write user profile doc:', e);
    }
    return cred.user;
  },

  async signIn(email: string, pass: string): Promise<FirebaseUser> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  async signInWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      try {
        await setDoc(
          doc(db, USERS_COLLECTION, cred.user.uid),
          {
            id: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Usuário',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not write user profile doc:', e);
      }
    }
    return cred.user;
  },

  async signInGuest(): Promise<FirebaseUser> {
    const cred = await signInAnonymously(auth);
    return cred.user;
  },

  async signOut(): Promise<void> {
    await signOut(auth);
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },
};

// Items Service for real-time multi-device sync
export const itemsService = {
  subscribe(
    onUpdate: (items: ShoppingItem[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, ITEMS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: ShoppingItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as ShoppingItem;
          items.push({
            ...data,
            id: d.id, // ensure ID consistency
          });
        });

        // Sort by order if set, otherwise by createdAt descending
        items.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          const timeA = new Date(b.createdAt || 0).getTime();
          const timeB = new Date(a.createdAt || 0).getTime();
          return timeA - timeB;
        });

        onUpdate(items);
      },
      (error) => {
        console.error('Firestore items subscription error:', error);
        if (onError) onError(error);
      }
    );
  },

  async saveItem(item: ShoppingItem): Promise<void> {
    const docRef = doc(db, ITEMS_COLLECTION, item.id);
    // Sanitize undefined fields which Firestore rejects
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    }
    await setDoc(docRef, cleanData, { merge: true });
  },

  async deleteItem(itemId: string): Promise<void> {
    const docRef = doc(db, ITEMS_COLLECTION, itemId);
    await deleteDoc(docRef);
  },

  async deleteMultipleItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const batch = writeBatch(db);
    for (const id of itemIds) {
      const docRef = doc(db, ITEMS_COLLECTION, id);
      batch.delete(docRef);
    }
    await batch.commit();
  },

  async seedInitialIfEmpty(defaultItems: ShoppingItem[]): Promise<void> {
    try {
      const colRef = collection(db, ITEMS_COLLECTION);
      const snapshot = await getDocs(colRef);
      if (snapshot.empty && defaultItems.length > 0) {
        const batch = writeBatch(db);
        for (const item of defaultItems) {
          const docRef = doc(db, ITEMS_COLLECTION, item.id);
          const cleanData: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(item)) {
            if (v !== undefined) cleanData[k] = v;
          }
          batch.set(docRef, cleanData);
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn('Could not seed initial items:', e);
    }
  },
};
