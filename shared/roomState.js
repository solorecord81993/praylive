import { INITIAL_CHARACTERS, LIKES_PER_CHARACTER, MAX_CHARACTERS } from './constants.js';

export const defaultState = {
  total_likes: 0, character_count: INITIAL_CHARACTERS, max_characters: MAX_CHARACTERS,
  likes_per_character: LIKES_PER_CHARACTER, scene: 'temple', camera: 'wide', auto_camera: true,
  audio_status: 'stopped', audio_current_time: 0,
  audio_volume: .75, audio_url: '', character_action: 'meditate', gift: null,
  participants: [], focus_seat: null, connector_status: 'offline',
  tiktok_username: '', bridge_url: '', live_session_id: '', last_event_at: null,
  updated_at: Date.now()
};

export function sanitizeState(value = {}) {
  const participants = Array.isArray(value.participants)
    ? value.participants.filter(person => Number.isInteger(Number(person?.seatIndex))).slice(0, MAX_CHARACTERS)
    : [];
  const requestedCount = Number(value.character_count ?? participants.length);
  return {
    ...defaultState,
    ...value,
    participants,
    total_likes: Math.max(0, Number(value.total_likes ?? 0)),
    character_count: Math.min(MAX_CHARACTERS, Math.max(0, requestedCount))
  };
}
