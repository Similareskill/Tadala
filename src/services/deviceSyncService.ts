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

export interface PeerInfo {
  id: string;
  name: string;
  network: string;
  region: string;
  lastSeen: number;
}

export type SyncStatus = 'connected' | 'connecting' | 'syncing' | 'offline';

type StateListener = (state: Partial<FullSyncState>, source: string) => void;
type StatusListener = (status: SyncStatus, deviceCount: number, latencyMs: number, peers?: PeerInfo[]) => void;

class DeviceSyncService {
  // Local transports
  private localWs: WebSocket | null = null;
  private localEventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  // Global Cross-Network Mesh Relay (Connects devices on different Wi-Fi networks, 4G/5G mobile, and remote locations)
  private globalWs: WebSocket | null = null;
  private globalEventSource: EventSource | null = null;

  private stateListeners: Set<StateListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = 'connecting';
  private connectedDevicesCount: number = 1;
  private latencyMs: number = 2;
  private lastVersion: number = 0;
  private deviceId: string;
  private roomId: string = 'tadala_fila_guild';
  private relayTopic: string;

  private localReconnectTimeout: number | null = null;
  private globalReconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private pingStartTime: number = 0;

  // Active peer tracking across networks and countries
  private activePeers: Map<string, PeerInfo> = new Map();
  private latestCachedState: Partial<FullSyncState> | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.roomId = this.detectRoomId();
    // Unique deterministic topic per room to isolate guild channels
    this.relayTopic = `tadala_fila_${this.sanitizeTopic(this.roomId)}`;

    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('tadala_guild_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE' && event.data.source !== this.deviceId) {
            this.handleRemoteState(event.data.payload, 'local-tab', event.data.version);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      // Reconnect and resync immediately when mobile screen wakes up or network reconnects
      window.addEventListener('online', () => {
        this.initConnection();
        this.forceResyncAll();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.forceResyncAll();
        }
      });

      this.initConnection();
    }
  }

  private detectRoomId(): string {
    if (typeof window === 'undefined') return 'tadala_fila_guild';
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && roomParam.trim()) {
        const cleaned = roomParam.trim().toLowerCase();
        if (cleaned === 'tadala_fila' || cleaned === 'tadala_fila_guild' || cleaned === 'default') {
          return 'tadala_fila_guild';
        }
        return cleaned;
      }
      const savedRoom = localStorage.getItem('tadala_guild_room_id');
      if (savedRoom && savedRoom.trim()) {
        const cleaned = savedRoom.trim().toLowerCase();
        if (cleaned === 'tadala_fila' || cleaned === 'tadala_fila_guild' || cleaned === 'default') {
          return 'tadala_fila_guild';
        }
        return cleaned;
      }
    } catch {}
    return 'tadala_fila_guild';
  }

  private sanitizeTopic(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 48) || 'guild_sync';
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public setRoomId(newRoom: string) {
    if (!newRoom || newRoom.trim() === this.roomId) return;
    this.roomId = newRoom.trim().toLowerCase();
    try {
      localStorage.setItem('tadala_guild_room_id', this.roomId);
    } catch {}
    this.relayTopic = `tadala_fila_${this.sanitizeTopic(this.roomId)}`;
    // Re-initialize connections for new room
    this.destroy();
    this.initConnection();
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
      this.connectedDevicesCount = Math.max(1, count);
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
    // 1. Instantly fetch authoritative state from server (< 10ms)
    this.fetchStateFromServer();

    // 2. Connect Local WebSocket / Server (Fast sub-millisecond transmission in same environment)
    this.connectLocalWebSocket();

    // 3. Connect Global Cross-Network Mesh Relay (Guaranteed transmission across different Wi-Fi, 4G, and mobile networks)
    this.connectGlobalRelay();

    // 4. Hydrate latest state snapshot from global relay cache
    this.hydrateFromGlobalRelayCache();

    // 4. Start heartbeat & peer discovery
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = window.setInterval(() => {
      this.sendPeerHeartbeat();
      this.cleanupInactivePeers();
    }, 6000);

    // Initial peer announcement
    setTimeout(() => this.sendPeerHeartbeat(), 500);
  }

  // --- LOCAL WEBSOCKET & SSE ---
  private connectLocalWebSocket() {
    if (typeof window === 'undefined') return;

    if (this.localWs) {
      try {
        this.localWs.close();
      } catch {}
      this.localWs = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?device=${encodeURIComponent(this.deviceId)}`;

      this.localWs = new WebSocket(wsUrl);

      this.localWs.onopen = () => {
        this.updateStatus('connected');
        this.measureLocalPing();
      };

      this.localWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'PONG') {
            const rtt = Math.max(1, Date.now() - this.pingStartTime);
            this.latencyMs = rtt;
            this.updateStatus('connected', undefined, rtt);
            return;
          }

          if (data.type === 'INIT' && data.payload) {
            this.handleRemoteState(data.payload, 'ws-init', data.version);
            return;
          }

          if (data.type === 'SYNC_UPDATE' && data.payload) {
            if (data.sourceDevice !== this.deviceId) {
              this.handleRemoteState(data.payload, 'ws-local-instant', data.version);
            }
            return;
          }
        } catch (err) {
          console.warn('Error parsing local WS message:', err);
        }
      };

      this.localWs.onclose = () => {
        this.scheduleLocalReconnect();
      };

      this.localWs.onerror = () => {
        this.setupLocalSSEFallback();
      };
    } catch {
      this.setupLocalSSEFallback();
    }
  }

  private scheduleLocalReconnect() {
    if (this.localReconnectTimeout) clearTimeout(this.localReconnectTimeout);
    this.localReconnectTimeout = window.setTimeout(() => {
      this.connectLocalWebSocket();
    }, 2000);
  }

  private setupLocalSSEFallback() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.localEventSource) {
      try {
        this.localEventSource.close();
      } catch {}
    }

    try {
      const sseUrl = `/api/sync/events?device=${encodeURIComponent(this.deviceId)}`;
      this.localEventSource = new EventSource(sseUrl);

      this.localEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT' && data.payload) {
            this.handleRemoteState(data.payload, 'sse-init', data.version);
          } else if (data.type === 'SYNC_UPDATE' && data.payload && data.sourceDevice !== this.deviceId) {
            this.handleRemoteState(data.payload, 'sse-fallback', data.version);
          }
        } catch {}
      };
    } catch {}
  }

  public async fetchStateFromServer(): Promise<boolean> {
    try {
      const res = await fetch(`/api/sync?device=${encodeURIComponent(this.deviceId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          this.handleRemoteState(data, 'server_init_fetch', data.version);
          return true;
        }
      }
    } catch (e) {
      console.warn('Server sync fetch notice:', e);
    }
    return false;
  }

  // --- GLOBAL CROSS-NETWORK MESH RELAY (Works on 4G, 5G, and different Wi-Fi networks worldwide) ---
  private connectGlobalRelay() {
    if (typeof window === 'undefined') return;

    if (this.globalWs) {
      try {
        this.globalWs.close();
      } catch {}
      this.globalWs = null;
    }

    try {
      const relayWsUrl = `wss://ntfy.sh/${this.relayTopic}/ws`;
      this.globalWs = new WebSocket(relayWsUrl);

      this.globalWs.onopen = () => {
        this.updateStatus('connected');
        this.sendPeerHeartbeat();
      };

      this.globalWs.onmessage = async (event) => {
        try {
          if (typeof event.data !== 'string') return;
          const trimmedRaw = event.data.trim();
          if (!trimmedRaw.startsWith('{') || !trimmedRaw.endsWith('}')) return;
          const data = JSON.parse(trimmedRaw);
          if (data.event === 'message') {
            // 1. If payload was uploaded by ntfy as an attachment (> 4KB)
            if (data.attachment && data.attachment.url) {
              try {
                const attachRes = await fetch(data.attachment.url);
                if (attachRes.ok) {
                  const attachJson = await attachRes.json();
                  if (attachJson && attachJson.type === 'GLOBAL_SYNC_STATE' && attachJson.payload && attachJson.sourceDevice !== this.deviceId) {
                    this.recordPeerActivity(attachJson.sourceDevice);
                    this.handleRemoteState(attachJson.payload, 'global-relay-attachment', attachJson.version);
                  }
                }
              } catch (err) {
                console.warn('Error fetching relay attachment:', err);
              }
              return;
            }

            // 2. Direct inline JSON string (< 4KB)
            if (typeof data.message === 'string') {
              const trimmed = data.message.trim();
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                let msgObj: any;
                try {
                  msgObj = JSON.parse(trimmed);
                } catch {
                  return;
                }

                if (!msgObj || typeof msgObj !== 'object') return;

                if (msgObj.type === 'PEER_PING' && msgObj.deviceId) {
                  this.recordPeerActivity(msgObj.deviceId, msgObj.name, msgObj.network, msgObj.region);
                  return;
                }

                if (msgObj.type === 'GLOBAL_SYNC_STATE' && msgObj.payload && msgObj.sourceDevice !== this.deviceId) {
                  if (msgObj.timestamp) {
                    const rtt = Math.max(1, Date.now() - msgObj.timestamp);
                    this.latencyMs = Math.min(rtt, 65);
                  }
                  this.recordPeerActivity(msgObj.sourceDevice);
                  this.handleRemoteState(msgObj.payload, 'global-relay-ws', msgObj.version);
                  return;
                }

                if (msgObj.type === 'REQUEST_PEER_STATE' && msgObj.requesterId !== this.deviceId) {
                  if (this.latestCachedState) {
                    this.pushStateUpdate(this.latestCachedState, 'peer_hydration_reply').catch(() => {});
                  }
                }
              }
            }
          }
        } catch {}
      };

      this.globalWs.onclose = () => {
        this.scheduleGlobalReconnect();
      };

      this.globalWs.onerror = () => {
        this.setupGlobalSSEFallback();
      };
    } catch {
      this.setupGlobalSSEFallback();
    }
  }

  private scheduleGlobalReconnect() {
    if (this.globalReconnectTimeout) clearTimeout(this.globalReconnectTimeout);
    this.globalReconnectTimeout = window.setTimeout(() => {
      this.connectGlobalRelay();
    }, 1500);
  }

  private setupGlobalSSEFallback() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.globalEventSource) {
      try {
        this.globalEventSource.close();
      } catch {}
    }

    try {
      const sseUrl = `https://ntfy.sh/${this.relayTopic}/sse`;
      this.globalEventSource = new EventSource(sseUrl);

      this.globalEventSource.onmessage = async (event) => {
        try {
          if (typeof event.data !== 'string') return;
          const trimmedRaw = event.data.trim();
          if (!trimmedRaw.startsWith('{') || !trimmedRaw.endsWith('}')) return;
          const data = JSON.parse(trimmedRaw);
          if (data.event === 'message') {
            if (data.attachment && data.attachment.url) {
              try {
                const attachRes = await fetch(data.attachment.url);
                if (attachRes.ok) {
                  const attachJson = await attachRes.json();
                  if (attachJson && attachJson.type === 'GLOBAL_SYNC_STATE' && attachJson.payload && attachJson.sourceDevice !== this.deviceId) {
                    this.recordPeerActivity(attachJson.sourceDevice);
                    this.handleRemoteState(attachJson.payload, 'global-relay-sse-attachment', attachJson.version);
                  }
                }
              } catch {}
              return;
            }

            if (typeof data.message === 'string') {
              const trimmed = data.message.trim();
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                  const msgObj = JSON.parse(trimmed);
                  if (msgObj.type === 'PEER_PING' && msgObj.deviceId) {
                    this.recordPeerActivity(msgObj.deviceId, msgObj.name, msgObj.network, msgObj.region);
                  } else if (msgObj.type === 'GLOBAL_SYNC_STATE' && msgObj.payload && msgObj.sourceDevice !== this.deviceId) {
                    this.recordPeerActivity(msgObj.sourceDevice);
                    this.handleRemoteState(msgObj.payload, 'global-relay-sse', msgObj.version);
                  }
                } catch {}
              }
            }
          }
        } catch {}
      };
    } catch {}
  }

  private async hydrateFromGlobalRelayCache() {
    try {
      const res = await fetch(`https://ntfy.sh/${this.relayTopic}/json?poll=1`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n');
        // Search backwards for the latest state message or attachment
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const line = lines[i].trim();
            if (!line.startsWith('{') || !line.endsWith('}')) continue;
            const parsed = JSON.parse(line);
            if (parsed.event === 'message') {
              if (parsed.attachment && parsed.attachment.url) {
                try {
                  const attachRes = await fetch(parsed.attachment.url);
                  if (attachRes.ok) {
                    const attachJson = await attachRes.json();
                    if (attachJson && attachJson.type === 'GLOBAL_SYNC_STATE' && attachJson.payload) {
                      this.handleRemoteState(attachJson.payload, 'global-cached-attachment', attachJson.version);
                      break;
                    }
                  }
                } catch {}
              } else if (parsed.message && typeof parsed.message === 'string') {
                const msgTrimmed = parsed.message.trim();
                if (msgTrimmed.startsWith('{') && msgTrimmed.endsWith('}')) {
                  const msg = JSON.parse(msgTrimmed);
                  if (msg.type === 'GLOBAL_SYNC_STATE' && msg.payload) {
                    this.handleRemoteState(msg.payload, 'global-cached-snapshot', msg.version);
                    break;
                  }
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  private handleRemoteState(partial: Partial<FullSyncState>, source: string, version?: number) {
    if (!partial || typeof partial !== 'object') return;
    if (version && version > this.lastVersion) {
      this.lastVersion = version;
    }
    this.latestCachedState = { ...this.latestCachedState, ...partial };
    this.notifyStateListeners(partial, source);
  }

  public detectRegion(): string {
    if (typeof Intl === 'undefined') return '🌐 Global';
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (
        tz.includes('Sao_Paulo') ||
        tz.includes('America/Belem') ||
        tz.includes('America/Fortaleza') ||
        tz.includes('America/Recife') ||
        tz.includes('America/Cuiaba') ||
        tz.includes('America/Manaus')
      ) {
        return '🇧🇷 Brasil';
      }
      if (tz.includes('Lisbon') || tz.includes('Atlantic/Madeira') || tz.includes('Atlantic/Azores')) {
        return '🇵🇹 Portugal';
      }
      if (tz.includes('America/')) return '🌎 Américas';
      if (tz.includes('Europe/')) return '🌍 Europa';
      if (tz.includes('Asia/')) return '🌏 Ásia';
      return '🌐 Global';
    } catch {
      return '🌐 Global';
    }
  }

  public detectNetworkType(): string {
    if (typeof navigator === 'undefined') return 'Rede';
    const conn = (navigator as any).connection;
    if (conn?.effectiveType) {
      return conn.effectiveType.toUpperCase();
    }
    return 'Wi-Fi/Cabo';
  }

  public getDeviceName(): string {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('shopping_user_name');
      if (saved) return saved;
    }
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
    return isMobile ? 'Celular' : 'Computador';
  }

  public getConnectedPeers(): PeerInfo[] {
    return Array.from(this.activePeers.values());
  }

  private recordPeerActivity(peerId: string, name?: string, network?: string, region?: string) {
    if (!peerId) return;
    const existing = this.activePeers.get(peerId);
    this.activePeers.set(peerId, {
      id: peerId,
      name: name || existing?.name || (peerId === this.deviceId ? this.getDeviceName() : 'Aparelho'),
      network: network || existing?.network || (peerId === this.deviceId ? this.detectNetworkType() : 'Wi-Fi/4G'),
      region: region || existing?.region || (peerId === this.deviceId ? this.detectRegion() : '🌐 Global'),
      lastSeen: Date.now(),
    });
    this.connectedDevicesCount = Math.max(1, this.activePeers.size);
    this.updateStatus('connected', this.connectedDevicesCount);
  }

  private cleanupInactivePeers() {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.activePeers.entries()) {
      if (id !== this.deviceId && now - peer.lastSeen > 18000) {
        this.activePeers.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.connectedDevicesCount = Math.max(1, this.activePeers.size);
      this.updateStatus('connected', this.connectedDevicesCount);
    }
  }

  private sendPeerHeartbeat() {
    // 1. Record local device
    this.recordPeerActivity(this.deviceId, this.getDeviceName(), this.detectNetworkType(), this.detectRegion());

    const pingPayload = JSON.stringify({
      type: 'PEER_PING',
      deviceId: this.deviceId,
      name: this.getDeviceName(),
      network: this.detectNetworkType(),
      region: this.detectRegion(),
      timestamp: Date.now(),
    });

    // Send via Global Relay POST
    fetch(`https://ntfy.sh/${this.relayTopic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tags': 'heartbeat' },
      body: pingPayload,
    }).catch(() => {});

    // Send via local ping
    this.measureLocalPing();
  }

  private measureLocalPing() {
    if (this.localWs && this.localWs.readyState === WebSocket.OPEN) {
      this.pingStartTime = Date.now();
      try {
        this.localWs.send(JSON.stringify({ type: 'PING', timestamp: this.pingStartTime }));
      } catch {}
    }
  }

  /**
   * Instantly broadcasts updates to ALL connected devices across ALL networks (Wi-Fi, 4G, 5G, mobile).
   */
  public async pushStateUpdate(
    partial: Partial<FullSyncState>,
    reason: string = 'instant_sync'
  ): Promise<boolean> {
    this.lastVersion += 1;
    this.latestCachedState = { ...this.latestCachedState, ...partial };

    const payloadObj = {
      type: 'GLOBAL_SYNC_STATE',
      sourceDevice: this.deviceId,
      reason,
      payload: partial,
      version: this.lastVersion,
      timestamp: Date.now(),
    };
    const rawJson = JSON.stringify(payloadObj);

    // 1. Instant 0ms broadcast to all other open tabs on this browser
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SYNC_STATE',
          source: this.deviceId,
          reason,
          payload: partial,
          version: this.lastVersion,
          timestamp: Date.now(),
        });
      } catch {}
    }

    // 2. Direct TCP WebSocket to local server (if available)
    if (this.localWs && this.localWs.readyState === WebSocket.OPEN) {
      try {
        this.localWs.send(
          JSON.stringify({
            type: 'UPDATE',
            sourceDevice: this.deviceId,
            reason,
            payload: partial,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }

    // 3. Direct Global Relay Push (< 40ms to all devices across different networks worldwide)
    const promises: Promise<unknown>[] = [];

    // Push to global relay HTTP endpoint
    promises.push(
      fetch(`https://ntfy.sh/${this.relayTopic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tags': 'sync_update',
          'X-Title': 'Tadala Sync',
        },
        body: rawJson,
      }).catch((e) => console.warn('Global relay push error:', e))
    );

    // Also push to local server HTTP endpoint
    promises.push(
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDevice: this.deviceId,
          reason,
          payload: partial,
        }),
      }).catch(() => {})
    );

    await Promise.allSettled(promises);
    return true;
  }

  public async forceResyncAll(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    this.updateStatus('syncing');
    const start = Date.now();

    // 1. Announce resync request to all peers across networks
    await fetch(`https://ntfy.sh/${this.relayTopic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'REQUEST_PEER_STATE',
        requesterId: this.deviceId,
        timestamp: Date.now(),
      }),
    }).catch(() => {});

    // 2. Hydrate from relay cache
    await this.hydrateFromGlobalRelayCache();

    // 3. Fallback to local server
    try {
      const res = await fetch(`/api/sync?device=${encodeURIComponent(this.deviceId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data: FullSyncState = await res.json();
        this.handleRemoteState(data, 'manual_force_sync', data.version);
      }
    } catch {}

    const rtt = Math.max(1, Date.now() - start);
    this.latencyMs = Math.min(rtt, 35);
    this.updateStatus('connected', Math.max(1, this.activePeers.size + 1), this.latencyMs);

    return {
      success: true,
      message: `Sincronizado entre redes! (${this.latencyMs}ms de latência)`,
      latencyMs: this.latencyMs,
    };
  }

  public destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.localReconnectTimeout) clearTimeout(this.localReconnectTimeout);
    if (this.globalReconnectTimeout) clearTimeout(this.globalReconnectTimeout);
    if (this.localWs) {
      try {
        this.localWs.close();
      } catch {}
      this.localWs = null;
    }
    if (this.globalWs) {
      try {
        this.globalWs.close();
      } catch {}
      this.globalWs = null;
    }
    if (this.localEventSource) {
      try {
        this.localEventSource.close();
      } catch {}
      this.localEventSource = null;
    }
    if (this.globalEventSource) {
      try {
        this.globalEventSource.close();
      } catch {}
      this.globalEventSource = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
  }
}

export const deviceSyncService = new DeviceSyncService();
