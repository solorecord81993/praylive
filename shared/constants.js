export const INITIAL_CHARACTERS = 0;
export const LIKES_PER_CHARACTER = 50;
export const MAX_CHARACTERS = 20;
export const ROOM_ID = globalThis.PRAYLIVE_CONFIG?.roomId || 'chant-room-01';
export const CAMERA_INTERVAL = { min: 10_000, max: 20_000 };
export const SCENES = ['temple', 'forest', 'night', 'lotus'];
export const CAMERAS = ['wide', 'center', 'left', 'right', 'focus', 'top'];
export const GIFTS = ['lotus', 'candle', 'golden', 'aura', 'bell', 'special'];

export const seats = [
  [50,78,1,40,0],[32,77,.98,40,-2],[68,77,.98,40,2],
  [23,68,.86,30,-3],[41,68,.88,30,-1],[59,68,.88,30,1],[77,68,.86,30,3],
  [14,58,.7,20,-4],[28,58,.72,20,-2],[43,58,.74,20,-1],[57,58,.74,20,1],[72,58,.72,20,2],[86,58,.7,20,4],
  [10,48,.56,10,-4],[23,48,.58,10,-3],[36,48,.6,10,-1],[50,48,.61,10,0],[64,48,.6,10,1],[77,48,.58,10,3],[90,48,.56,10,4]
].map(([x,y,scale,zIndex,rotation]) => ({ x,y,scale,zIndex,rotation }));

export function countFromLikes(likes) {
  return Math.min(Math.floor(Math.max(0, likes) / LIKES_PER_CHARACTER), MAX_CHARACTERS);
}

export function chooseRandomSeat(participants = [], random = Math.random) {
  const occupied = new Set(participants.map(person => Number(person.seatIndex)));
  const available = seats.map((_, index) => index).filter(index => !occupied.has(index));
  if (!available.length) return null;
  return available[Math.floor(random() * available.length)];
}

export function styleFromId(value = '') {
  let hash = 7;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 8;
}
