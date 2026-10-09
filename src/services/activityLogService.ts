import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { ActivityLogEntry } from '../types/shopping';

const ACTIVITY_STORAGE_KEY = 'shopping_activity_logs_v1';
export const ACTIVITY_COLLECTION = 'activity_logs';

const INITIAL_LOGS: ActivityLogEntry[] = [
  {
    id: 'log-seed-1',
    type: 'admin_login',
    title: 'Login de Administrador',
    description: 'Sessão de Administrador iniciada no painel de controle.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    userName: 'Administrador Principal',
    userRole: 'admin',
  },
  {
    id: 'log-seed-2',
    type: 'status_update',
    title: 'Status de Combate Atualizado',
    description: 'Status de Ella atualizado: Power 74.200 | Acerto 98.4 | Defesa 12.400 | Média 6.249,2.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    userName: 'Ella',
    userRole: 'membro',
  },
  {
    id: 'log-seed-3',
    type: 'item_add',
    title: 'Novo Item Adicionado',
    description: 'Item "Fragmento Ancestral" (1 un, Comum) cadastrado na lista.',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    userName: 'Admin',
    userRole: 'admin',
  },
  {
    id: 'log-seed-4',
    type: 'boss_checkin',
    title: 'Check-in de Chefe Realizado',
    description: 'Baltazar confirmou presença no Chefe Lorde Valir (+250 pontos).',
    timestamp: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    userName: 'Baltazar',
    userRole: 'membro',
  },
  {
    id: 'log-seed-5',
    type: 'settings_update',
    title: 'Preferências Atualizadas',
    description: 'Configurações gerais da despensa salvas com sucesso.',
    timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    userName: 'Admin',
    userRole: 'admin',
  },
];

function loadLocalLogs(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (raw) {
      const parsed: ActivityLogEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_LOGS;
}

function saveLocalLogs(logs: ActivityLogEntry[]) {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch {}
}

let cachedLogs: ActivityLogEntry[] = loadLocalLogs();
const memoryListeners: Set<(logs: ActivityLogEntry[]) => void> = new Set();

function broadcastLogs(logs: ActivityLogEntry[]) {
  cachedLogs = logs;
  saveLocalLogs(logs);
  memoryListeners.forEach((fn) => {
    try {
      fn(logs);
    } catch (e) {
      console.warn('Listener notification error:', e);
    }
  });
}

export const activityLogService = {
  getLogs(): ActivityLogEntry[] {
    return [...cachedLogs];
  },

  subscribe(
    onUpdate: (logs: ActivityLogEntry[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    memoryListeners.add(onUpdate);
    onUpdate([...cachedLogs]);

    let firestoreUnsub: Unsubscribe | null = null;
    try {
      const colRef = collection(db, ACTIVITY_COLLECTION);
      firestoreUnsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ActivityLogEntry[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as ActivityLogEntry;
              list.push({
                ...data,
                id: d.id,
              });
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            broadcastLogs(list);
          } else {
            // If empty in Firestore, write initial seeds
            if (cachedLogs.length === 0) {
              broadcastLogs(INITIAL_LOGS);
            }
          }
        },
        (err) => {
          console.warn('Activity logs Firestore snapshot notice:', err);
          if (onError) onError(err);
        }
      );
    } catch (e) {
      console.warn('Could not establish Firestore subscription for activity logs:', e);
    }

    return () => {
      memoryListeners.delete(onUpdate);
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  },

  async log(entry: {
    type: ActivityLogEntry['type'];
    title: string;
    description: string;
    userName?: string;
    userRole?: 'admin' | 'membro' | 'sistema';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      timestamp: new Date().toISOString(),
      userName: entry.userName || 'Sistema',
      userRole: entry.userRole || 'membro',
      metadata: entry.metadata,
    };

    const nextLogs = [newLog, ...cachedLogs.filter((l) => l.id !== newLog.id)].slice(0, 200);
    broadcastLogs(nextLogs);

    // Sync to Firestore
    try {
      const docRef = doc(db, ACTIVITY_COLLECTION, newLog.id);
      const cleanData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(newLog)) {
        if (v !== undefined) cleanData[k] = v;
      }
      await setDoc(docRef, cleanData);
    } catch (e) {
      console.warn('Could not persist activity log to Firestore:', e);
    }
  },

  async clearLogs(): Promise<void> {
    broadcastLogs([]);
    try {
      const colRef = collection(db, ACTIVITY_COLLECTION);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error clearing activity logs in Firestore:', e);
    }
  },
};
