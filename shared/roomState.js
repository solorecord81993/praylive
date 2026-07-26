import { INITIAL_CHARACTERS, LIKES_PER_CHARACTER, MAX_CHARACTERS } from './constants.js';

export const defaultState = {
  total_likes: 0, character_count: INITIAL_CHARACTERS, max_characters: MAX_CHARACTERS,
  likes_per_character: LIKES_PER_CHARACTER, scene: 'temple', camera: 'wide', auto_camera: true,
  audio_status: 'stopped', audio_current_time: 0,
  audio_volume: .75, audio_url: '', character_action: 'meditate', gift: null, updated_at: Date.now()
};

export function sanitizeState(value = {}) {
  return { ...defaultState, ...value, total_likes: Math.max(0, Number(value.total_likes ?? 0)),
    character_count: Math.min(MAX_CHARACTERS, Math.max(1, Number(value.character_count ?? 1))) };
}
