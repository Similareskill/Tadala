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
  Unsubscribe,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ShoppingItem, AppSettings, ShoppingHistoryEntry } from '../types/shopping';
import { deviceSyncService } from './deviceSyncService';

// Initialize Firebase App for optional Auth (Firestore is completely removed)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Dummy database placeholder to preserve any external compatibility without Firestore
export const db = null as any;

export async function validateFirestoreConnection(): Promise<boolean> {
  return true;
}

export async function reconnectFirestore(): Promise<boolean> {
  return deviceSyncService.forceResyncAll().then(() => true).catch(() => false);
}

// User Auth Service (uses Firebase Auth without Firestore)
export const authService = {
  subscribe(callback: (user: FirebaseUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
  },

  async signUp(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
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

// In-memory cache for items, settings, and history
let cachedItems: ShoppingItem[] = [];
let cachedSettings: AppSettings | null = null;
let cachedHistory: ShoppingHistoryEntry[] = [];

// Load initial from local storage if available
try {
  const saved = localStorage.getItem('shopping_items_v2');
  if (saved) cachedItems = JSON.parse(saved);
} catch {}
try {
  const saved = localStorage.getItem('shopping_settings_v2');
  if (saved) cachedSettings = JSON.parse(saved);
} catch {}
try {
  const saved = localStorage.getItem('shopping_history_v2');
  if (saved) cachedHistory = JSON.parse(saved);
} catch {}

const itemListeners: Set<(items: ShoppingItem[]) => void> = new Set();
const settingsListeners: Set<(settings: AppSettings) => void> = new Set();
const historyListeners: Set<(history: ShoppingHistoryEntry[]) => void> = new Set();

// Hook into central multi-device sync
deviceSyncService.subscribe((partial) => {
  if (partial.items && Array.isArray(partial.items)) {
    cachedItems = partial.items;
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(partial.items));
    } catch {}
    itemListeners.forEach((fn) => {
      try {
        fn(partial.items!);
      } catch {}
    });
  }

  if (partial.settings && typeof partial.settings === 'object') {
    cachedSettings = { ...(cachedSettings || {}), ...partial.settings } as AppSettings;
    try {
      localStorage.setItem('shopping_settings_v2', JSON.stringify(cachedSettings));
    } catch {}
    settingsListeners.forEach((fn) => {
      try {
        fn(cachedSettings!);
      } catch {}
    });
  }

  if (partial.history && Array.isArray(partial.history)) {
    cachedHistory = partial.history;
    try {
      localStorage.setItem('shopping_history_v2', JSON.stringify(partial.history));
    } catch {}
    historyListeners.forEach((fn) => {
      try {
        fn(partial.history!);
      } catch {}
    });
  }
});

// Items Service for real-time multi-device sync (Pure Server-Authoritative + WebSocket + SSE Mesh)
export const itemsService = {
  subscribe(
    onUpdate: (items: ShoppingItem[]) => void,
    _onError?: (err: Error) => void
  ): Unsubscribe {
    itemListeners.add(onUpdate);
    if (cachedItems.length > 0) {
      onUpdate(cachedItems);
    }
    return () => itemListeners.delete(onUpdate);
  },

  async saveItem(item: ShoppingItem): Promise<void> {
    const current = cachedItems.filter((i) => i.id !== item.id);
    const updated = [item, ...current];
    cachedItems = updated;
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(updated));
    } catch {}
    itemListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ items: updated }, `saveItem(${item.name})`);
  },

  async deleteItem(itemId: string): Promise<void> {
    const updated = cachedItems.filter((i) => i.id !== itemId);
    cachedItems = updated;
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(updated));
    } catch {}
    itemListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ items: updated }, `deleteItem(${itemId})`);
  },

  async deleteMultipleItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const idSet = new Set(itemIds);
    const updated = cachedItems.filter((i) => !idSet.has(i.id));
    cachedItems = updated;
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(updated));
    } catch {}
    itemListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ items: updated }, `deleteMultipleItems(${itemIds.length})`);
  },

  async clearAllItems(): Promise<void> {
    cachedItems = [];
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify([]));
    } catch {}
    itemListeners.forEach((fn) => fn([]));
    await deviceSyncService.pushStateUpdate({ items: [] }, 'clearAllItems');
  },

  async syncAllItems(newItems: ShoppingItem[], replace: boolean = false): Promise<void> {
    const updated = replace ? newItems : [...newItems, ...cachedItems.filter((i) => !newItems.some((n) => n.id === i.id))];
    cachedItems = updated;
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(updated));
    } catch {}
    itemListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ items: updated }, 'syncAllItems');
  },

  async seedInitialIfEmpty(defaultItems: ShoppingItem[]): Promise<void> {
    if (cachedItems.length === 0 && defaultItems.length > 0) {
      cachedItems = defaultItems;
      try {
        localStorage.setItem('shopping_items_v2', JSON.stringify(defaultItems));
      } catch {}
      itemListeners.forEach((fn) => fn(defaultItems));
      await deviceSyncService.pushStateUpdate({ items: defaultItems }, 'seedInitialItems');
    }
  },
};

// Settings Service for real-time multi-device sync
export const settingsService = {
  subscribe(
    onUpdate: (settings: AppSettings) => void,
    _onError?: (err: Error) => void
  ): Unsubscribe {
    settingsListeners.add(onUpdate);
    if (cachedSettings) {
      onUpdate(cachedSettings);
    }
    return () => settingsListeners.delete(onUpdate);
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    cachedSettings = settings;
    try {
      localStorage.setItem('shopping_settings_v2', JSON.stringify(settings));
    } catch {}
    settingsListeners.forEach((fn) => fn(settings));
    await deviceSyncService.pushStateUpdate({ settings }, 'saveSettings');
  },
};

// History Service for real-time multi-device sync
export const historyService = {
  subscribe(
    onUpdate: (history: ShoppingHistoryEntry[]) => void,
    _onError?: (err: Error) => void
  ): Unsubscribe {
    historyListeners.add(onUpdate);
    if (cachedHistory.length > 0) {
      onUpdate(cachedHistory);
    }
    return () => historyListeners.delete(onUpdate);
  },

  async addEntry(entry: ShoppingHistoryEntry): Promise<void> {
    const updated = [entry, ...cachedHistory.filter((h) => h.id !== entry.id)];
    cachedHistory = updated;
    try {
      localStorage.setItem('shopping_history_v2', JSON.stringify(updated));
    } catch {}
    historyListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ history: updated }, 'addHistoryEntry');
  },

  async deleteEntry(id: string): Promise<void> {
    const updated = cachedHistory.filter((h) => h.id !== id);
    cachedHistory = updated;
    try {
      localStorage.setItem('shopping_history_v2', JSON.stringify(updated));
    } catch {}
    historyListeners.forEach((fn) => fn(updated));
    await deviceSyncService.pushStateUpdate({ history: updated }, 'deleteHistoryEntry');
  },
};
