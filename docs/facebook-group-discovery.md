# Facebook Group Discovery Source

ใช้สำหรับ Assignment/authorized operations เท่านั้น โดยใช้ Playwright session state ของบัญชีที่มีสิทธิ์เข้าถึงกลุ่ม

ข้อจำกัด:

- ไม่เก็บรหัสผ่าน, cookie หรือ session state ใน repository
- ไม่ bypass CAPTCHA, 2FA, privacy controls หรือ access control
- ดึงเฉพาะโพสต์ที่บัญชีสามารถเห็นได้
- ใช้ `externalId` จาก SHA-256 เพื่อป้องกันการนำโพสต์เดิมเข้าอีกครั้ง
- ต้องตรวจสอบ Terms ของ Facebook และสิทธิ์ของกลุ่มก่อนใช้งานจริง

ตัวแปรที่ต้องใช้:

```env
FACEBOOK_GROUP_URL=https://www.facebook.com/groups/625167729529245
FACEBOOK_STORAGE_STATE_PATH=/secure/path/facebook-storage-state.json
DISCOVERY_SOURCE_ENDPOINT=https://talentflow-web-production.up.railway.app/api/discovery/source
DISCOVERY_SOURCE_API_KEY=<server-generated-key>
DISCOVERY_SEARCH_ENDPOINT=http://127.0.0.1:8787/search
FACEBOOK_STORAGE_STATE_JSON=<secret-json-for-production-worker>
ไมโครเซอร์วิส Cloudflare ใช้ `CLOUDFLARE_BROWSER_RENDERING_API_TOKEN` และ `CLOUDFLARE_ACCOUNT_ID` เป็น Worker secrets/vars เพื่อเรียก Browser Rendering REST API; session state ยังเป็น optional สำหรับกลุ่มสาธารณะ
```

Web flow ส่ง query ที่สร้างจาก JD ไปยัง `DISCOVERY_SEARCH_ENDPOINT` และรับเฉพาะโพสต์ที่ตรงเงื่อนไขกลับมา ส่วน `DISCOVERY_SOURCE_ENDPOINT` เป็น ingestion sink สำหรับ worker เท่านั้น ไม่ใช่ search endpoint

รัน worker จากโค้ด scraper เดิมด้วย `npm run worker:facebook` หรือ deploy ด้วย `Dockerfile.facebook-worker` โดยห้าม commit storage state; production ใช้ secret `FACEBOOK_STORAGE_STATE_JSON` แทนไฟล์ local

ตรวจสุขภาพ worker ได้ที่ `GET /healthz`; ค้นหาใช้ `POST /search` พร้อม `Authorization: Bearer <DISCOVERY_SOURCE_API_KEY>`

รัน worker แยกจาก web service เพราะ browser session แบบถาวรไม่ควรผูกกับ request lifecycle ของ web service:

```bash
node scripts/facebook-group-scraper.mjs
```
