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
import { db } from './firebase';
import { BossEvent, BossCheckin, UserRankEntry } from '../types/shopping';

const BOSS_EVENTS_COLLECTION = 'boss_events';
const BOSS_CHECKINS_COLLECTION = 'boss_checkins';
const LOCAL_STORAGE_BOSSES = 'craft_boss_events_data';
const LOCAL_STORAGE_CHECKINS = 'craft_boss_checkins_data';
const SEASON_RESET_KEY = 'craft_checkins_season_cleared';

// Initial preset Boss events (including an active one open right now so check-in can be tested immediately!)
const now = Date.now();
export const INITIAL_BOSS_EVENTS: BossEvent[] = [
  {
    id: 'boss-1',
    bossName: 'Baltazar',
    scheduledTime: new Date(now - 15 * 60 * 1000).toISOString(), // Started 15 min ago -> check-in active for ~45 min more!
    points: 5,
    description: 'Spawn na Fortaleza da Guilda. Recompensa itens de forja épicos.',
    category: 'Boss de Guilda',
    createdAt: new Date(now - 3600000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-2',
    bossName: 'Global',
    scheduledTime: new Date(now + 45 * 60 * 1000).toISOString(), // In 45 min
    points: 4,
    description: 'Spawn no mapa global. Todos os membros convocados.',
    category: 'Boss Global',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-3',
    bossName: 'Damiros',
    scheduledTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(), // In 2 hours
    points: 3,
    description: 'Boss de mapa aberto. Levar consumíveis de ataque.',
    category: 'Boss Global',
    createdAt: new Date(now - 1800000).toISOString(),
    createdBy: 'Admin Guilda',
  },
  {
    id: 'boss-4',
    bossName: 'Cavaleiro',
    scheduledTime: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // Past boss
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
];

export const INITIAL_CHECKINS: BossCheckin[] = [];

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

function getStoredLocalCheckins(): BossCheckin[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHECKINS);
    if (raw !== null) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalCheckins(checkins: BossCheckin[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHECKINS, JSON.stringify(checkins));
  } catch {}
}

let cachedBossEvents: BossEvent[] = [];
let cachedCheckins: BossCheckin[] = [];

export const bossService = {
  // Subscribe to Boss Events
  subscribeBossEvents(
    onUpdate: (events: BossEvent[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial emit from local / cache
    const initial = cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses();
    onUpdate(initial);

    const colRef = collection(db, BOSS_EVENTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // If first run and completely empty, seed initial bosses once
          const local = getStoredLocalBosses();
          if (local.length > 0 && cachedBossEvents.length === 0) {
            onUpdate(local);
            local.forEach((b) => {
              setDoc(doc(db, BOSS_EVENTS_COLLECTION, b.id), b).catch(() => {});
            });
            return;
          }
          cachedBossEvents = [];
          saveLocalBosses([]);
          onUpdate([]);
          return;
        }

        const events: BossEvent[] = [];
        snapshot.forEach((d) => {
          events.push({ ...(d.data() as BossEvent), id: d.id });
        });

        // Sort by scheduledTime ascending (earliest first)
        events.sort(
          (a, b) =>
            new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
        );

        cachedBossEvents = events;
        saveLocalBosses(events);
        onUpdate(events);
      },
      (error) => {
        console.warn('Firestore boss_events subscription fallback:', error);
        onUpdate(cachedBossEvents.length > 0 ? cachedBossEvents : getStoredLocalBosses());
        if (onError) onError(error);
      }
    );
  },

  // Subscribe to Checkins
  subscribeCheckins(
    onUpdate: (checkins: BossCheckin[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Initial emit from cache or local
    onUpdate(cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins());

    const colRef = collection(db, BOSS_CHECKINS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          cachedCheckins = [];
          saveLocalCheckins([]);
          onUpdate([]);
          return;
        }

        const checkins: BossCheckin[] = [];
        snapshot.forEach((d) => {
          checkins.push({ ...(d.data() as BossCheckin), id: d.id });
        });

        // Sort by checkedInAt descending
        checkins.sort(
          (a, b) =>
            new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
        );

        cachedCheckins = checkins;
        saveLocalCheckins(checkins);
        onUpdate(checkins);
      },
      (error) => {
        console.warn('Firestore boss_checkins subscription fallback:', error);
        onUpdate(cachedCheckins.length > 0 ? cachedCheckins : getStoredLocalCheckins());
        if (onError) onError(error);
      }
    );
  },

  // Add a new Boss event (Admin feature)
  async addBossEvent(
    data: Omit<BossEvent, 'id' | 'createdAt'>
  ): Promise<BossEvent> {
    const id = `boss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clampedPoints = Math.min(100, Math.max(1, Math.round(Number(data.points) || 1)));
    const newBoss: BossEvent = {
      ...data,
      points: clampedPoints,
      id,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    const current = getStoredLocalBosses();
    saveLocalBosses([newBoss, ...current]);

    // Save to Firestore
    try {
      await setDoc(doc(db, BOSS_EVENTS_COLLECTION, id), newBoss);
    } catch (e) {
      console.warn('Could not save boss to firestore, saved locally:', e);
    }

    return newBoss;
  },

  // Delete a Boss event
  async deleteBossEvent(id: string): Promise<void> {
    const current = getStoredLocalBosses().filter((b) => b.id !== id);
    saveLocalBosses(current);

    try {
      await deleteDoc(doc(db, BOSS_EVENTS_COLLECTION, id));
    } catch (e) {
      console.warn('Could not delete boss in firestore:', e);
    }
  },

  // Delete a specific Check-in
  async deleteCheckin(checkinId: string): Promise<void> {
    const current = getStoredLocalCheckins().filter((c) => c.id !== checkinId);
    saveLocalCheckins(current);

    try {
      await deleteDoc(doc(db, BOSS_CHECKINS_COLLECTION, checkinId));
    } catch (e) {
      console.warn('Could not delete checkin in firestore:', e);
    }
  },

  // Helper to determine the check-in window (manual or fallback)
  getCheckinWindowStatus(
    scheduledTime: string,
    checkinEndTime?: string,
    checkinStartTime?: string
  ) {
    const startMs = checkinStartTime
      ? new Date(checkinStartTime).getTime()
      : new Date(scheduledTime).getTime();

    // If manual end time is provided, use it; otherwise fallback to start + 1h
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

  // Visitor check-in confirmation
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

    // Check if user already confirmed for this boss
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

    // Save locally
    try {
      localStorage.removeItem(SEASON_RESET_KEY);
    } catch {}
    saveLocalCheckins([newCheckin, ...activeCheckins]);

    // Save to Firestore
    try {
      await setDoc(doc(db, BOSS_CHECKINS_COLLECTION, checkinId), newCheckin);
    } catch (e) {
      console.warn('Could not save checkin to firestore, saved locally:', e);
    }

    return { success: true, checkin: newCheckin };
  },

  // Calculate Rank de Pontos
  // "O pontos total de cada pessoa vai aparecer em uma nova aba com nome Rank de Pontos,
  // dentro dessa aba vai ter uma lista com o total de pontos e o nome de cada pessoa."
  // Calcular estritamente o ponto do boss para cada presença confirmada (deduplicando por boss)
  computeRank(checkins: BossCheckin[], bossEvents?: BossEvent[]): UserRankEntry[] {
    const userMap = new Map<string, UserRankEntry>();
    const bossMap = new Map<string, BossEvent>();
    if (bossEvents && bossEvents.length > 0) {
      bossEvents.forEach((b) => bossMap.set(b.id, b));
    }

    checkins.forEach((c) => {
      const key = c.userName.toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, {
          userName: c.userName, // keep user casing
          totalPoints: 0,
          totalCheckins: 0,
          checkins: [],
          lastCheckinAt: c.checkedInAt,
        });
      }

      const entry = userMap.get(key)!;
      // Garantir que cada boss seja computado apenas uma vez por jogador para não duplicar pontos
      const alreadyCheckedBoss = entry.checkins.some((existing) => existing.bossId === c.bossId);
      if (!alreadyCheckedBoss) {
        // Calcular estritamente o ponto do boss
        const officialBoss = bossMap.get(c.bossId);
        const bossPoint = officialBoss ? officialBoss.points : c.points;

        entry.totalPoints += bossPoint;
        entry.totalCheckins += 1;
        entry.checkins.push({
          ...c,
          points: bossPoint,
        });
        if (new Date(c.checkedInAt) > new Date(entry.lastCheckinAt)) {
          entry.lastCheckinAt = c.checkedInAt;
        }
      }
    });

    const rankList = Array.from(userMap.values());

    // Sort descending by points, tie-break by total checkins desc
    rankList.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.totalCheckins - a.totalCheckins;
    });

    return rankList;
  },

  // Reset season / rank (Admin only)
  async resetAllCheckins(): Promise<void> {
    try {
      localStorage.setItem(SEASON_RESET_KEY, 'true');
    } catch {}
    saveLocalCheckins([]);
    try {
      const snapshot = await getDocs(collection(db, BOSS_CHECKINS_COLLECTION));
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Could not clear checkins in firestore:', e);
    }
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
