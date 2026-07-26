# PrayLive

เว็บถ่ายทอดฉากสวดมนต์สำหรับ iPhone สองเครื่อง:

- `/live` แสดงฉาก 2.5D กล้องเคลื่อนอัตโนมัติ เล่นเสียง และรองรับแนวตั้ง/แนวนอน
- `/control` ควบคุมเสียง ฉาก กล้อง ของขวัญ และเชื่อม TikTok LIVE
- Render bridge รับ TikTok LIVE events และเขียนสถานะผ่าน Supabase Realtime
- ผู้ชมแต่ละคนกดครบ 50 ไลก์จะได้โยมหนึ่งคนในที่นั่งว่างแบบสุ่ม สูงสุด 20 คน
- ไม่มี subtitle

## ทดลองในเครื่อง

```bash
npm ci
npm run dev
```

เปิด `http://localhost:5173/live/` และ `http://localhost:5173/control/`
PIN เริ่มต้นคือ `2468` หากยังไม่มี Render bridge ปุ่มเพิ่มไลก์จะทำงานใน Simulation Mode

## Supabase

โปรเจกต์ปัจจุบันคือ `ocscshxqqtdzpoiwdksp` รัน SQL ใน `supabase/schema.sql` หนึ่งครั้งก่อนเปิด Render bridge ตาราง `viewer_like_progress` เปิด RLS และไม่มี policy สำหรับ client จึงอ่านหรือเขียนได้เฉพาะ backend ที่ใช้ service-role เท่านั้น

ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน `config.js` หรือไฟล์ frontend

## Deploy frontend

Vercel ใช้:

- Build command: `npm run build`
- Output directory: `dist`

## Deploy TikTok bridge

ใช้ Render Blueprint:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/solorecord81993/praylive
```

ระหว่างกด Apply ต้องใส่ค่า secret:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TIKTOK_USERNAME` — ไม่ต้องใส่ `@`
- `CONTROL_PIN` — ต้องตรงกับ `config.js`

เมื่อ service เริ่มทำงาน มันจะเขียน URL ของตัวเองลง `room_state.bridge_url` อัตโนมัติ หน้า Live จะ ping `/health` ทุก 5 นาทีระหว่างถ่ายทอด เพื่อไม่ให้ Free web service หลับ

## ใช้งานจริง

1. เริ่ม TikTok LIVE ให้เรียบร้อย
2. เปิด `/live` บน iPhone เครื่องถ่ายทอด แล้วแตะเปิดเสียงหนึ่งครั้ง
3. เปิด `/control` บน iPhone เครื่องควบคุม
4. กรอกชื่อ TikTok และกดเชื่อม LIVE
5. เมื่อผู้ชมรายใดส่งไลก์สะสมถึง 50 ระบบจะสุ่มที่นั่งและโฟกัสกล้องไปยังโยมใหม่

ตัวรับ event ใช้ `tiktok-live-connector` ซึ่งไม่ใช่ TikTok API อย่างเป็นทางการ จึงมี Simulation Mode และสถานะการเชื่อมต่อให้ตรวจสอบเสมอ

## ตรวจสอบ

```bash
npm test
npm run build
```
