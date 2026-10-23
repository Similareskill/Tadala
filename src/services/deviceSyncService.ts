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
type StatusListener = (status: SyncStatus, deviceCount: number, latencyMs: number) => void;

class DeviceSyncService {
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = 'connecting';
  private connectedDevicesCount: number = 1;
  private latencyMs: number = 0;
  private lastVersion: number = 0;
  private deviceId: string;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private pingStartTime: number = 0;

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
        console.warn('BroadcastChannel error:', e);
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

  public getLatencyMs(): number {
    return this.latencyMs;
  }

  private updateStatus(status: SyncStatus, count?: number, latency?: number) {
    this.currentStatus = status;
    if (count !== undefined) {
      this.connectedDevicesCount = count;
    }
    if (latency !== undefined) {
      this.latencyMs = latency;
    }
    this.statusListeners.forEach((fn) => {
      try {
        fn(this.currentStatus, this.connectedDevicesCount, this.latencyMs);
      } catch {}
    });
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus, this.connectedDevicesCount, this.latencyMs);
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

  public initConnection() {
    this.connectWebSocket();

    // Start background ping to measure instant latency
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      this.measurePing();
    }, 5000);
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?device=${encodeURIComponent(this.deviceId)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.updateStatus('connected');
        this.measurePing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'PONG') {
            const rtt = Math.max(1, Date.now() - this.pingStartTime);
            this.latencyMs = rtt;
            this.updateStatus('connected', data.connectedDevices, rtt);
            return;
          }

          if (data.type === 'INIT' && data.payload) {
            this.lastVersion = data.version || 1;
            this.updateStatus('connected', data.connectedDevices);
            this.notifyStateListeners(data.payload, 'ws-init');
            return;
          }

          if (data.type === 'SYNC_UPDATE' && data.payload) {
            if (data.sourceDevice !== this.deviceId) {
              if (data.version) this.lastVersion = data.version;
              this.notifyStateListeners(data.payload, 'ws-instant');
            }
            if (data.connectedDevices) {
              this.updateStatus('connected', data.connectedDevices);
            }
            return;
          }

          if (data.type === 'DEVICE_COUNT' && data.connectedDevices) {
            this.updateStatus('connected', data.connectedDevices);
          }
        } catch (err) {
          console.warn('Error parsing WS frame:', err);
        }
      };

      this.ws.onclose = () => {
        // Fast reconnect in 800ms
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Fall back to SSE if WS fails
        this.setupSSEFallback();
      };
    } catch (e) {
      console.warn('WebSocket init error, falling back to SSE:', e);
      this.setupSSEFallback();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = window.setTimeout(() => {
      this.connectWebSocket();
    }, 800);
  }

  private setupSSEFallback() {
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
          if (data.type === 'SYNC_UPDATE' && data.payload && data.sourceDevice !== this.deviceId) {
            if (data.version) this.lastVersion = data.version;
            this.notifyStateListeners(data.payload, 'sse-fallback');
          }
          if (data.connectedDevices) {
            this.updateStatus('connected', data.connectedDevices);
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.updateStatus('connecting');
      };
    } catch {}
  }

  private measurePing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.pingStartTime = Date.now();
      try {
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: this.pingStartTime }));
      } catch {}
    } else {
      // Fallback HTTP ping
      const start = Date.now();
      fetch(`/api/sync/ping?device=${encodeURIComponent(this.deviceId)}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          const rtt = Math.max(1, Date.now() - start);
          this.updateStatus('connected', json.connectedDevices, rtt);
        })
        .catch(() => {
          this.updateStatus('offline');
        });
    }
  }

  /**
   * Instantly broadcasts updates to ALL connected devices without any artificial delay or ms limits.
   */
  public async pushStateUpdate(
    partial: Partial<FullSyncState>,
    reason: string = 'instant_sync'
  ): Promise<boolean> {
    // 1. Instant 0ms broadcast to all other open tabs on this machine
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

    // 2. Direct TCP WebSocket push to central server (< 2ms transmission)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'UPDATE',
            sourceDevice: this.deviceId,
            reason,
            payload: partial,
            timestamp: Date.now(),
          })
        );
        return true;
      } catch (err) {
        console.warn('Failed WS push, falling back to HTTP:', err);
      }
    }

    // 3. Fallback immediate HTTP POST if WS was reconnecting
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDevice: this.deviceId,
          reason,
          payload: partial,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.version) this.lastVersion = json.version;
        this.updateStatus('connected', json.connectedDevices);
        return true;
      }
    } catch (e) {
      console.warn('Failed HTTP push:', e);
    }

    return false;
  }

  public async forceResyncAll(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    this.updateStatus('syncing');
    const start = Date.now();
    try {
      const res = await fetch(`/api/sync?device=${encodeURIComponent(this.deviceId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data: FullSyncState = await res.json();
        const rtt = Math.max(1, Date.now() - start);
        this.latencyMs = rtt;
        this.notifyStateListeners(data, 'manual_force_sync');
        this.updateStatus('connected', data.version ? undefined : 1, rtt);
        return {
          success: true,
          message: `Sincronizado instantaneamente! (${rtt}ms de latência)`,
          latencyMs: rtt,
        };
      }
    } catch {}

    return {
      success: false,
      message: 'Não foi possível restabelecer conexão no momento.',
      latencyMs: 0,
    };
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
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
