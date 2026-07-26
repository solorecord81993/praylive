import http from 'node:http';
import { chooseRandomSeat, MAX_CHARACTERS, styleFromId } from '../shared/constants.js';
import { defaultState } from '../shared/roomState.js';
import { SupabasePublisher } from './supabasePublisher.js';
import { TikTokConnector } from './tiktokConnector.js';

const port = Number(process.env.PORT || 3000);
const roomId = process.env.ROOM_ID || 'chant-room-01';
const controlPin = process.env.CONTROL_PIN || '2468';
const configuredUsername = String(process.env.TIKTOK_USERNAME || '').replace(/^@/, '');
const bridgeUrl = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : process.env.BRIDGE_URL || `http://localhost:${port}`;

const publisher = new SupabasePublisher({
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  roomId
});

let eventQueue = Promise.resolve();
let reconnectTimer;
let shouldReconnect = false;

function queue(task) {
  eventQueue = eventQueue.then(task).catch(error => console.error('[event]', error));
}

async function handleLike(event) {
  const sessionId = publisher.state.live_session_id || connector.roomId || 'unknown-session';
  const progress = await publisher.getViewerProgress(sessionId, event.userId);
  const previousLikes = Number(progress?.likes || 0);
  const likes = previousLikes + event.count;
  const participants = [...(publisher.state.participants || [])];
  let focusSeat = publisher.state.focus_seat;

  if (previousLikes < 50 && likes >= 50 && participants.length < MAX_CHARACTERS) {
    const alreadySeated = participants.some(person => person.userId === event.userId);
    if (!alreadySeated) {
      const seatIndex = chooseRandomSeat(participants);
      if (seatIndex !== null) {
        participants.push({
          userId: event.userId,
          uniqueId: event.uniqueId,
          nickname: event.nickname,
          avatarUrl: event.avatarUrl,
          seatIndex,
          style: styleFromId(event.userId),
          joinedAt: Date.now()
        });
        focusSeat = seatIndex;
      }
    }
  }

  await publisher.saveViewerProgress({
    session_id: sessionId,
    user_id: event.userId,
    unique_id: event.uniqueId,
    nickname: event.nickname,
    avatar_url: event.avatarUrl,
    likes,
    updated_at: new Date().toISOString()
  });

  await publisher.publish({
    total_likes: event.totalCount || publisher.state.total_likes + event.count,
    participants,
    character_count: participants.length,
    focus_seat: focusSeat,
    last_event_at: Date.now()
  });
}

async function handleGift(event) {
  const participants = publisher.state.participants || [];
  const target = participants.findIndex(person => person.userId === event.userId);
  await publisher.publish({
    gift: {
      id: event.eventId,
      type: event.giftType,
      sender: event.nickname,
      target: target >= 0 ? target : Math.floor(Math.random() * Math.max(1, participants.length)),
      at: event.timestamp
    },
    last_event_at: Date.now()
  });
}

async function updateConnectorStatus(status, details = {}) {
  const patch = {
    connector_status: status,
    bridge_url: bridgeUrl,
    tiktok_username: details.username || connector.username || publisher.state.tiktok_username,
    last_event_at: Date.now()
  };
  if (status === 'online' && details.roomId) {
    const newSession = String(details.roomId) !== String(publisher.state.live_session_id || '');
    patch.live_session_id = String(details.roomId);
    if (newSession) {
      patch.total_likes = 0;
      patch.participants = [];
      patch.character_count = 0;
      patch.focus_seat = null;
      patch.gift = null;
    }
  }
  await publisher.publish(patch, 'connector-status');
}

const connector = new TikTokConnector({
  onEvent: event => queue(() => event.type === 'like' ? handleLike(event) : handleGift(event)),
  onStatus: (status, details) => {
    queue(() => updateConnectorStatus(status, details));
    if (status === 'offline' && shouldReconnect && connector.username) scheduleReconnect();
  }
});

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  queue(() => updateConnectorStatus('reconnecting'));
  reconnectTimer = setTimeout(() => {
    connector.connect(connector.username).catch(error => {
      console.error('[tiktok reconnect]', error.message);
      scheduleReconnect();
    });
  }, 15_000);
}

async function connectTikTok(username) {
  clearTimeout(reconnectTimer);
  shouldReconnect = true;
  return connector.connect(username);
}

async function disconnectTikTok() {
  clearTimeout(reconnectTimer);
  shouldReconnect = false;
  await connector.disconnect();
  await updateConnectorStatus('offline');
}

function send(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-control-pin,x-file-name',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function authorized(request) {
  return request.headers['x-control-pin'] === controlPin;
}

async function readBody(request, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, bridgeUrl);
    if (request.method === 'OPTIONS') return send(response, 204, {});
    if (request.method === 'GET' && url.pathname === '/health') {
      return send(response, 200, {
        ok: true,
        roomId,
        connectorStatus: publisher.state.connector_status,
        username: publisher.state.tiktok_username,
        participants: publisher.state.character_count
      });
    }
    if (!authorized(request)) return send(response, 401, { error: 'PIN ไม่ถูกต้อง' });

    if (request.method === 'POST' && url.pathname === '/connect') {
      const body = JSON.parse((await readBody(request)).toString('utf8') || '{}');
      const result = await connectTikTok(body.username);
      return send(response, 200, { ok: true, ...result });
    }
    if (request.method === 'POST' && url.pathname === '/disconnect') {
      await disconnectTikTok();
      return send(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/reset') {
      await publisher.resetProgress(publisher.state.live_session_id);
      await publisher.publish({
        ...defaultState,
        bridge_url: bridgeUrl,
        connector_status: connector.connection ? 'online' : 'offline',
        tiktok_username: connector.username,
        live_session_id: connector.roomId
      }, 'reset');
      return send(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/state') {
      const body = JSON.parse((await readBody(request)).toString('utf8') || '{}');
      const allowed = new Set([
        'total_likes', 'character_count', 'participants', 'focus_seat',
        'scene', 'camera', 'auto_camera', 'audio_status', 'audio_current_time',
        'audio_volume', 'audio_url', 'character_action', 'gift',
        'started_at', 'paused_at'
      ]);
      const patch = Object.fromEntries(
        Object.entries(body.patch || {}).filter(([key]) => allowed.has(key))
      );
      const next = await publisher.publish(patch, 'control');
      return send(response, 200, { ok: true, state: next });
    }
    if (request.method === 'POST' && url.pathname === '/audio') {
      const body = await readBody(request, 20 * 1024 * 1024);
      const filename = decodeURIComponent(String(request.headers['x-file-name'] || 'chant.mp3'));
      const publicUrl = await publisher.uploadAudio({
        buffer: body,
        filename,
        contentType: request.headers['content-type']
      });
      return send(response, 200, { ok: true, publicUrl });
    }
    return send(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[http]', error);
    return send(response, 500, { error: error.message || 'Internal error' });
  }
});

await publisher.connect();
await publisher.publish({
  bridge_url: bridgeUrl,
  connector_status: 'offline',
  tiktok_username: configuredUsername
}, 'bridge-start');

server.listen(port, '0.0.0.0', () => {
  console.log(`PrayLive TikTok bridge listening on ${port}`);
  if (configuredUsername) {
    connectTikTok(configuredUsername).catch(error => {
      console.error('[tiktok initial]', error.message);
      scheduleReconnect();
    });
  }
});

process.on('SIGTERM', async () => {
  await disconnectTikTok();
  server.close(() => process.exit(0));
});
