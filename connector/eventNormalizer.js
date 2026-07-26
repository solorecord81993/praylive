export function normalizeEvent(event) {
  if (!event?.id || !['like', 'gift', 'connection'].includes(event.type)) return null;
  if (event.type === 'like') return { eventId:event.id, type:'like', count:Math.max(0, Number(event.count)||0), timestamp:event.timestamp||Date.now() };
  if (event.type === 'gift') return { eventId:event.id, type:'gift', giftType:event.giftType||'lotus', senderId:event.senderId||null, timestamp:event.timestamp||Date.now() };
  return { eventId:event.id, type:'connection', status:event.status, timestamp:event.timestamp||Date.now() };
}
