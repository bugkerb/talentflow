import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";

const groupUrl = process.env.FACEBOOK_GROUP_URL;
const storageState = process.env.FACEBOOK_STORAGE_STATE_PATH;
const storageStateJson = process.env.FACEBOOK_STORAGE_STATE_JSON;
const cdpEndpoint = process.env.FACEBOOK_CDP_ENDPOINT;
const workerKey = process.env.DISCOVERY_SOURCE_API_KEY;
const port = Number(process.env.PORT ?? 8787);

if (!groupUrl || (!cdpEndpoint && !storageState && !storageStateJson) || !workerKey) {
  throw new Error("Set FACEBOOK_GROUP_URL, FACEBOOK_CDP_ENDPOINT or storage state and DISCOVERY_SOURCE_API_KEY");
}

const readBody = async (request) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (body.length > 100_000) throw new Error("Request body too large");
  return JSON.parse(body);
};

const searchPosts = async ({ terms, minimumYears }) => {
  const normalizedTerms = [...new Set((Array.isArray(terms) ? terms : []).filter((term) => typeof term === "string").map((term) => term.trim().toLocaleLowerCase()).filter((term) => term.length >= 3))].slice(0, 40);
  if (!normalizedTerms.length) return [];
  const browser = cdpEndpoint ? await chromium.connectOverCDP(cdpEndpoint) : await chromium.launch({ headless: true });
  try {
    const context = cdpEndpoint ? browser.contexts()[0] : await browser.newContext({ storageState: storageStateJson ? JSON.parse(storageStateJson) : storageState, locale: "th-TH" });
    if (!context) throw new Error("CDP browser has no active context");
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(groupUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1_500);
    for (let index = 0; index < 6; index += 1) {
      await page.mouse.wheel(0, 1_600);
      await page.waitForTimeout(700);
    }
    const posts = await page.locator("div[role=article]").evaluateAll((articles) => articles.map((article) => {
      const text = article.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const links = [...article.querySelectorAll("a[href]")].map((link) => link.href).filter((href) => href.includes("/posts/") || href.includes("permalink"));
      return { text, url: links[0] ?? "" };
    }).filter((post) => post.text.length >= 80));

    return posts.filter((post) => {
      const text = post.text.toLocaleLowerCase();
      const matchesTerm = normalizedTerms.some((term) => text.includes(term));
      const years = Number(post.text.match(/(\d+)\s*ปี/)?.[1] ?? 0);
      return matchesTerm && years >= Number(minimumYears ?? 0);
    }).map((post) => {
      const externalId = crypto.createHash("sha256").update(post.url || post.text).digest("hex");
      const skills = [...new Set((post.text.match(/(?:React|Vue|Angular|Node(?:\.js)?|TypeScript|JavaScript|Python|Java|Go|PHP|SQL|AWS|Docker|Kubernetes)/gi) ?? []).map((skill) => skill.toLowerCase()))];
      const experience = post.text.match(/(\d+)\s*ปี/)?.[1];
      return { source: "facebook-group", externalId, profileUrl: post.url || groupUrl, fullName: "Facebook group candidate", skills, experienceYears: experience ? Number(experience) : undefined, profileText: post.text, raw: { groupUrl, searchedAt: new Date().toISOString() } };
    });
  } finally {
    if (cdpEndpoint) browser.disconnect();
    else await browser.close();
  }
};

const server = http.createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method === "GET" && request.url === "/healthz") { response.statusCode = 200; response.end(JSON.stringify({ status: "ok", service: "facebook-group-search-worker" })); return; }
  if (request.method !== "POST" || request.url !== "/search") { response.statusCode = 404; response.end(JSON.stringify({ error: "Not found" })); return; }
  if (request.headers.authorization !== `Bearer ${workerKey}`) { response.statusCode = 401; response.end(JSON.stringify({ error: "Unauthorized" })); return; }
  try {
    const input = await readBody(request);
    const records = await searchPosts(input);
    response.statusCode = 200;
    response.end(JSON.stringify({ records }));
  } catch (error) {
    console.error("facebook_search_failed", error instanceof Error ? error.message : "unknown error");
    response.statusCode = 400;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }));
  }
});

server.listen(port, process.env.HOST ?? "0.0.0.0", () => console.log(`Facebook search worker listening on port ${port}`));
