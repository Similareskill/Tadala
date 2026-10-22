import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CACHE_FILE = path.join(__dirname, 'sync-cache.json');

app.use(express.json({ limit: '15mb' }));

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

// Connected SSE clients for real-time pushing
const sseClients: Set<{
  id: string;
  res: express.Response;
  lastSeen: number;
}> = new Set();

function broadcastSSE(type: string, payload: any, sourceDevice?: string) {
  const message = `data: ${JSON.stringify({
    type,
    payload,
    version: syncState.version,
    connectedDevices: sseClients.size,
    sourceDevice,
    timestamp: Date.now(),
  })}\n\n`;

  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat to keep SSE connections open and remove stale clients
setInterval(() => {
  const now = Date.now();
  for (const client of sseClients) {
    if (now - client.lastSeen > 60000) {
      try {
        client.res.end();
      } catch {}
      sseClients.delete(client);
    } else {
      try {
        client.res.write(`data: ${JSON.stringify({ type: 'PING', connectedDevices: sseClients.size, version: syncState.version })}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }
}, 15000);

// API Routes
app.get('/api/sync', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    ...syncState,
    connectedDevices: Math.max(1, sseClients.size),
  });
});

app.post('/api/sync', (req, res) => {
  const { sourceDevice, reason, payload } = req.body || {};

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      syncState.items = payload.items;
    }
    if (payload.settings && typeof payload.settings === 'object') {
      syncState.settings = { ...syncState.settings, ...payload.settings };
    }
    if (Array.isArray(payload.history)) {
      syncState.history = payload.history;
    }
    if (Array.isArray(payload.bossEvents) && payload.bossEvents.length > 0) {
      syncState.bossEvents = payload.bossEvents;
    }
    if (Array.isArray(payload.checkins)) {
      syncState.checkins = payload.checkins;
    }
    if (Array.isArray(payload.memberStatuses) && payload.memberStatuses.length > 0) {
      syncState.memberStatuses = payload.memberStatuses;
    }
    if (Array.isArray(payload.activityLogs)) {
      syncState.activityLogs = payload.activityLogs;
    }

    syncState.version += 1;
    syncState.lastUpdated = new Date().toISOString();
    persistState();

    // Instantly notify all other connected devices
    broadcastSSE('SYNC_UPDATE', payload, sourceDevice);
  }

  res.json({
    ok: true,
    version: syncState.version,
    connectedDevices: Math.max(1, sseClients.size),
  });
});

app.get('/api/sync/events', (req, res) => {
  const deviceId = (req.query.device as string) || `device-${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client = { id: deviceId, res, lastSeen: Date.now() };
  sseClients.add(client);

  // Send initial handshake
  res.write(
    `data: ${JSON.stringify({
      type: 'INIT',
      version: syncState.version,
      connectedDevices: sseClients.size,
      payload: syncState,
    })}\n\n`
  );

  req.on('close', () => {
    sseClients.delete(client);
  });
});

app.get('/api/sync/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    ok: true,
    version: syncState.version,
    connectedDevices: Math.max(1, sseClients.size),
    timestamp: Date.now(),
  });
});

// Setup Vite or Static in Express
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sync Server] TADALA FILA Multi-Device Sync Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Sync Server] Failed to start:', err);
});
