# Buddhist Live Scene

MVP ฉากสวดมนต์สดแบบ 2D / pseudo-3D สำหรับ iPhone สองเครื่อง โดยหน้า [`/live`](./live/) แสดงฉากและเล่นเสียง ส่วน [`/control`](./control/) ควบคุมผ่าน Supabase Realtime ระบบใช้ CSS transform เท่านั้น ไม่ใช้ Three.js หรือ WebGL และมี Simulation Mode ผ่าน BroadcastChannel ให้ทดลองได้ทันทีโดยยังไม่ตั้งค่า Supabase

## เริ่มใช้งาน

```bash
npm run dev
```

เปิด `http://localhost:5173/live/` และ `http://localhost:5173/control/` (PIN เริ่มต้น `2468`) หากไม่กำหนด Supabase ทั้งสองแท็บใน browser เดียวกันจะ sync ผ่าน Simulation Mode

## ตั้งค่า Supabase

1. สร้างโปรเจกต์ Supabase และเปิด Realtime Broadcast
2. รัน SQL ด้านล่างใน SQL Editor
3. คัดลอก **Project URL** และ **anon key** ลง `config.js` ห้ามใช้ service-role key ใน frontend (หรือสร้างไฟล์นี้จาก Environment Variables ใน deployment pipeline)
4. เพิ่ม URL ของ Vercel ใน Authentication > URL Configuration

```sql
create table public.room_state (
  room_id text primary key check (room_id ~ '^[a-z0-9-]{3,64}$'),
  total_likes integer not null default 0,
  character_count integer not null default 1 check (character_count between 1 and 20),
  max_characters integer not null default 20,
  likes_per_character integer not null default 50,
  scene text not null default 'temple', camera text not null default 'wide',
  auto_camera boolean not null default true,
  subtitle_enabled boolean not null default true, subtitle_language text not null default 'th',
  audio_status text not null default 'stopped', audio_current_time float not null default 0,
  audio_volume float not null default .75, audio_url text not null default '',
  character_action text not null default 'meditate', gift jsonb,
  started_at bigint, paused_at bigint, updated_at bigint
);
alter table public.room_state enable row level security;
create policy "room state readable" on public.room_state for select to anon using (true);
-- MVP: control PIN เป็นเพียง client-side guard; production ควรใช้ Supabase Auth/JWT
create policy "authenticated control writes" on public.room_state for all to authenticated
using (true) with check (true);
insert into public.room_state (room_id) values ('chant-room-01');
```

> Broadcast จะยังทำงานด้วย anon key แต่การบันทึก state ถาวรต้องล็อกอินเป็น authenticated ตาม policy ตัวอย่าง ใน production ควรย้ายการเขียนไป Edge Function ที่ตรวจ PIN/JWT เพื่อไม่เปิดสิทธิ์ฐานข้อมูลสาธารณะ

### Storage สำหรับเสียง

สร้าง bucket private ชื่อ `audio`, จำกัด MIME เป็น `audio/mpeg` และขนาดไม่เกิน 20 MB แล้วใช้ signed URL จาก backend สำหรับ playlist ปัจจุบันปุ่ม Upload ใช้ object URL ในเครื่องสำหรับทดสอบ จึงไม่สามารถส่งไฟล์ข้าม iPhone ได้จนกว่าจะต่อ Storage

## Deploy

1. Push repository ไป GitHub แล้ว Import ใน Vercel
2. Build command: `npm run build`; output: `dist`
3. เพิ่ม environment variables ตาม `.env.example`
4. เปิด `/live` บน iPhone A แตะปุ่มเริ่มเสียงหนึ่งครั้ง และเปิด `/control` บน iPhone B

## ทดสอบ

```bash
npm test
npm run build
```

Simulation: กด “เพิ่ม 10 Likes” 5 ครั้ง ตัวละครจะเพิ่มหนึ่งคน; ของขวัญจะแสดงเอฟเฟกต์แต่ไม่เปลี่ยนจำนวนตัวละคร การ reload จะกู้ state ล่าสุดจาก localStorage หรือฐานข้อมูล

## Connector

โฟลเดอร์ `connector/` เป็น adapter Node.js แยกจาก frontend รับ event จาก provider แล้ว normalize เป็น like/gift ก่อน publish ตัวอย่างเริ่มใน simulation mode:

```bash
node connector/index.js
```

นำ adapter ของ TikTok provider จริงมาแทน `SimulationConnector` ได้โดยไม่แก้ frontend ทั้งนี้ library ที่เชื่อม TikTok แบบไม่เป็นทางการควรตรวจเงื่อนไขการใช้งานก่อน deploy

## Asset และ performance

แก้รายการฉาก/ตำแหน่งที่ `shared/constants.js` และเปลี่ยน CSS/asset โดยไม่แตะ realtime logic โครงสร้างรองรับ `assets/backgrounds`, `characters`, `audio`, `subtitles`, `effects` แนะนำ WebP/WebM ขนาดพอดีหน้าจอ, `preload="metadata"`, และโหลด animation เฉพาะ state ปัจจุบันเพื่อรักษา 30–60 FPS บน Safari iPhone
