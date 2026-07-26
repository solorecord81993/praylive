import { createClient } from '@supabase/supabase-js';
import { defaultState, sanitizeState } from '../shared/roomState.js';
import { ROOM_ID } from '../shared/constants.js';

const AUDIO_LIMIT = 20 * 1024 * 1024;

export class SupabasePublisher {
  constructor({ url, serviceKey, roomId = ROOM_ID }) {
    if (!url || !serviceKey) throw new Error('SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY จำเป็นต่อ Render bridge');
    this.roomId = roomId;
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    this.channel = null;
    this.state = sanitizeState(defaultState);
  }

  async connect() {
    const { data, error } = await this.client
      .from('room_state')
      .select('*')
      .eq('room_id', this.roomId)
      .maybeSingle();
    if (error) throw error;
    if (data) this.state = sanitizeState(data);
    await this.ensureChannel();
    return this.state;
  }

  async ensureChannel() {
    if (this.channel) return this.channel;
    const channel = this.client.channel(`room:${this.roomId}`);
    this.channel = channel;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Supabase Realtime connection timed out')), 10_000);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Supabase Realtime: ${status}`));
        }
      });
    });
    return channel;
  }

  async publish(patch, source = 'tiktok-bridge') {
    const next = sanitizeState({ ...this.state, ...patch, updated_at: Date.now() });
    const { error } = await this.client.from('room_state').upsert({
      room_id: this.roomId,
      ...next
    });
    if (error) throw error;
    this.state = next;
    await this.ensureChannel();
    await this.channel.send({
      type: 'broadcast',
      event: 'command',
      payload: {
        commandId: crypto.randomUUID(),
        roomId: this.roomId,
        timestamp: Date.now(),
        source,
        state: next
      }
    });
    return next;
  }

  async getViewerProgress(sessionId, userId) {
    const { data, error } = await this.client
      .from('viewer_like_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async saveViewerProgress(progress) {
    const { error } = await this.client
      .from('viewer_like_progress')
      .upsert(progress, { onConflict: 'session_id,user_id' });
    if (error) throw error;
  }

  async resetProgress(sessionId) {
    if (!sessionId) return;
    const { error } = await this.client
      .from('viewer_like_progress')
      .delete()
      .eq('session_id', sessionId);
    if (error) throw error;
  }

  async uploadAudio({ buffer, filename, contentType }) {
    if (buffer.byteLength > AUDIO_LIMIT) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 20 MB');
    const safeName = String(filename || 'chant.mp3').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
    const path = `${this.roomId}/${Date.now()}-${safeName}`;
    const { error: bucketError } = await this.client.storage.createBucket('audio', {
      public: true,
      fileSizeLimit: AUDIO_LIMIT,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-m4a']
    });
    if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;
    const { error } = await this.client.storage.from('audio').upload(path, buffer, {
      contentType: contentType || 'audio/mpeg',
      upsert: false
    });
    if (error) throw error;
    const { data } = this.client.storage.from('audio').getPublicUrl(path);
    await this.publish({ audio_url: data.publicUrl, audio_status: 'stopped', audio_current_time: 0 }, 'audio-upload');
    return data.publicUrl;
  }
}
