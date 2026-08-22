import { chromium } from "@playwright/test";

const storageStatePath = "/tmp/facebook-storage-state.json";
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto("https://www.facebook.com/login", { waitUntil: "domcontentloaded" });
console.log("กรุณา login Facebook ในหน้าต่าง browser ที่เปิดขึ้นมา แล้วรอให้หน้า Facebook โหลดเสร็จ");

await page.waitForURL(/https:\/\/www\.facebook\.com\/(?!login)/, { timeout: 300_000 });
await context.storageState({ path: storageStatePath });
await browser.close();

console.log(`บันทึก Facebook storage state แล้ว: ${storageStatePath}`);
