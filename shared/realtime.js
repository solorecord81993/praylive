import { ROOM_ID } from './constants.js';
import { defaultState, sanitizeState } from './roomState.js';

const key = `praylive:${ROOM_ID}`;
const bus = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;
const listeners = new Set();
let state = sanitizeState(JSON.parse(localStorage.getItem(key) || 'null') || defaultState);
let channel;
const config = globalThis.PRAYLIVE_CONFIG || {};
let supabase = null;
const seen = new Set();

function emit(next) { state = sanitizeState(next); listeners.forEach(fn => fn(state)); }
bus?.addEventListener('message', ({ data }) => receive(data));
window.addEventListener('storage', e => e.key === key && emit(JSON.parse(e.newValue)));

function receive(message) {
  if (!message || message.roomId !== ROOM_ID || seen.has(message.commandId)) return;
  seen.add(message.commandId); if (seen.size > 300) seen.delete(seen.values().next().value);
  emit(message.state);
}

export const realtime = {
  get state() { return state; },
  async connect(status) {
    if (config.supabaseUrl && config.supabaseAnonKey && !supabase) {
      status?.('connecting');
      try { const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2'); supabase=createClient(config.supabaseUrl,config.supabaseAnonKey); }
      catch { status?.('simulation'); }
    }
    status?.(supabase ? 'connecting' : 'simulation');
    if (!supabase) { status?.('simulation'); return; }
    const { data } = await supabase.from('room_state').select('*').eq('room_id', ROOM_ID).maybeSingle();
    if (data) emit(data);
    channel = supabase.channel(`room:${ROOM_ID}`).on('broadcast', { event: 'command' }, ({ payload }) => receive(payload))
      .subscribe(s => status?.(s === 'SUBSCRIBED' ? 'online' : s.toLowerCase()));
  },
  subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
  async update(patch, source = 'control') {
    const next = sanitizeState({ ...state, ...patch, updated_at: Date.now() });
    const message = { commandId: crypto.randomUUID(), roomId: ROOM_ID, timestamp: Date.now(), source, state: next };
    receive(message); localStorage.setItem(key, JSON.stringify(next)); bus?.postMessage(message);
    if (channel) await channel.send({ type: 'broadcast', event: 'command', payload: message });
    if (supabase && source !== 'live') await supabase.from('room_state').upsert({ room_id: ROOM_ID, ...next });
  },
  reset() { return this.update(defaultState); }
};
