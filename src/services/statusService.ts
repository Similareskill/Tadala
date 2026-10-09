import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { MemberStatus } from '../types/shopping';

const STATUSES_COLLECTION = 'member_statuses';
const LOCAL_STORAGE_KEY = 'guild_member_statuses_v1';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error in statusService: ', JSON.stringify(errInfo));
}

// Initial demonstration statuses for the guild
export const INITIAL_MEMBER_STATUSES: MemberStatus[] = [
  {
    id: 'status-ella',
    memberName: 'Ella',
    classe: 'Arqueiro',
    level: 112,
    dano: 18500,
    defesa: 12400,
    acerto: 98.4,
    power: 74200,
    media: 6249.2,
    notes: '0x3A2f...7B91',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'status-baltazar',
    memberName: 'Baltazar',
    classe: 'Espada Escudo',
    level: 108,
    dano: 14200,
    defesa: 22800,
    acerto: 92.5,
    power: 71500,
    media: 11446.25,
    notes: '0x9E14...8820',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'status-thorin',
    memberName: 'Thorin',
    classe: 'Mago',
    level: 115,
    dano: 23100,
    defesa: 9800,
    acerto: 96.0,
    power: 76800,
    media: 4948,
    notes: '0x5C47...119d',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'status-leandro',
    memberName: 'Leandro',
    classe: 'Espadão',
    level: 120,
    dano: 24500,
    defesa: 11200,
    acerto: 99.1,
    power: 82400,
    media: 5649.55,
    notes: '0x71CB...49b2',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function getStoredLocal(): MemberStatus[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_MEMBER_STATUSES;
}

function saveStoredLocal(list: MemberStatus[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const statusService = {
  subscribe(
    onUpdate: (statuses: MemberStatus[]) => void,
    onError?: (err: unknown) => void
  ): Unsubscribe {
    const colRef = collection(db, STATUSES_COLLECTION);

    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, seed with initial members so admin view has data
          this.seedInitialIfEmpty();
          const local = getStoredLocal();
          onUpdate(local);
          return;
        }

        const items: MemberStatus[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as MemberStatus;
          items.push({
            ...data,
            id: d.id,
          });
        });

        // Sort descending by Power
        items.sort((a, b) => (b.power || 0) - (a.power || 0));

        saveStoredLocal(items);
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, STATUSES_COLLECTION);
        const fallback = getStoredLocal();
        onUpdate(fallback);
        if (onError) onError(error);
      }
    );
  },

  async seedInitialIfEmpty(): Promise<void> {
    try {
      const colRef = collection(db, STATUSES_COLLECTION);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        const batch = writeBatch(db);
        INITIAL_MEMBER_STATUSES.forEach((status) => {
          const docRef = doc(db, STATUSES_COLLECTION, status.id);
          batch.set(docRef, status);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, STATUSES_COLLECTION);
    }
  },

  async saveStatus(status: MemberStatus): Promise<void> {
    // Optimistic local update
    const current = getStoredLocal();
    const existingIndex = current.findIndex(
      (s) => s.id === status.id || s.memberName.trim().toLowerCase() === status.memberName.trim().toLowerCase()
    );

    const targetId =
      status.id ||
      (existingIndex >= 0 ? current[existingIndex].id : `status-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);

    const updatedStatus: MemberStatus = {
      ...status,
      id: targetId,
      updatedAt: new Date().toISOString(),
      createdAt: status.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      current[existingIndex] = updatedStatus;
    } else {
      current.push(updatedStatus);
    }
    // Re-sort by Power
    current.sort((a, b) => (b.power || 0) - (a.power || 0));
    saveStoredLocal(current);

    // Save to Firestore
    try {
      const docRef = doc(db, STATUSES_COLLECTION, targetId);
      await setDoc(docRef, updatedStatus, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${STATUSES_COLLECTION}/${targetId}`);
    }
  },

  async deleteStatus(id: string): Promise<void> {
    // Local optimistic update
    const current = getStoredLocal().filter((s) => s.id !== id);
    saveStoredLocal(current);

    // Remote delete
    try {
      const docRef = doc(db, STATUSES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${STATUSES_COLLECTION}/${id}`);
    }
  },

  getLocalStatusForMember(memberName?: string): MemberStatus | null {
    if (!memberName) return null;
    const current = getStoredLocal();
    const clean = memberName.trim().toLowerCase();
    return current.find((s) => s.memberName.trim().toLowerCase() === clean) || null;
  },
};
