import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseRandomSeat,
  countFromLikes,
  styleFromId
} from '../shared/constants.js';
import {
  normalizeEvent,
  normalizeTikTokLike
} from '../connector/eventNormalizer.js';

test('likes create one participant per 50 up to 20', () => {
  assert.equal(countFromLikes(0), 0);
  assert.equal(countFromLikes(49), 0);
  assert.equal(countFromLikes(50), 1);
  assert.equal(countFromLikes(1000), 20);
  assert.equal(countFromLikes(5000), 20);
});

test('random seat allocator never chooses an occupied seat', () => {
  const participants = [{ seatIndex: 0 }, { seatIndex: 3 }, { seatIndex: 7 }];
  assert.equal(chooseRandomSeat(participants, () => 0), 1);
  assert.equal(chooseRandomSeat(participants, () => .999), 19);
});

test('character style is deterministic', () => {
  assert.equal(styleFromId('viewer-a'), styleFromId('viewer-a'));
  assert.ok(styleFromId('viewer-b') >= 0 && styleFromId('viewer-b') < 8);
});

test('TikTok like payload is normalized with viewer identity', () => {
  const event = normalizeTikTokLike({
    common: { msgId: '123' },
    likeCount: 12,
    totalLikeCount: 700,
    user: { userId: '42', uniqueId: 'alice', nickname: 'Alice' }
  });
  assert.equal(event.eventId, '123');
  assert.equal(event.count, 12);
  assert.equal(event.totalCount, 700);
  assert.equal(event.userId, '42');
});

test('connector rejects unknown events', () => {
  assert.equal(normalizeEvent({ id: '1', type: 'comment' }), null);
  assert.equal(normalizeEvent({ id: '2', type: 'like', count: 10 }).count, 10);
});
