import { ActivityLogEntry } from '../types/shopping';
import { deviceSyncService } from './deviceSyncService';

type Unsubscribe = () => void;

const ACTIVITY_STORAGE_KEY = 'shopping_activity_logs_v1';

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

// Connect activityLogService to central multi-device sync
deviceSyncService.subscribe((partial) => {
  if (partial.activityLogs !== undefined && Array.isArray(partial.activityLogs)) {
    cachedLogs = partial.activityLogs;
    saveLocalLogs(partial.activityLogs);
    memoryListeners.forEach((fn) => {
      try {
        fn(partial.activityLogs!);
      } catch {}
    });
  }
});

function broadcastLogs(logs: ActivityLogEntry[]) {
  cachedLogs = logs;
  saveLocalLogs(logs);
  deviceSyncService.pushStateUpdate({ activityLogs: logs }, 'activity_logs').catch(() => {});
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
    _onError?: (err: Error) => void
  ): Unsubscribe {
    memoryListeners.add(onUpdate);
    onUpdate([...cachedLogs]);
    return () => {
      memoryListeners.delete(onUpdate);
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
  },

  async clearLogs(): Promise<void> {
    broadcastLogs([]);
  },
};
