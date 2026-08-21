import { chromium } from "@playwright/test";
import crypto from "node:crypto";

const groupUrl = process.env.FACEBOOK_GROUP_URL;
const storageState = process.env.FACEBOOK_STORAGE_STATE_PATH;
const sink = process.env.DISCOVERY_SOURCE_ENDPOINT;
const sinkKey = process.env.DISCOVERY_SOURCE_API_KEY;
if (!groupUrl || !storageState || !sink || !sinkKey) throw new Error("Set FACEBOOK_GROUP_URL, FACEBOOK_STORAGE_STATE_PATH, DISCOVERY_SOURCE_ENDPOINT and DISCOVERY_SOURCE_API_KEY");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState, locale: "th-TH" });
const page = await context.newPage();
await page.goto(groupUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 1600); await page.waitForTimeout(800); }

const posts = await page.locator("div[role=article]").evaluateAll((articles) => articles.map((article) => {
  const text = article.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const links = [...article.querySelectorAll("a[href]")].map((link) => link.href).filter((href) => href.includes("/posts/") || href.includes("permalink"));
  return { text, url: links[0] ?? "" };
}).filter((post) => post.text.length >= 80));

const records = posts.map((post) => {
  const externalId = crypto.createHash("sha256").update(post.url || post.text).digest("hex");
  const skills = [...new Set((post.text.match(/(?:React|Vue|Angular|Node(?:\.js)?|TypeScript|JavaScript|Python|Java|Go|PHP|SQL|AWS|Docker|Kubernetes)/gi) ?? []).map((skill) => skill.toLowerCase()))];
  const experience = post.text.match(/(\d+)\s*ปี/)?.[1];
  return { source: "facebook-group", externalId, profileUrl: post.url || groupUrl, fullName: "Facebook group candidate", skills, experienceYears: experience ? Number(experience) : undefined, profileText: post.text, raw: { groupUrl, scrapedAt: new Date().toISOString() } };
});

const response = await fetch(sink, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${sinkKey}` }, body: JSON.stringify({ records }) });
if (!response.ok) throw new Error(`Discovery sink failed: ${response.status}`);
console.log(JSON.stringify({ source: "facebook-group", scanned: posts.length, submitted: records.length }));
await browser.close();
