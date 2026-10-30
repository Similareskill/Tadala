import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CACHE_FILE = path.join(__dirname, 'sync-cache.json');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '20mb' }));

// In-memory sync state
interface SyncState {
  items: any[];
  settings: any;
  history: any[];
  bossEvents: any[];
  checkins: any[];
  memberStatuses: any[];
  activityLogs: any[];
  version: number;
  lastUpdated: string;
}

let syncState: SyncState = {
  items: [],
  settings: {
    householdName: 'Tadala Fila',
    listName: 'Lista de Craft',
    currencySymbol: 'R$',
    soundFeedback: true,
    categories: ['Comum', 'Incomum', 'Raro', 'Epic', 'Lendario'],
  },
  history: [],
  bossEvents: [],
  checkins: [],
  memberStatuses: [],
  activityLogs: [],
  version: 1,
  lastUpdated: new Date().toISOString(),
};

// Load cached state if available
if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    syncState = { ...syncState, ...parsed };
    console.log('[Sync Server] Loaded cached state, version:', syncState.version);
  } catch (e) {
    console.warn('[Sync Server] Could not read cache file:', e);
  }
}

function persistState() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(syncState, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Sync Server] Could not persist cache:', e);
  }
}

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server for instantaneous sub-millisecond multi-device transmission
const wss = new WebSocketServer({ noServer: true });
const wsClients = new Map<WebSocket, { id: string; lastSeen: number }>();

// Connected SSE clients as secondary real-time transport
const sseClients: Set<{
  id: string;
  res: express.Response;
  lastSeen: number;
}> = new Set();

function getTotalConnectedDevices(): number {
  const uniqueDeviceIds = new Set<string>();
  for (const client of wsClients.values()) {
    uniqueDeviceIds.add(client.id);
  }
  for (const client of sseClients) {
    uniqueDeviceIds.add(client.id);
  }
  return Math.max(1, uniqueDeviceIds.size);
}

// Instantaneous broadcast to ALL connected devices (WebSocket + SSE) without limits or delays
function broadcastInstant(type: string, payload: any, sourceDevice?: string) {
  const totalDevices = getTotalConnectedDevices();
  const rawMsg = JSON.stringify({
    type,
    payload,
    version: syncState.version,
    connectedDevices: totalDevices,
    sourceDevice,
    timestamp: Date.now(),
  });

  // 1. Direct TCP WebSocket Frame (< 2ms transmission)
  for (const [ws, info] of wsClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(rawMsg);
      } catch (e) {
        console.warn('WS send error:', e);
      }
    }
  }

  // 2. Server-Sent Events stream (< 10ms transmission)
  const sseMessage = `data: ${rawMsg}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(sseMessage);
    } catch {
      sseClients.delete(client);
    }
  }
}

const GLOBAL_RELAY_TOPIC = 'tadala_fila_tadala_fila_guild';

function pushToGlobalRelay(payload: any, sourceDevice?: string, reason?: string) {
  fetch(`https://ntfy.sh/${GLOBAL_RELAY_TOPIC}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tags': 'sync_global', 'X-Title': 'Tadala Global Sync' },
    body: JSON.stringify({
      type: 'GLOBAL_SYNC_STATE',
      sourceDevice: sourceDevice || 'server-backend',
      reason,
      payload,
      version: syncState.version,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

// Connect server directly to the worldwide mesh relay
function startGlobalRelayBridge() {
  try {
    const relayWs = new WebSocket(`wss://ntfy.sh/${GLOBAL_RELAY_TOPIC}/ws`);
    relayWs.on('open', () => {
      console.log('[Server Global Relay] Connected to worldwide multi-network sync mesh');
    });
    relayWs.on('message', (raw) => {
      try {
        const rawStr = raw.toString().trim();
        if (!rawStr.startsWith('{') || !rawStr.endsWith('}')) return;
        const data = JSON.parse(rawStr);
        if (data.event === 'message' && typeof data.message === 'string') {
          const trimmed = data.message.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const msg = JSON.parse(trimmed);
              if (msg && typeof msg === 'object' && msg.type === 'GLOBAL_SYNC_STATE' && msg.payload && msg.sourceDevice !== 'server-backend') {
                applyPayload(msg.payload, msg.sourceDevice, 'global_mesh_sync', false);
              }
            } catch {
              // Ignore non-sync messages silently
            }
          }
        }
      } catch {
        // Ignore unparseable frames silently
      }
    });
    relayWs.on('close', () => {
      setTimeout(startGlobalRelayBridge, 3000);
    });
    relayWs.on('error', () => {});
  } catch {
    setTimeout(startGlobalRelayBridge, 5000);
  }
}

startGlobalRelayBridge();

// Apply partial sync payload to state and immediately broadcast
function applyPayload(payload: any, sourceDevice?: string, reason?: string, echoGlobal: boolean = true) {
  if (!payload || typeof payload !== 'object') return false;

  let hasChanges = false;

  if (Array.isArray(payload.items)) {
    syncState.items = payload.items;
    hasChanges = true;
  }
  if (payload.settings && typeof payload.settings === 'object') {
    syncState.settings = { ...syncState.settings, ...payload.settings };
    hasChanges = true;
  }
  if (Array.isArray(payload.history)) {
    syncState.history = payload.history;
    hasChanges = true;
  }
  if (Array.isArray(payload.bossEvents)) {
    syncState.bossEvents = payload.bossEvents;
    hasChanges = true;
  }
  if (Array.isArray(payload.checkins)) {
    syncState.checkins = payload.checkins;
    hasChanges = true;
  }
  if (Array.isArray(payload.memberStatuses)) {
    syncState.memberStatuses = payload.memberStatuses;
    hasChanges = true;
  }
  if (Array.isArray(payload.activityLogs)) {
    syncState.activityLogs = payload.activityLogs;
    hasChanges = true;
  }

  if (hasChanges) {
    syncState.version += 1;
    syncState.lastUpdated = new Date().toISOString();
    persistState();

    // Instant broadcast to local devices
    broadcastInstant('SYNC_UPDATE', payload, sourceDevice);

    // Instant broadcast to all devices across different networks and countries
    if (echoGlobal) {
      pushToGlobalRelay(payload, sourceDevice, reason);
    }
    return true;
  }

  return false;
}

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const deviceId = url.searchParams.get('device') || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  wsClients.set(ws, { id: deviceId, lastSeen: Date.now() });

  // Send instantaneous full-state sync upon connection
  ws.send(
    JSON.stringify({
      type: 'INIT',
      version: syncState.version,
      connectedDevices: getTotalConnectedDevices(),
      payload: syncState,
      timestamp: Date.now(),
    })
  );

  // Broadcast device joined to update counters across all screens
  broadcastInstant('DEVICE_COUNT', null);

  ws.on('message', (messageRaw: any) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      const client = wsClients.get(ws);
      if (client) client.lastSeen = Date.now();

      if (msg.type === 'UPDATE' && msg.payload) {
        applyPayload(msg.payload, msg.sourceDevice || deviceId, msg.reason);
      } else if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now(), version: syncState.version, connectedDevices: getTotalConnectedDevices() }));
      }
    } catch (e) {
      console.warn('[Sync WS] Error handling message:', e);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    broadcastInstant('DEVICE_COUNT', null);
  });

  ws.on('error', () => {
    wsClients.delete(ws);
  });
});

// Upgrade HTTP connection to WebSocket on /ws
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Periodic heartbeat to prevent mobile timeouts and stale connections
setInterval(() => {
  const now = Date.now();
  const total = getTotalConnectedDevices();

  // Ping WebSockets
  for (const [ws, info] of wsClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
      } catch {
        wsClients.delete(ws);
      }
    } else {
      wsClients.delete(ws);
    }
  }

  // Ping SSE Clients
  for (const client of sseClients) {
    if (now - client.lastSeen > 45000) {
      try {
        client.res.end();
      } catch {}
      sseClients.delete(client);
    } else {
      try {
        client.res.write(`data: ${JSON.stringify({ type: 'PING', connectedDevices: total, version: syncState.version, timestamp: now })}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }
}, 8000);

// API Endpoints
app.get('/api/sync', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    ...syncState,
    connectedDevices: getTotalConnectedDevices(),
  });
});

app.post('/api/sync', (req, res) => {
  const { sourceDevice, reason, payload } = req.body || {};
  applyPayload(payload, sourceDevice, reason);

  res.json({
    ok: true,
    version: syncState.version,
    connectedDevices: getTotalConnectedDevices(),
  });
});

app.get('/api/sync/events', (req, res) => {
  const deviceId = (req.query.device as string) || `sse-${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'none');
  res.flushHeaders?.();

  const client = { id: deviceId, res, lastSeen: Date.now() };
  sseClients.add(client);

  // Send initial handshake immediately
  res.write(
    `data: ${JSON.stringify({
      type: 'INIT',
      version: syncState.version,
      connectedDevices: getTotalConnectedDevices(),
      payload: syncState,
      timestamp: Date.now(),
    })}\n\n`
  );

  req.on('close', () => {
    sseClients.delete(client);
    broadcastInstant('DEVICE_COUNT', null);
  });
});

app.get('/api/sync/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    ok: true,
    version: syncState.version,
    connectedDevices: getTotalConnectedDevices(),
    timestamp: Date.now(),
  });
});

// Setup Vite or Static in Express
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sync Server] TADALA FILA Instant Real-Time Sync Server (WebSocket + SSE) active on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Sync Server] Failed to start:', err);
});
