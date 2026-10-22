import { ShoppingItem, AppSettings, ShoppingHistoryEntry, BossEvent, BossCheckin, MemberStatus, ActivityLogEntry } from '../types/shopping';

export interface FullSyncState {
  items: ShoppingItem[];
  settings: AppSettings;
  history: ShoppingHistoryEntry[];
  bossEvents: BossEvent[];
  checkins: BossCheckin[];
  memberStatuses: MemberStatus[];
  activityLogs: ActivityLogEntry[];
  version: number;
  lastUpdated: string;
  sourceDevice?: string;
}

export type SyncStatus = 'connected' | 'connecting' | 'syncing' | 'offline';

type StateListener = (state: Partial<FullSyncState>, source: string) => void;
type StatusListener = (status: SyncStatus, deviceCount: number) => void;

class DeviceSyncService {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = 'connecting';
  private connectedDevicesCount: number = 1;
  private lastVersion: number = 0;
  private pollInterval: number | null = null;
  private deviceId: string;
  private isPushing: boolean = false;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('tadala_guild_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE' && event.data.source !== this.deviceId) {
            this.notifyStateListeners(event.data.payload, 'local-tab');
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }

      this.initConnection();
    }
  }

  private getOrCreateDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'device-server';
    try {
      let id = localStorage.getItem('tadala_device_sync_id');
      if (!id) {
        id = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('tadala_device_sync_id', id);
      }
      return id;
    } catch {
      return `dev-${Date.now()}`;
    }
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public getConnectedDevicesCount(): number {
    return this.connectedDevicesCount;
  }

  private updateStatus(status: SyncStatus, count?: number) {
    this.currentStatus = status;
    if (count !== undefined) {
      this.connectedDevicesCount = count;
    }
    this.statusListeners.forEach((fn) => {
      try {
        fn(this.currentStatus, this.connectedDevicesCount);
      } catch {}
    });
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus, this.connectedDevicesCount);
    return () => this.statusListeners.delete(listener);
  }

  public subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyStateListeners(partialState: Partial<FullSyncState>, source: string) {
    this.stateListeners.forEach((fn) => {
      try {
        fn(partialState, source);
      } catch (e) {
        console.warn('Error in sync state listener:', e);
      }
    });
  }

  public async initConnection() {
    this.updateStatus('connecting');

    // 1. Initial full state fetch from server API
    await this.fetchServerState(true);

    // 2. Setup Server-Sent Events (SSE) for instantaneous multi-device updates
    this.setupSSE();

    // 3. Fallback health check & poll every 4 seconds to ensure zero missed updates
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = window.setInterval(() => {
      this.checkServerPing();
    }, 4000);
  }

  private setupSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
    }

    try {
      const sseUrl = `/api/sync/events?device=${encodeURIComponent(this.deviceId)}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.updateStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC_UPDATE') {
            if (data.sourceDevice !== this.deviceId) {
              if (data.version && data.version > this.lastVersion) {
                this.lastVersion = data.version;
                this.notifyStateListeners(data.payload, 'server-sse');
              }
            }
            if (data.connectedDevices) {
              this.connectedDevicesCount = data.connectedDevices;
              this.updateStatus('connected', data.connectedDevices);
            }
          } else if (data.type === 'PING') {
            if (data.connectedDevices) {
              this.connectedDevicesCount = data.connectedDevices;
              this.updateStatus('connected', data.connectedDevices);
            }
          }
        } catch (e) {
          console.warn('Error parsing SSE message:', e);
        }
      };

      this.eventSource.onerror = () => {
        // Fall back to polling mode gracefully
        this.updateStatus('connecting');
      };
    } catch (e) {
      console.warn('SSE connection initialization error, falling back to polling:', e);
    }
  }

  private async checkServerPing() {
    try {
      const res = await fetch(`/api/sync/ping?device=${encodeURIComponent(this.deviceId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.version && json.version > this.lastVersion) {
          // Newer data available on server, fetch it!
          await this.fetchServerState(false);
        }
        this.updateStatus('connected', json.connectedDevices || 1);
      } else {
        this.updateStatus('connecting');
      }
    } catch {
      this.updateStatus('offline');
    }
  }

  public async fetchServerState(isInitial: boolean = false): Promise<FullSyncState | null> {
    try {
      const res = await fetch(`/api/sync?device=${encodeURIComponent(this.deviceId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        this.updateStatus('offline');
        return null;
      }
      const data: FullSyncState = await res.json();
      if (data && typeof data.version === 'number') {
        this.lastVersion = data.version;
        this.notifyStateListeners(data, isInitial ? 'initial-load' : 'server-poll');
        this.updateStatus('connected');
        return data;
      }
      return null;
    } catch {
      this.updateStatus('offline');
      return null;
    }
  }

  public async pushStateUpdate(
    partial: Partial<FullSyncState>,
    reason: string = 'manual_update'
  ): Promise<boolean> {
    if (this.isPushing) {
      // allow parallel updates
    }
    this.isPushing = true;
    this.updateStatus('syncing');

    // 1. Instantly notify other local tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SYNC_STATE',
          source: this.deviceId,
          reason,
          payload: partial,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // 2. Post update to central server API for all mobile/desktop devices
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceDevice: this.deviceId,
          reason,
          payload: partial,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.version) {
          this.lastVersion = json.version;
        }
        this.updateStatus('connected', json.connectedDevices);
        this.isPushing = false;
        return true;
      }
    } catch (e) {
      console.warn('Could not push sync state to server:', e);
    }

    this.isPushing = false;
    this.updateStatus('connected');
    return false;
  }

  public async forceResyncAll(): Promise<{ success: boolean; message: string }> {
    this.updateStatus('syncing');
    try {
      const full = await this.fetchServerState(false);
      if (full) {
        this.updateStatus('connected');
        return {
          success: true,
          message: 'Todos os dispositivos sincronizados em tempo real com sucesso!',
        };
      }
    } catch {}
    return {
      success: false,
      message: 'Não foi possível restabelecer conexão no momento. Tentando novamente...',
    };
  }

  public destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
    }
  }
}

export const deviceSyncService = new DeviceSyncService();
