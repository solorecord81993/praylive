import { MAX_CHARACTERS, seats, styleFromId } from '../shared/constants.js';
import { realtime } from '../shared/realtime.js';

const stage = document.querySelector('#stage');
const world = document.querySelector('#world');
const seatMarkers = document.querySelector('#seatMarkers');
const characters = document.querySelector('#characters');
const effects = document.querySelector('#effects');
const peopleCount = document.querySelector('#peopleCount');
const audio = document.querySelector('#audio');
const unlock = document.querySelector('#unlock');
const renderedPeople = new Map();
let state;
let lastGift;
let lastFocusSeat;
let unlocked = false;
let focusTimer;

function placeAtSeat(element, seatIndex) {
  const seat = seats[seatIndex] || seats[0];
  Object.assign(element.style, {
    left: `${seat.x}%`,
    top: `${seat.y}%`,
    zIndex: seat.zIndex,
    transform: `scale(${seat.scale}) rotate(${seat.rotation}deg)`
  });
}

function buildSeatMarkers() {
  seats.forEach((_, index) => {
    const marker = document.createElement('i');
    marker.className = 'seat-marker';
    placeAtSeat(marker, index);
    seatMarkers.append(marker);
  });
}

function fallbackParticipants(count) {
  return Array.from({ length: Math.min(count, MAX_CHARACTERS) }, (_, index) => ({
    userId: `fallback-${index}`,
    nickname: `ผู้ร่วมสวด ${index + 1}`,
    seatIndex: index,
    style: index % 8
  }));
}

function characterElement(person, action) {
  const element = document.createElement('div');
  element.className = `character enter ${action} style-${person.style ?? styleFromId(person.userId)}`;
  element.dataset.userId = person.userId;
  element.innerHTML = `
    <div class="person">
      <div class="head"><i class="hair"></i><i class="ear left"></i><i class="ear right"></i></div>
      <div class="body"><i class="collar"></i><i class="hands"></i></div>
    </div>
    <span class="person-name"></span>
  `;
  element.querySelector('.person-name').textContent = person.nickname || person.userId || 'ผู้ร่วมสวด';
  return element;
}

function drawCharacters(nextState) {
  const participants = nextState.participants?.length
    ? nextState.participants
    : fallbackParticipants(nextState.character_count);
  const activeIds = new Set(participants.map(person => String(person.userId)));

  for (const [userId, element] of renderedPeople) {
    if (!activeIds.has(userId)) {
      element.classList.add('leave');
      setTimeout(() => element.remove(), 500);
      renderedPeople.delete(userId);
    }
  }

  participants.forEach(person => {
    const userId = String(person.userId);
    let element = renderedPeople.get(userId);
    if (!element) {
      element = characterElement(person, nextState.character_action);
      renderedPeople.set(userId, element);
      characters.append(element);
      requestAnimationFrame(() => element.classList.remove('enter'));
    }
    const baseStyle = person.style ?? styleFromId(userId);
    element.className = `character ${nextState.character_action} style-${baseStyle}`;
    element.querySelector('.person-name').textContent = person.nickname || userId;
    placeAtSeat(element, Number(person.seatIndex));
  });

  peopleCount.textContent = `${participants.length}/${MAX_CHARACTERS} คน`;
}

function focusSeat(seatIndex) {
  if (!Number.isInteger(Number(seatIndex)) || Number(seatIndex) === lastFocusSeat) return;
  lastFocusSeat = Number(seatIndex);
  const seat = seats[lastFocusSeat];
  world.style.setProperty('--focus-x', `${(50 - seat.x) * .72}%`);
  world.style.setProperty('--focus-y', `${(62 - seat.y) * .42}%`);
  stage.classList.remove('spawn-focus');
  requestAnimationFrame(() => stage.classList.add('spawn-focus'));
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => stage.classList.remove('spawn-focus'), 4800);
}

function showGift(gift) {
  if (!gift || gift.id === lastGift) return;
  lastGift = gift.id;
  const element = document.createElement('div');
  element.className = 'gift';
  element.textContent = {
    lotus: '🪷',
    candle: '🕯️',
    golden: '✨🪷',
    aura: '☀️',
    bell: '🔔',
    special: '🪷✨'
  }[gift.type] || '🪷';
  effects.append(element);
  const target = [...renderedPeople.values()][gift.target || 0];
  if (gift.type === 'aura') target?.classList.add('aura');
  if (gift.type === 'candle') {
    element.classList.add('candle');
    element.style.left = `${20 + Math.random() * 60}%`;
    element.style.top = 'auto';
  }
  setTimeout(() => element.remove(), 5000);
}

async function syncAudio(nextState) {
  audio.volume = nextState.audio_volume;
  if (nextState.audio_url && audio.src !== nextState.audio_url) audio.src = nextState.audio_url;
  if (Number.isFinite(nextState.audio_current_time) && Math.abs(audio.currentTime - nextState.audio_current_time) > 2) {
    audio.currentTime = nextState.audio_current_time;
  }
  if (!unlocked) return;
  if (nextState.audio_status === 'playing') await audio.play().catch(() => {});
  else audio.pause();
  if (nextState.audio_status === 'stopped') audio.currentTime = 0;
}

function keepBridgeAwake(bridgeUrl) {
  if (!bridgeUrl || keepBridgeAwake.url === bridgeUrl) return;
  keepBridgeAwake.url = bridgeUrl;
  const ping = () => fetch(`${bridgeUrl.replace(/\/$/, '')}/health`, { cache: 'no-store' }).catch(() => {});
  ping();
  setInterval(ping, 5 * 60 * 1000);
}

buildSeatMarkers();
realtime.subscribe(nextState => {
  state = nextState;
  const focusClass = stage.classList.contains('spawn-focus') ? ' spawn-focus' : '';
  stage.className = `scene-${nextState.scene} camera-${nextState.camera}${nextState.auto_camera ? ' auto-camera' : ''}${focusClass}`;
  drawCharacters(nextState);
  focusSeat(nextState.focus_seat);
  showGift(nextState.gift);
  syncAudio(nextState);
  keepBridgeAwake(nextState.bridge_url);
});
realtime.connect();

unlock.onclick = async () => {
  unlocked = true;
  unlock.classList.add('hidden');
  await audio.play().catch(() => {});
  if (state.audio_status !== 'playing') audio.pause();
};
