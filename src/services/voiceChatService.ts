import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  url: string; // Base64 data URL or external URL
  size: number;
  duration?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: 'admin' | 'member';
  text?: string;
  attachments?: ChatAttachment[];
  createdAt: string;
}

export interface VoiceParticipant {
  id: string;
  name: string;
  role?: 'admin' | 'member';
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  lastPing: number;
}

export interface WebRTCSignal {
  id: string;
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'candidate';
  data: string; // JSON stringified data
  createdAt: number;
}

export interface VoiceRoom {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'general' | 'boss' | 'pvp' | 'lounge';
}

export const PRESET_VOICE_ROOMS: VoiceRoom[] = [
  {
    id: 'geral-craft',
    name: 'Geral & Crafting',
    icon: '🎙️',
    description: 'Canal principal para coordenação de craft, itens e tarefas diárias.',
    category: 'general',
  },
  {
    id: 'boss-calls',
    name: 'Boss Calls & Raids',
    icon: '⚔️',
    description: 'Comunicação tática em tempo real durante chefes de mundo e drops.',
    category: 'boss',
  },
  {
    id: 'pvp-guerras',
    name: 'PvP & Guerras',
    icon: '🛡️',
    description: 'Coordenação de combate acelerado, defesa de território e cerco.',
    category: 'pvp',
  },
  {
    id: 'resenha-lounge',
    name: 'Resenha & Música',
    icon: '🎵',
    description: 'Bate-papo livre para descontrair e ouvir música com os membros.',
    category: 'lounge',
  },
];

const CHAT_COLLECTION = 'voice_chat_messages';
const ROOMS_COLLECTION = 'voice_rooms';
const STORAGE_MESSAGES_KEY = 'shopping_voice_chat_messages_v2';

// Standard Google Public STUN servers for WebRTC P2P mesh
export const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

// Web Audio sound effects synthesizer
class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playJoin() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      osc2.frequency.setValueAtTime(554.37, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch {}
  }

  playLeave() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playMute(muted: boolean) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (muted) {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(400, now + 0.06);
      } else {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(700, now + 0.06);
      }

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  playMessagePop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }
}

export const soundEffects = new SoundEffects();

export const voiceChatService = {
  // Subscribe to real-time chat messages
  subscribeMessages(
    roomId: string,
    onUpdate: (messages: ChatMessage[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    // Load local cache immediately
    try {
      const cached = localStorage.getItem(`${STORAGE_MESSAGES_KEY}_${roomId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as ChatMessage[];
        if (Array.isArray(parsed)) {
          onUpdate(parsed);
        }
      }
    } catch {}

    const colRef = collection(db, CHAT_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'asc'), limit(250));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as ChatMessage;
          if (item.roomId === roomId) {
            list.push({ ...item, id: d.id });
          }
        });

        // Save local cache
        try {
          localStorage.setItem(`${STORAGE_MESSAGES_KEY}_${roomId}`, JSON.stringify(list));
        } catch {}

        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore chat messages subscription warning:', err);
        if (onError) onError(err);
      }
    );
  },

  // Send a chat message with optional attachments
  async sendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullMessage: ChatMessage = {
      ...message,
      id,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local update
    try {
      const cacheKey = `${STORAGE_MESSAGES_KEY}_${message.roomId}`;
      const existing: ChatMessage[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      existing.push(fullMessage);
      localStorage.setItem(cacheKey, JSON.stringify(existing.slice(-250)));
    } catch {}

    soundEffects.playMessagePop();

    // Persist to Firestore
    try {
      const docRef = doc(db, CHAT_COLLECTION, id);
      await setDoc(docRef, fullMessage);
    } catch (e) {
      console.warn('Could not sync chat message to Firestore (stored locally):', e);
    }

    return fullMessage;
  },

  // Delete message
  async deleteMessage(messageId: string, roomId: string): Promise<void> {
    try {
      const cacheKey = `${STORAGE_MESSAGES_KEY}_${roomId}`;
      const existing: ChatMessage[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const filtered = existing.filter((m) => m.id !== messageId);
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch {}

    try {
      await deleteDoc(doc(db, CHAT_COLLECTION, messageId));
    } catch (e) {
      console.warn('Could not delete message from Firestore:', e);
    }
  },

  // Clear all messages in room (Admin only)
  async clearRoomMessages(roomId: string, messageIds: string[]): Promise<void> {
    try {
      localStorage.removeItem(`${STORAGE_MESSAGES_KEY}_${roomId}`);
    } catch {}

    const deletePromises = messageIds.map((id) =>
      deleteDoc(doc(db, CHAT_COLLECTION, id)).catch(() => {})
    );
    await Promise.allSettled(deletePromises);
  },

  // Subscribe to active voice participants in a room using ISOLATED DOCUMENTS
  // This guarantees multiple devices NEVER overwrite or kick each other out!
  subscribeRoomParticipants(
    roomId: string,
    onUpdate: (participants: VoiceParticipant[]) => void
  ): Unsubscribe {
    const participantsColRef = collection(db, ROOMS_COLLECTION, roomId, 'participants');

    return onSnapshot(
      participantsColRef,
      (snapshot) => {
        const now = Date.now();
        const list: VoiceParticipant[] = [];

        snapshot.forEach((d) => {
          const p = d.data() as VoiceParticipant;
          // Keep active participants if last ping was within the last 45 seconds
          if (now - (p.lastPing || 0) < 45000) {
            list.push({ ...p, id: d.id });
          } else {
            // Asynchronously remove stale participant if disconnected unexpectedly
            deleteDoc(d.ref).catch(() => {});
          }
        });

        // Stable sort by joined timestamp
        list.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Voice room participants subscription warning:', err);
      }
    );
  },

  // Join voice room: creates an isolated document for this device session
  async joinVoiceRoom(roomId: string, participant: VoiceParticipant): Promise<void> {
    soundEffects.playJoin();
    try {
      const participantDocRef = doc(db, ROOMS_COLLECTION, roomId, 'participants', participant.id);
      await setDoc(participantDocRef, {
        ...participant,
        lastPing: Date.now(),
      });
    } catch (e) {
      console.warn('Could not sync join voice room to Firestore:', e);
    }
  },

  // Leave voice room: deletes only this device's document
  async leaveVoiceRoom(roomId: string, participantId: string): Promise<void> {
    soundEffects.playLeave();
    try {
      const participantDocRef = doc(db, ROOMS_COLLECTION, roomId, 'participants', participantId);
      await deleteDoc(participantDocRef);
    } catch (e) {
      console.warn('Could not sync leave voice room to Firestore:', e);
    }
  },

  // Heartbeat ping & state update (mute, deafen, speaking) for THIS device only
  async updateVoiceState(
    roomId: string,
    participantId: string,
    updates: Partial<VoiceParticipant>
  ): Promise<void> {
    try {
      const participantDocRef = doc(db, ROOMS_COLLECTION, roomId, 'participants', participantId);
      await setDoc(
        participantDocRef,
        {
          ...updates,
          lastPing: Date.now(),
        },
        { merge: true }
      );
    } catch {}
  },

  // WebRTC P2P Signaling: Send an offer, answer or ICE candidate to a specific device
  async sendSignal(
    roomId: string,
    signal: Omit<WebRTCSignal, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const signalDocRef = doc(db, ROOMS_COLLECTION, roomId, 'signals', signalId);
      await setDoc(signalDocRef, {
        ...signal,
        id: signalId,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn('Could not send WebRTC signal:', e);
    }
  },

  // WebRTC P2P Signaling: Listen for incoming signals targeted to this device session
  subscribeSignals(
    roomId: string,
    myParticipantId: string,
    onSignal: (signal: WebRTCSignal) => void
  ): Unsubscribe {
    const signalsColRef = collection(db, ROOMS_COLLECTION, roomId, 'signals');
    const processedSignals = new Set<string>();

    return onSnapshot(
      signalsColRef,
      (snapshot) => {
        const now = Date.now();
        snapshot.forEach((d) => {
          const sig = d.data() as WebRTCSignal;
          const sigId = sig.id || d.id;

          // Only process signals directed to ME created recently (< 45 seconds)
          if (sig.to === myParticipantId && now - (sig.createdAt || 0) < 45000) {
            if (!processedSignals.has(sigId)) {
              processedSignals.add(sigId);
              // Limit set size to avoid memory growth
              if (processedSignals.size > 500) {
                const oldest = Array.from(processedSignals).slice(0, 200);
                oldest.forEach((id) => processedSignals.delete(id));
              }

              onSignal({ ...sig, id: sigId });
            }

            // Clean up processed signal from Firestore
            deleteDoc(d.ref).catch(() => {});
          } else if (now - (sig.createdAt || 0) >= 45000) {
            // Delete expired signals
            deleteDoc(d.ref).catch(() => {});
          }
        });
      },
      (err) => {
        console.warn('WebRTC signals subscription warning:', err);
      }
    );
  },
};
