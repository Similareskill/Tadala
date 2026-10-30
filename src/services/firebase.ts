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
  setLogLevel,
  enableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ShoppingItem, AppSettings, ShoppingHistoryEntry } from '../types/shopping';
import {
  isQuotaExceededError,
  notifyQuotaExceeded,
  resetQuotaState,
  executeSafeFirestoreWrite,
} from '../utils/firestoreErrorHandler';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore using canonical configuration with databaseId
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate Connection to Firestore on boot (as per Firebase Integration Skill)
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await enableNetwork(db).catch(() => {});
    await getDocFromServer(doc(db, 'system_config', 'app_settings'));
    resetQuotaState();
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection notice: Attempting to reconnect network...');
      try {
        await enableNetwork(db);
      } catch {}
    }
    return false;
  }
}

// Initial connection test
validateFirestoreConnection().catch(() => {});

export async function reconnectFirestore(): Promise<boolean> {
  resetQuotaState();
  try {
    await enableNetwork(db);
    return true;
  } catch {
    return false;
  }
}


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
        if (isQuotaExceededError(error)) {
          notifyQuotaExceeded();
          console.warn('[Firestore Offline Fallback] Cota diária do Firestore atingida em shopping_items. Os itens locais continuarão funcionando normalmente.');
        } else {
          console.warn('Firestore items subscription notice:', error);
        }
        if (onError) onError(error);
      }
    );
  },

  async saveItem(item: ShoppingItem): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const docRef = doc(db, ITEMS_COLLECTION, item.id);
      const cleanData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      await setDoc(docRef, cleanData, { merge: true });
    }, `saveItem(${item.id})`);
  },

  async deleteItem(itemId: string): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const docRef = doc(db, ITEMS_COLLECTION, itemId);
      await deleteDoc(docRef);
    }, `deleteItem(${itemId})`);
  },

  async deleteMultipleItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    await executeSafeFirestoreWrite(async () => {
      const batch = writeBatch(db);
      for (const id of itemIds) {
        const docRef = doc(db, ITEMS_COLLECTION, id);
        batch.delete(docRef);
      }
      await batch.commit();
    }, `deleteMultipleItems(${itemIds.length})`);
  },

  async clearAllItems(): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const colRef = collection(db, ITEMS_COLLECTION);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }, 'clearAllItems');
  },

  async syncAllItems(newItems: ShoppingItem[], replace: boolean = false): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      if (replace) {
        await this.clearAllItems();
      }
      if (newItems.length === 0) return;
      const batch = writeBatch(db);
      for (const item of newItems) {
        const docRef = doc(db, ITEMS_COLLECTION, item.id);
        const cleanData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined) cleanData[k] = v;
        }
        batch.set(docRef, cleanData, { merge: true });
      }
      await batch.commit();
    }, 'syncAllItems');
  },

  async seedInitialIfEmpty(defaultItems: ShoppingItem[]): Promise<void> {
    const SEEDED_KEY = 'craft_items_seeded_v1';
    if (localStorage.getItem(SEEDED_KEY) === 'true') {
      return;
    }
    await executeSafeFirestoreWrite(async () => {
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
      localStorage.setItem(SEEDED_KEY, 'true');
    }, 'seedInitialIfEmpty');
  },
};

// Settings Service for real-time multi-device sync
export const SETTINGS_COLLECTION = 'system_config';
export const SETTINGS_DOC_ID = 'app_settings';

export const settingsService = {
  subscribe(
    onUpdate: (settings: AppSettings) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as AppSettings);
        }
      },
      (err) => {
        console.warn('Settings subscription notice:', err);
        if (onError) onError(err);
      }
    );
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      await setDoc(docRef, settings, { merge: true });
    }, 'saveSettings');
  },
};

// History Service for real-time multi-device sync
export const HISTORY_COLLECTION = 'shopping_history';

export const historyService = {
  subscribe(
    onUpdate: (history: ShoppingHistoryEntry[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, HISTORY_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: ShoppingHistoryEntry[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as ShoppingHistoryEntry), id: d.id });
        });
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('History subscription notice:', err);
        if (onError) onError(err);
      }
    );
  },

  async addEntry(entry: ShoppingHistoryEntry): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const docRef = doc(db, HISTORY_COLLECTION, entry.id);
      await setDoc(docRef, entry);
    }, 'addHistoryEntry');
  },

  async deleteEntry(id: string): Promise<void> {
    await executeSafeFirestoreWrite(async () => {
      const docRef = doc(db, HISTORY_COLLECTION, id);
      await deleteDoc(docRef);
    }, 'deleteHistoryEntry');
  },
};
