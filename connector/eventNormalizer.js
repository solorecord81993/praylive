function eventId(data, prefix) {
  return String(
    data?.common?.msgId ||
    data?.msgId ||
    `${prefix}-${data?.user?.userId || data?.user?.uniqueId || 'unknown'}-${Date.now()}-${Math.random()}`
  );
}

function userFrom(data = {}) {
  return {
    userId: String(data.user?.userId || data.user?.uniqueId || ''),
    uniqueId: String(data.user?.uniqueId || ''),
    nickname: String(data.user?.nickname || data.user?.uniqueId || 'ผู้ร่วมสวด').slice(0, 48),
    avatarUrl: data.user?.profilePictureUrls?.[0] || ''
  };
}

export function normalizeTikTokLike(data) {
  const user = userFrom(data);
  const count = Math.max(0, Number(data?.likeCount ?? data?.count ?? 0));
  if (!user.userId || !count) return null;
  return {
    eventId: eventId(data, 'like'),
    type: 'like',
    count,
    totalCount: Math.max(0, Number(data?.totalLikeCount ?? 0)),
    ...user,
    timestamp: Date.now()
  };
}

export function normalizeTikTokGift(data) {
  const user = userFrom(data);
  if (!user.userId) return null;
  const giftName = String(data?.giftDetails?.giftName || data?.extendedGiftInfo?.name || '').toLowerCase();
  const repeatCount = Math.max(1, Number(data?.repeatCount || 1));
  const giftType = giftName.includes('lotus')
    ? 'golden'
    : repeatCount >= 10
      ? 'special'
      : 'lotus';
  return {
    eventId: eventId(data, 'gift'),
    type: 'gift',
    giftType,
    giftName,
    repeatCount,
    ...user,
    timestamp: Date.now()
  };
}

export function normalizeEvent(event) {
  if (!event?.id || !['like', 'gift', 'connection'].includes(event.type)) return null;
  if (event.type === 'like') {
    return {
      eventId: event.id,
      type: 'like',
      count: Math.max(0, Number(event.count) || 0),
      totalCount: Math.max(0, Number(event.totalCount) || 0),
      userId: event.userId || 'simulation',
      uniqueId: event.uniqueId || 'simulation',
      nickname: event.nickname || 'ผู้ร่วมสวดทดลอง',
      timestamp: event.timestamp || Date.now()
    };
  }
  if (event.type === 'gift') {
    return {
      eventId: event.id,
      type: 'gift',
      giftType: event.giftType || 'lotus',
      senderId: event.senderId || null,
      timestamp: event.timestamp || Date.now()
    };
  }
  return {
    eventId: event.id,
    type: 'connection',
    status: event.status,
    timestamp: event.timestamp || Date.now()
  };
}
