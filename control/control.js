import { realtime } from '../shared/realtime.js';
import {
  chooseRandomSeat,
  LIKES_PER_CHARACTER,
  MAX_CHARACTERS,
  styleFromId
} from '../shared/constants.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const expectedPin = globalThis.PRAYLIVE_CONFIG?.controlPin || '2468';
let state;
let activePin = expectedPin;

function statusLabel(status = 'offline') {
  return {
    online: '● เชื่อม TikTok LIVE แล้ว',
    connecting: '● กำลังเชื่อมต่อ',
    reconnecting: '● กำลังเชื่อมต่อใหม่',
    error: '● เชื่อมต่อไม่สำเร็จ',
    offline: '● ยังไม่เชื่อม'
  }[status] || `● ${status}`;
}

function simulatedParticipants(targetCount) {
  const participants = [...(state.participants || [])];
  while (participants.length < targetCount && participants.length < MAX_CHARACTERS) {
    const userId = `simulation-${crypto.randomUUID()}`;
    const seatIndex = chooseRandomSeat(participants);
    if (seatIndex === null) break;
    participants.push({
      userId,
      nickname: `ผู้ร่วมสวด ${participants.length + 1}`,
      seatIndex,
      style: styleFromId(userId),
      joinedAt: Date.now(),
      simulated: true
    });
  }
  while (participants.length > targetCount) participants.pop();
  return participants;
}

async function bridgeRequest(path, options = {}) {
  const bridgeUrl = state?.bridge_url?.replace(/\/$/, '');
  if (!bridgeUrl) throw new Error('Render bridge ยังไม่พร้อม');
  const headers = new Headers(options.headers || {});
  headers.set('x-control-pin', activePin);
  const response = await fetch(`${bridgeUrl}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function updateState(patch) {
  if (!state?.bridge_url) return realtime.update(patch);
  return bridgeRequest('/state', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ patch })
  });
}

$('#pinForm').onsubmit = event => {
  event.preventDefault();
  if ($('#pin').value === expectedPin) {
    activePin = $('#pin').value;
    $('#lock').classList.add('hidden');
    sessionStorage.setItem('control-unlocked', '1');
  } else {
    $('#pinError').textContent = 'รหัส PIN ไม่ถูกต้อง';
  }
};

if (sessionStorage.getItem('control-unlocked')) $('#lock').classList.add('hidden');

realtime.connect(status => {
  $('#connection').textContent = status === 'online'
    ? '● ออนไลน์'
    : status === 'simulation'
      ? '● Simulation'
      : `● ${status}`;
});

realtime.subscribe(nextState => {
  state = nextState;
  $('#charCount').textContent = nextState.character_count;
  $('#likes').textContent = nextState.total_likes.toLocaleString();
  $('#progress').style.width = `${(nextState.total_likes % LIKES_PER_CHARACTER) / LIKES_PER_CHARACTER * 100}%`;
  $('#volume').value = nextState.audio_volume;
  $('#volumeOut').textContent = `${Math.round(nextState.audio_volume * 100)}%`;
  $('#tiktokUsername').value ||= nextState.tiktok_username || '';
  $('#tiktokUser').textContent = nextState.tiktok_username
    ? `@${nextState.tiktok_username.replace(/^@/, '')}`
    : nextState.bridge_url
      ? 'Render bridge พร้อมใช้งาน'
      : 'รอ Render bridge';
  const tiktokStatus = nextState.connector_status || 'offline';
  $('#tiktokConnection').textContent = statusLabel(tiktokStatus);
  $('#tiktokConnection').className = `status-dot ${tiktokStatus}`;
  $$('[data-cmd=scene],[data-cmd=camera]').forEach(button => {
    button.classList.toggle('active', [nextState.scene, nextState.camera].includes(button.dataset.value));
  });
  $('[data-cmd=auto]').classList.toggle('active', nextState.auto_camera);
});

$$('[data-cmd]').forEach(button => {
  button.onclick = () => {
    const { cmd, value } = button.dataset;
    if (cmd === 'likes') {
      const likes = state.total_likes + Number(value);
      const targetCount = Math.min(Math.floor(likes / LIKES_PER_CHARACTER), MAX_CHARACTERS);
      const participants = simulatedParticipants(targetCount);
      void updateState({
        total_likes: likes,
        participants,
        character_count: participants.length,
        focus_seat: participants.at(-1)?.seatIndex ?? null
      });
    }
    if (cmd === 'audio') {
      void updateState({
        audio_status: value,
        audio_current_time: value === 'stopped' ? 0 : Number($('#seek').value),
        started_at: value === 'playing' ? Date.now() : state.started_at,
        paused_at: value === 'paused' ? Date.now() : null
      });
    }
    if (cmd === 'scene') void updateState({ scene: value });
    if (cmd === 'camera') void updateState({ camera: value, auto_camera: false });
    if (cmd === 'auto') void updateState({ auto_camera: !state.auto_camera });
    if (cmd === 'character') {
      const targetCount = Math.min(
        MAX_CHARACTERS,
        Math.max(0, state.character_count + (value === 'add' ? 1 : -1))
      );
      const participants = simulatedParticipants(targetCount);
      void updateState({ participants, character_count: participants.length });
    }
    if (cmd === 'action') void updateState({ character_action: value });
  };
});

$$('[data-gift]').forEach(button => {
  button.onclick = () => void updateState({
    gift: {
      id: crypto.randomUUID(),
      type: button.dataset.gift,
      target: Math.floor(Math.random() * Math.max(1, state.character_count)),
      at: Date.now()
    }
  });
});

$('#volume').oninput = event => {
  $('#volumeOut').textContent = `${Math.round(event.target.value * 100)}%`;
  void updateState({ audio_volume: Number(event.target.value) });
};

$('#seek').onchange = event => void updateState({ audio_current_time: Number(event.target.value) });

$('#audioUpload').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) return alert('ไฟล์ต้องมีขนาดไม่เกิน 20 MB');
  const message = $('#bridgeMessage');
  try {
    message.textContent = 'กำลังอัปโหลดเสียงไปยังเครื่องถ่ายทอด…';
    await bridgeRequest('/audio', {
      method: 'POST',
      headers: {
        'content-type': file.type || 'audio/mpeg',
        'x-file-name': encodeURIComponent(file.name)
      },
      body: file
    });
    message.textContent = 'อัปโหลดสำเร็จ เครื่องถ่ายทอดพร้อมเล่นไฟล์นี้';
  } catch (error) {
    message.textContent = `อัปโหลดไม่สำเร็จ: ${error.message}`;
  }
};

$('#tiktokForm').onsubmit = async event => {
  event.preventDefault();
  const username = $('#tiktokUsername').value.trim().replace(/^@/, '');
  const message = $('#bridgeMessage');
  if (!username) return;
  try {
    message.textContent = 'กำลังเชื่อมบัญชี TikTok LIVE…';
    await bridgeRequest('/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username })
    });
    message.textContent = 'ส่งคำสั่งเชื่อมต่อแล้ว ต้องเริ่ม LIVE ใน TikTok ก่อน';
  } catch (error) {
    message.textContent = `เชื่อมต่อไม่สำเร็จ: ${error.message}`;
  }
};

$('#disconnectTikTok').onclick = async () => {
  try {
    await bridgeRequest('/disconnect', { method: 'POST' });
    $('#bridgeMessage').textContent = 'ตัดการเชื่อมต่อ TikTok แล้ว';
  } catch (error) {
    $('#bridgeMessage').textContent = `ตัดการเชื่อมต่อไม่สำเร็จ: ${error.message}`;
  }
};

$('#reset').onclick = async () => {
  if (!confirm('รีเซ็ตผู้ร่วมสวด ยอดไลก์ และสถานะทั้งหมดหรือไม่?')) return;
  try {
    if (state.bridge_url) await bridgeRequest('/reset', { method: 'POST' });
    else await realtime.reset();
  } catch (error) {
    alert(`รีเซ็ตไม่สำเร็จ: ${error.message}`);
  }
};
