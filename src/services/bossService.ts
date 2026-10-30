import { BossEvent, BossCheckin, UserRankEntry } from '../types/shopping';
import { deviceSyncService } from './deviceSyncService';

type Unsubscribe = () => void;

const LOCAL_STORAGE_BOSSES = 'craft_boss_events_data';
const LOCAL_STORAGE_CHECKINS = 'craft_boss_checkins_data';
const REMOVED_AUTO_CHECKINS_KEY = 'craft_removed_auto_checkins';
const SEASON_RESET_KEY = 'craft_checkins_season_cleared';

// Multi-device listeners
const bossListeners: Set<(events: BossEvent[]) => void> = new Set();
const checkinListeners: Set<(checkins: BossCheckin[]) => void> = new Set();

function notifyBossListeners(events: BossEvent[], emitNetwork: boolean = true) {
  if (emitNetwork) {
    deviceSyncService.pushStateUpdate({ bossEvents: events }, 'boss_events_update').catch(() => {});
  }
  bossListeners.forEach((listener) => {
    try {
      listener(events);
    } catch (e) {
      console.warn('Error in boss listener:', e);
    }
  });
}

function notifyCheckinListeners(checkins: BossCheckin[], emitNetwork: boolean = true) {
  if (emitNetwork) {
    deviceSyncService.pushStateUpdate({ checkins }, 'boss_checkins_update').catch(() => {});
  }
  checkinListeners.forEach((listener) => {
    try {
      listener(checkins);
    } catch (e) {
      console.warn('Error in checkin listener:', e);
    }
  });
}

// Initial preset Boss events
const now = Date.now();
export const INITIAL_BOSS_EVENTS: BossEvent[] = [
  {
    id: 'boss-1',
    bossName: 'Baltazar',
    scheduledTime: new Date(now - 15 * 60 * 1000).toISOString(),
    points: 5,
    description: 'Spawn na Fortaleza da Guilda. Recompensa itens de forja épicos.',
    category: 'Boss de Guilda',
    createdAt: new Date(now - 3600000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-2',
    bossName: 'Global',
    scheduledTime: new Date(now + 45 * 60 * 1000).toISOString(),
    points: 4,
    description: 'Spawn no mapa global. Todos os membros convocados.',
    category: 'Boss Global',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-3',
    bossName: 'Damiros',
    scheduledTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    points: 3,
    description: 'Boss de mapa aberto. Levar consumíveis de ataque.',
    category: 'Boss Global',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-4',
    bossName: 'Cavaleiro',
    scheduledTime: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    points: 2,
    description: 'Monstro Elite derrotado.',
    category: 'Boss Global',
    createdAt: new Date(now - 4 * 3600000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-5',
    bossName: 'Rotura',
    scheduledTime: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    points: 1,
    description: 'Evento de Rotura dimensional.',
    category: 'Boss Global',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-6',
    bossName: 'Τ.Α 4',
    scheduledTime: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    points: 5,
    description: 'Torre Ancestral 4. Requer grupo coordenado.',
    category: 'Boss TA2,TA3,TA4',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-7',
    bossName: 'Loccius-Abadia',
    scheduledTime: new Date(now + 5 * 60 * 60 * 1000).toISOString(),
    points: 3,
    description: 'Cripta da Abadia 118.',
    category: 'Boss Anonimas 110 / Abadia 118',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-8',
    bossName: 'T.A 5',
    scheduledTime: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
    points: 5,
    description: 'Torre Ancestral 5. Requer poder elevado e grupo coordenado.',
    category: 'Boss TA2,TA3,TA4',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
];

export const AUTO_CONFIRM_MEMBERS: string[] = ['Ella'];

export function isAutoConfirmMember(name?: string): boolean {
  if (!name) return false;
  return AUTO_CONFIRM_MEMBERS.some(
    (m) => m.trim().toLowerCase() === name.trim().toLowerCase()
  );
}

export function getRemovedAutoCheckins(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_AUTO_CHECKINS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function markAutoCheckinRemoved(bossId: string, member: string = 'Ella'): void {
  try {
    const list = getRemovedAutoCheckins();
    const key = `${bossId}:${member.trim().toLowerCase()}`;
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(REMOVED_AUTO_CHECKINS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function unmarkAutoCheckinRemoved(bossId: string, member: string = 'Ella'): void {
  try {
    const list = getRemovedAutoCheckins();
    const key = `${bossId}:${member.trim().toLowerCase()}`;
    const filtered = list.filter((k) => k !== key);
    localStorage.setItem(REMOVED_AUTO_CHECKINS_KEY, JSON.stringify(filtered));
  } catch {}
}

export function isAutoCheckinRemoved(bossId: string, member: string = 'Ella'): boolean {
  const key = `${bossId}:${member.trim().toLowerCase()}`;
  return getRemovedAutoCheckins().includes(key);
}

export function clearAllRemovedAutoCheckins(): void {
  try {
    localStorage.removeItem(REMOVED_AUTO_CHECKINS_KEY);
  } catch {}
}

export const INITIAL_CHECKINS: BossCheckin[] = INITIAL_BOSS_EVENTS.map((b) => ({
  id: `chk-auto-${b.id}-ella`,
  bossId: b.id,
  bossName: b.bossName,
  userName: 'Ella',
  points: b.points,
  checkedInAt: b.createdAt || new Date().toISOString(),
  isAutoCheckin: true,
}));

function getStoredLocalBosses(): BossEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOSSES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_BOSS_EVENTS;
}

function saveLocalBosses(bosses: BossEvent[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BOSSES, JSON.stringify(bosses));
  } catch {}
}

let cachedBossEvents: BossEvent[] = getStoredLocalBosses();

function syncAutoCheckinsInternal(
  bosses: BossEvent[],
  currentCheckins: BossCheckin[]
): BossCheckin[] {
  if (!bosses || bosses.length === 0) return currentCheckins;

  const updated = [...currentCheckins];
  let hasNew = false;
  const removedKeys = getRemovedAutoCheckins();

  bosses.forEach((boss) => {
    AUTO_CONFIRM_MEMBERS.forEach((member) => {
      const removedKey = `${boss.id}:${member.trim().toLowerCase()}`;
      if (removedKeys.includes(removedKey)) {
        return;
      }

      const alreadyExists = updated.some(
        (c) =>
          c.bossId === boss.id &&
          c.userName.trim().toLowerCase() === member.trim().toLowerCase()
      );

      if (!alreadyExists) {
        const checkinId = `chk-auto-${boss.id}-${member.toLowerCase()}`;
        const autoCheckin: BossCheckin = {
          id: checkinId,
          bossId: boss.id,
          bossName: boss.bossName,
          userName: member,
          points: boss.points,
          checkedInAt: boss.createdAt || new Date().toISOString(),
          isAutoCheckin: true,
        };
        updated.push(autoCheckin);
        hasNew = true;
      }
    });
  });

  if (hasNew) {
    updated.sort(
      (a, b) =>
        new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
    );
    saveLocalCheckins(updated);
    cachedCheckins = updated;
  }

  return updated;
}

function getStoredLocalCheckins(): BossCheckin[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHECKINS);
    if (raw !== null) {
      const parsed: BossCheckin[] = JSON.parse(raw);
      return syncAutoCheckinsInternal(getStoredLocalBosses(), parsed);
    }
  } catch {}
  return syncAutoCheckinsInternal(getStoredLocalBosses(), INITIAL_CHECKINS);
}

function saveLocalCheckins(checkins: BossCheckin[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHECKINS, JSON.stringify(checkins));
  } catch {}
}

let cachedCheckins: BossCheckin[] = getStoredLocalCheckins();

// Connect bossService to real-time sync service across devices
deviceSyncService.subscribe((partial) => {
  if (partial.bossEvents !== undefined && Array.isArray(partial.bossEvents)) {
    cachedBossEvents = partial.bossEvents;
    saveLocalBosses(partial.bossEvents);
    notifyBossListeners(partial.bossEvents, false);
  }

  if (partial.checkins !== undefined && Array.isArray(partial.checkins)) {
    const synced = syncAutoCheckinsInternal(cachedBossEvents, partial.checkins);
    cachedCheckins = synced;
    saveLocalCheckins(synced);
    notifyCheckinListeners(synced, false);
  }
});

export const bossService = {
  getInitialBossEvents(): BossEvent[] {
    return cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
  },

  getInitialCheckins(): BossCheckin[] {
    return cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
  },

  syncAutoCheckins(
    bosses: BossEvent[],
    currentCheckins: BossCheckin[]
  ): BossCheckin[] {
    return syncAutoCheckinsInternal(bosses, currentCheckins);
  },

  subscribeBossEvents(
    onUpdate: (events: BossEvent[]) => void,
    _onError?: (err: Error) => void
  ): Unsubscribe {
    bossListeners.add(onUpdate);
    const initial = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    onUpdate(initial);
    return () => {
      bossListeners.delete(onUpdate);
    };
  },

  subscribeCheckins(
    onUpdate: (checkins: BossCheckin[]) => void,
    _onError?: (err: Error) => void
  ): Unsubscribe {
    checkinListeners.add(onUpdate);
    const initialCheckins = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const initialBosses = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    const initialSynced = this.syncAutoCheckins(initialBosses, initialCheckins);
    onUpdate(initialSynced);
    return () => {
      checkinListeners.delete(onUpdate);
    };
  },

  async addBossEvent(
    data: Omit<BossEvent, 'id' | 'createdAt'>
  ): Promise<BossEvent> {
    const id = `boss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clampedPoints = Math.min(100, Math.max(1, Math.round(Number(data.points) || 1)));

    const newBoss: BossEvent = {
      id,
      bossName: (data.bossName || '').trim() || 'Boss Sem Nome',
      scheduledTime: data.scheduledTime || new Date().toISOString(),
      points: clampedPoints,
      category: data.category || 'Boss Global',
      createdBy: data.createdBy || 'Admin Guilda',
      createdAt: new Date().toISOString(),
    };

    if (data.checkinStartTime) {
      newBoss.checkinStartTime = data.checkinStartTime;
    }
    if (data.checkinEndTime) {
      newBoss.checkinEndTime = data.checkinEndTime;
    }
    if (data.description) {
      newBoss.description = data.description;
    }

    const current = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    const updated = [newBoss, ...current.filter((b) => b.id !== id)];
    cachedBossEvents = updated;
    saveLocalBosses(updated);
    notifyBossListeners(updated, true);

    const syncedCheckins = this.syncAutoCheckins([newBoss], cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins());
    notifyCheckinListeners(syncedCheckins, true);

    return newBoss;
  },

  async deleteBossEvent(id: string): Promise<void> {
    const current = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    const updated = current.filter((b) => b.id !== id);
    cachedBossEvents = updated;
    saveLocalBosses(updated);
    notifyBossListeners(updated, true);

    const allCheckins = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const updatedCheckins = allCheckins.filter((c) => c.bossId !== id);
    cachedCheckins = updatedCheckins;
    saveLocalCheckins(updatedCheckins);
    notifyCheckinListeners(updatedCheckins, true);
  },

  async deleteMultipleBossEvents(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const idsSet = new Set(ids);

    const current = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    const updated = current.filter((b) => !idsSet.has(b.id));
    cachedBossEvents = updated;
    saveLocalBosses(updated);
    notifyBossListeners(updated, true);

    const allCheckins = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const updatedCheckins = allCheckins.filter((c) => !idsSet.has(c.bossId));
    cachedCheckins = updatedCheckins;
    saveLocalCheckins(updatedCheckins);
    notifyCheckinListeners(updatedCheckins, true);
  },

  async deleteCheckin(checkinId: string, bossId?: string, userName?: string): Promise<void> {
    const all = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const target = all.find((c) => c.id === checkinId);

    const bId = bossId || target?.bossId;
    const uName = userName || target?.userName;

    if (bId && uName && isAutoConfirmMember(uName)) {
      markAutoCheckinRemoved(bId, uName);
    }

    const current = all.filter((c) => c.id !== checkinId);
    saveLocalCheckins(current);
    cachedCheckins = current;
    notifyCheckinListeners(current, true);
  },

  async removeAutoCheckinForBoss(bossId: string, memberName: string = 'Ella'): Promise<void> {
    markAutoCheckinRemoved(bossId, memberName);
    const all = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const target = all.find(
      (c) =>
        c.bossId === bossId &&
        c.userName.trim().toLowerCase() === memberName.trim().toLowerCase()
    );

    if (target) {
      await this.deleteCheckin(target.id, bossId, memberName);
    }
  },

  async removeAllAutoCheckins(memberName: string = 'Ella'): Promise<void> {
    const bosses = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    bosses.forEach((b) => markAutoCheckinRemoved(b.id, memberName));

    const all = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const remaining = all.filter(
      (c) => c.userName.trim().toLowerCase() !== memberName.trim().toLowerCase()
    );
    saveLocalCheckins(remaining);
    cachedCheckins = remaining;
    notifyCheckinListeners(remaining, true);
  },

  async restoreAutoCheckinForBoss(boss: BossEvent, memberName: string = 'Ella'): Promise<BossCheckin | null> {
    unmarkAutoCheckinRemoved(boss.id, memberName);
    const all = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const alreadyExists = all.some(
      (c) =>
        c.bossId === boss.id &&
        c.userName.trim().toLowerCase() === memberName.trim().toLowerCase()
    );

    if (alreadyExists) return null;

    const checkinId = `chk-auto-${boss.id}-${memberName.toLowerCase()}`;
    const autoCheckin: BossCheckin = {
      id: checkinId,
      bossId: boss.id,
      bossName: boss.bossName,
      userName: memberName,
      points: boss.points,
      checkedInAt: boss.createdAt || new Date().toISOString(),
      isAutoCheckin: true,
    };

    const updated = [autoCheckin, ...all];
    saveLocalCheckins(updated);
    cachedCheckins = updated;
    notifyCheckinListeners(updated, true);

    return autoCheckin;
  },

  async restoreAllAutoCheckins(memberName: string = 'Ella'): Promise<BossCheckin[]> {
    clearAllRemovedAutoCheckins();
    const bosses = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    const current = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const synced = this.syncAutoCheckins(bosses, current);
    notifyCheckinListeners(synced, true);
    return synced;
  },

  async addBonusPointsToOpenCheckins(
    bonus: number = 3,
    overrideBosses?: BossEvent[],
    overrideCheckins?: BossCheckin[]
  ): Promise<{ affectedBossesCount: number; affectedCheckinsCount: number; affectedBossNames: string[] }> {
    const allBosses =
      overrideBosses && overrideBosses.length > 0
        ? overrideBosses
        : cachedBossEvents.length > 0
        ? cachedBossEvents
        : getStoredLocalBosses();

    const openBosses = allBosses.filter((b) =>
      this.getCheckinWindowStatus(b.scheduledTime, b.checkinEndTime, b.checkinStartTime).isOpen
    );

    if (openBosses.length === 0) {
      return { affectedBossesCount: 0, affectedCheckinsCount: 0, affectedBossNames: [] };
    }

    const openBossIds = new Set(openBosses.map((b) => b.id));
    const affectedBossNames: string[] = [];

    const updatedBosses = allBosses.map((b) => {
      if (openBossIds.has(b.id)) {
        affectedBossNames.push(b.bossName);
        return { ...b, points: (b.points || 0) + bonus };
      }
      return b;
    });

    saveLocalBosses(updatedBosses);
    cachedBossEvents = updatedBosses;
    notifyBossListeners(updatedBosses, true);

    const allCheckins =
      overrideCheckins && overrideCheckins.length > 0
        ? overrideCheckins
        : cachedCheckins.length > 0
        ? cachedCheckins
        : getStoredLocalCheckins();

    let affectedCheckinsCount = 0;
    const updatedCheckins = allCheckins.map((chk) => {
      if (openBossIds.has(chk.bossId)) {
        affectedCheckinsCount++;
        return { ...chk, points: (chk.points || 0) + bonus };
      }
      return chk;
    });

    saveLocalCheckins(updatedCheckins);
    cachedCheckins = updatedCheckins;
    notifyCheckinListeners(updatedCheckins, true);

    return {
      affectedBossesCount: openBosses.length,
      affectedCheckinsCount,
      affectedBossNames,
    };
  },

  async addBonusPointsToSingleBoss(
    bossId: string,
    bonus: number = 3,
    overrideBosses?: BossEvent[],
    overrideCheckins?: BossCheckin[]
  ): Promise<{ success: boolean; newPoints: number; bossName: string; checkinsCount: number }> {
    const allBosses =
      overrideBosses && overrideBosses.length > 0
        ? overrideBosses
        : cachedBossEvents.length > 0
        ? cachedBossEvents
        : getStoredLocalBosses();

    const boss = allBosses.find((b) => b.id === bossId);
    if (!boss) return { success: false, newPoints: 0, bossName: '', checkinsCount: 0 };

    const newPoints = (boss.points || 0) + bonus;
    const updatedBoss = { ...boss, points: newPoints };
    const updatedBosses = allBosses.map((b) => (b.id === bossId ? updatedBoss : b));

    saveLocalBosses(updatedBosses);
    cachedBossEvents = updatedBosses;
    notifyBossListeners(updatedBosses, true);

    const allCheckins =
      overrideCheckins && overrideCheckins.length > 0
        ? overrideCheckins
        : cachedCheckins.length > 0
        ? cachedCheckins
        : getStoredLocalCheckins();

    let checkinsCount = 0;
    const updatedCheckins = allCheckins.map((c) => {
      if (c.bossId === bossId) {
        checkinsCount++;
        return { ...c, points: (c.points || 0) + bonus };
      }
      return c;
    });

    saveLocalCheckins(updatedCheckins);
    cachedCheckins = updatedCheckins;
    notifyCheckinListeners(updatedCheckins, true);

    return { success: true, newPoints, bossName: boss.bossName, checkinsCount };
  },

  async addBonusPointsToSingleCheckin(
    checkinId: string,
    bonus: number = 3,
    overrideCheckins?: BossCheckin[]
  ): Promise<{ success: boolean; newPoints: number; userName: string; bossName: string }> {
    const allCheckins =
      overrideCheckins && overrideCheckins.length > 0
        ? overrideCheckins
        : cachedCheckins.length > 0
        ? cachedCheckins
        : getStoredLocalCheckins();

    const chk = allCheckins.find((c) => c.id === checkinId);
    if (!chk) return { success: false, newPoints: 0, userName: '', bossName: '' };

    const newPoints = (chk.points || 0) + bonus;
    const updated = { ...chk, points: newPoints };
    const updatedCheckins = allCheckins.map((c) => (c.id === checkinId ? updated : c));

    saveLocalCheckins(updatedCheckins);
    cachedCheckins = updatedCheckins;
    notifyCheckinListeners(updatedCheckins, true);

    return { success: true, newPoints, userName: chk.userName, bossName: chk.bossName };
  },

  getCheckinWindowStatus(
    scheduledTime: string,
    checkinEndTime?: string,
    checkinStartTime?: string
  ) {
    const startMs = checkinStartTime
      ? new Date(checkinStartTime).getTime()
      : new Date(scheduledTime).getTime();

    const endMs = checkinEndTime
      ? new Date(checkinEndTime).getTime()
      : startMs + 60 * 60 * 1000;

    const currentMs = Date.now();
    const isUpcoming = currentMs < startMs;
    const isOpen = currentMs >= startMs && currentMs <= endMs;
    const isExpired = currentMs > endMs;

    let remainingMs = 0;
    if (isUpcoming) {
      remainingMs = startMs - currentMs;
    } else if (isOpen) {
      remainingMs = endMs - currentMs;
    }

    return {
      isOpen,
      isUpcoming,
      isExpired,
      startMs,
      endMs,
      remainingMs,
    };
  },

  async confirmCheckin(
    boss: BossEvent,
    userName: string
  ): Promise<{ success: boolean; error?: string; checkin?: BossCheckin }> {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      return { success: false, error: 'Por favor, informe seu nome ou nick de jogador.' };
    }

    const window = this.getCheckinWindowStatus(
      boss.scheduledTime,
      boss.checkinEndTime,
      boss.checkinStartTime
    );
    if (window.isUpcoming) {
      return {
        success: false,
        error: `O período de check-in deste Boss ainda não abriu. Inicia em ${formatTimeRemaining(window.remainingMs)}.`,
      };
    }

    if (window.isExpired) {
      return {
        success: false,
        error: 'O período de check-in para este Boss já foi encerrado.',
      };
    }

    const activeCheckins = cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins();
    const alreadyDone = activeCheckins.some(
      (c) =>
        c.bossId === boss.id &&
        c.userName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyDone) {
      return {
        success: false,
        error: `"${trimmedName}" já confirmou presença neste Boss!`,
      };
    }

    const checkinId = `chk-${boss.id}-${Date.now()}`;
    const newCheckin: BossCheckin = {
      id: checkinId,
      bossId: boss.id,
      bossName: boss.bossName,
      userName: trimmedName,
      points: boss.points,
      checkedInAt: new Date().toISOString(),
    };

    try {
      localStorage.removeItem(SEASON_RESET_KEY);
    } catch {}
    const updated = [newCheckin, ...activeCheckins];
    saveLocalCheckins(updated);
    cachedCheckins = updated;
    notifyCheckinListeners(updated, true);

    return { success: true, checkin: newCheckin };
  },

  computeRank(checkins: BossCheckin[]): UserRankEntry[] {
    const userMap = new Map<string, UserRankEntry>();

    checkins.forEach((c) => {
      const key = c.userName.toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, {
          userName: c.userName,
          totalPoints: 0,
          totalCheckins: 0,
          checkins: [],
          lastCheckinAt: c.checkedInAt,
        });
      }

      const entry = userMap.get(key)!;
      entry.totalPoints += c.points;
      entry.totalCheckins += 1;
      entry.checkins.push(c);
      if (new Date(c.checkedInAt) > new Date(entry.lastCheckinAt)) {
        entry.lastCheckinAt = c.checkedInAt;
      }
    });

    const rankList = Array.from(userMap.values());
    rankList.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.totalCheckins - a.totalCheckins;
    });

    return rankList;
  },

  async resetAllCheckins(): Promise<void> {
    try {
      localStorage.setItem(SEASON_RESET_KEY, 'true');
    } catch {}
    saveLocalCheckins([]);
    cachedCheckins = [];
    notifyCheckinListeners([], true);
  },
};

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
