import { MemberStatus } from '../types/shopping';
import { deviceSyncService } from './deviceSyncService';

type Unsubscribe = () => void;

const LOCAL_STORAGE_KEY = 'guild_member_statuses_v1';

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

let cachedStatuses: MemberStatus[] = getStoredLocal();
const statusListeners: Set<(statuses: MemberStatus[]) => void> = new Set();

// Connect statusService to central multi-device sync
deviceSyncService.subscribe((partial) => {
  if (partial.memberStatuses !== undefined && Array.isArray(partial.memberStatuses)) {
    cachedStatuses = partial.memberStatuses;
    saveStoredLocal(partial.memberStatuses);
    statusListeners.forEach((fn) => {
      try {
        fn(partial.memberStatuses!);
      } catch {}
    });
  }
});

export const statusService = {
  getInitialStatuses(): MemberStatus[] {
    return cachedStatuses.length > 0 ? cachedStatuses : getStoredLocal();
  },

  subscribe(
    onUpdate: (statuses: MemberStatus[]) => void,
    _onError?: (err: unknown) => void
  ): Unsubscribe {
    statusListeners.add(onUpdate);
    onUpdate(cachedStatuses.length > 0 ? cachedStatuses : getStoredLocal());
    return () => {
      statusListeners.delete(onUpdate);
    };
  },

  async seedInitialIfEmpty(): Promise<void> {
    if (cachedStatuses.length === 0) {
      cachedStatuses = INITIAL_MEMBER_STATUSES;
      saveStoredLocal(INITIAL_MEMBER_STATUSES);
      statusListeners.forEach((fn) => fn(INITIAL_MEMBER_STATUSES));
      await deviceSyncService.pushStateUpdate({ memberStatuses: INITIAL_MEMBER_STATUSES }, 'seed_statuses');
    }
  },

  async saveStatus(status: MemberStatus): Promise<void> {
    const current = cachedStatuses.length > 0 ? [...cachedStatuses] : getStoredLocal();
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

    current.sort((a, b) => (b.power || 0) - (a.power || 0));
    cachedStatuses = current;
    saveStoredLocal(current);
    statusListeners.forEach((fn) => fn(current));

    await deviceSyncService.pushStateUpdate({ memberStatuses: current }, `save_status(${updatedStatus.memberName})`);
  },

  async deleteStatus(id: string): Promise<void> {
    const current = (cachedStatuses.length > 0 ? cachedStatuses : getStoredLocal()).filter((s) => s.id !== id);
    cachedStatuses = current;
    saveStoredLocal(current);
    statusListeners.forEach((fn) => fn(current));

    await deviceSyncService.pushStateUpdate({ memberStatuses: current }, `delete_status(${id})`);
  },

  async deleteMultipleStatuses(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const current = (cachedStatuses.length > 0 ? cachedStatuses : getStoredLocal()).filter((s) => !idSet.has(s.id));
    cachedStatuses = current;
    saveStoredLocal(current);
    statusListeners.forEach((fn) => fn(current));

    await deviceSyncService.pushStateUpdate({ memberStatuses: current }, `delete_multiple_statuses(${ids.length})`);
  },

  getLocalStatusForMember(memberName?: string): MemberStatus | null {
    if (!memberName) return null;
    const current = cachedStatuses.length > 0 ? cachedStatuses : getStoredLocal();
    const clean = memberName.trim().toLowerCase();
    return current.find((s) => s.memberName.trim().toLowerCase() === clean) || null;
  },
};
