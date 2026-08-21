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
DISCOVERY_SOURCE_ENDPOINT=https://talentflow-rose.vercel.app/api/discovery/source
DISCOVERY_SOURCE_API_KEY=<server-generated-key>
```

รันแบบ local/worker เท่านั้น เพราะ Vercel serverless ไม่เหมาะกับ browser session แบบถาวร:

```bash
node scripts/facebook-group-scraper.mjs
```
