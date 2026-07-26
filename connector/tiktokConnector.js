import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { normalizeTikTokGift, normalizeTikTokLike } from './eventNormalizer.js';

export class TikTokConnector {
  constructor({ onEvent, onStatus }) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.connection = null;
    this.username = '';
    this.roomId = '';
  }

  async connect(username) {
    await this.disconnect();
    this.username = String(username || '').trim().replace(/^@/, '');
    if (!this.username) throw new Error('กรุณาระบุชื่อบัญชี TikTok');
    this.onStatus('connecting', { username: this.username });
    const connection = new TikTokLiveConnection(this.username, {
      processInitialData: false,
      enableExtendedGiftInfo: true
    });
    this.connection = connection;
    connection.on(WebcastEvent.LIKE, data => {
      const event = normalizeTikTokLike(data);
      if (event) this.onEvent(event);
    });
    connection.on(WebcastEvent.GIFT, data => {
      if (data.giftDetails?.giftType === 1 && !data.repeatEnd) return;
      const event = normalizeTikTokGift(data);
      if (event) this.onEvent(event);
    });
    connection.on('disconnected', () => this.onStatus('offline', { username: this.username }));
    connection.on('streamEnd', () => this.onStatus('offline', { username: this.username }));
    const result = await connection.connect();
    this.roomId = String(result.roomId || '');
    this.onStatus('online', { username: this.username, roomId: this.roomId });
    return { username: this.username, roomId: this.roomId };
  }

  async disconnect() {
    const connection = this.connection;
    this.connection = null;
    if (!connection) return;
    try {
      await connection.disconnect();
    } catch {
      // The connection may already be closed by TikTok.
    }
  }
}
