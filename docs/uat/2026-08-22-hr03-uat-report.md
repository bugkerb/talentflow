# HR-03 UAT Report — 2026-08-22

ผู้ทดสอบจำลอง: HR-03 ผู้ดูแล pipeline
วิธีตรวจ: Playwright browser จริง, local app `http://localhost:3000`, authenticated HR session
ขอบเขต: UAT-07 ถึง UAT-10
Source code: ไม่ได้แก้ไข

## สรุปผล

| UAT | ผล | Severity | หลักฐาน |
|---|---|---|---|
| UAT-07 ติดตามผู้สมัคร | PASS | — | เปิด drawer, เปลี่ยน stage, ตรวจข้อมูลครบ |
| UAT-08 ตารางนัดสัมภาษณ์ | PASS | — | สลับ วัน/สัปดาห์/เดือน และเปิดฟอร์มนัดหมาย |
| UAT-09 Responsive | PASS | — | viewport 390×844, ไม่มี horizontal overflow, เมนู mobile ทำงาน |
| UAT-10 ภาษาและความเข้าใจ | PASS* | — | ข้อความ workflow เป็นภาษาไทยและ action มี feedback/state |

`*` พบ console error เฉพาะ development runtime ของ React/Next.js เรื่อง `eval()`; ไม่ใช่ UI/business-flow error และข้อความระบุว่า production mode ไม่ใช้ eval(). ดูข้อสังเกตท้ายรายงาน

## UAT-07 — ติดตามผู้สมัคร

- URL: `http://localhost:3000/applications`
- ขั้นตอน:
  1. เปิดหน้า `/applications` ด้วย HR session
  2. กดบัตรผู้สมัคร `วิชญะ อารีรัตน์`
  3. ตรวจ drawer รายละเอียดผู้สมัคร
  4. เลือก combobox `สถานะปัจจุบัน` เป็น `สัมภาษณ์`
- Expected: เปิดรายละเอียดได้, drawer ไม่เป็น dead click, เปลี่ยน stage ได้, ข้อมูลสำคัญแสดงครบ
- Actual: PASS — drawer เปิดที่ด้านขวาและมี `role=dialog`; stage เปลี่ยนค่าเป็น `สัมภาษณ์`; แสดงทักษะ, ประสบการณ์, การศึกษา และเงินเดือนที่คาดหวัง
- Severity: —
- Evidence: [uat-07-applications-drawer.png](/Users/bugkerb/Developer/talentflow/output/playwright/uat-07-applications-drawer.png)

## UAT-08 — ตารางนัดสัมภาษณ์

- URL: `http://localhost:3000/interviews`
- ขั้นตอน:
  1. เปิดหน้า `/interviews`
  2. กด `วัน`, `เดือน`, `สัปดาห์` ตามลำดับ
  3. ตรวจ `aria-pressed` ของมุมมองที่เลือก
  4. กด `นัดหมายสัมภาษณ์`
- Expected: แต่ละมุมมองเปลี่ยนเนื้อหาปฏิทินและ state ชัดเจน; ปุ่มนัดหมายเปิดฟอร์ม action
- Actual: PASS — วันแสดงวันที่เดียว, เดือนแสดงปฏิทินเดือน, สัปดาห์แสดงช่วงสัปดาห์; แต่ละปุ่มมี `aria-pressed=true` เมื่อเลือก; ฟอร์ม `นัดหมายสัมภาษณ์ใหม่` เปิดพร้อมวันที่/เวลา/ผู้สัมภาษณ์/รูปแบบการสัมภาษณ์
- Severity: —

## UAT-09 — Responsive

- URL: `http://localhost:3000/interviews`
- ขั้นตอน:
  1. ตั้ง viewport เป็น `390×844`
  2. ตรวจ navigation และ content
  3. ตรวจ `document.documentElement.scrollWidth` เทียบกับ `innerWidth`
- Expected: เมนู mobile ใช้งานได้, content ไม่ชน/ล้นแนวนอน
- Actual: PASS — navigation หลักถูกซ่อนตาม responsive layout, ปุ่ม mobile menu แสดง, `scrollWidth=390` เท่ากับ viewport width และไม่พบ horizontal overflow
- Severity: —

## UAT-10 — ภาษาและความเข้าใจ

- URL: `http://localhost:3000/applications`, `http://localhost:3000/interviews`
- ขั้นตอน: ตรวจชื่อหน้า, ปุ่ม, labels, stage/view controls และผลหลัง interaction
- Expected: ไม่มีภาษาอังกฤษที่ไม่จำเป็น; action บอกผลและ state ชัดเจน
- Actual: PASS — workflow labels เป็นภาษาไทย เช่น `สถานะปัจจุบัน`, `นัดหมายสัมภาษณ์`, `บอร์ด`, `รายการ`, `วัน`, `สัปดาห์`, `เดือน`; selected state อ่านได้จาก `aria-pressed` และ combobox value
- Severity: —

## ข้อสังเกตที่ไม่ทำให้ UAT ตก

Playwright console พบข้อความ:

`eval() is not supported in this environment ... React will never use eval() in production mode`

สาเหตุที่ตรวจได้: เป็น React/Next.js development runtime ที่โหลดจาก `/_next/static/...` ไม่ใช่ application error จาก interaction หรือ API และไม่ได้พบ warning อื่นใน session นี้ การยืนยัน production ควรตรวจซ้ำจาก production build/runtime
