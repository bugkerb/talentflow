interface Env {
  DISCOVERY_SOURCE_API_KEY: string;
  FACEBOOK_GROUP_URL: string;
  FACEBOOK_STORAGE_STATE_JSON?: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_BROWSER_RENDERING_API_TOKEN: string;
  MAX_POSTS?: string;
}

interface SearchInput {
  terms?: unknown;
  minimumYears?: unknown;
}

interface CandidateRecord {
  source: "facebook-group";
  externalId: string;
  profileUrl: string;
  fullName: string;
  skills: string[];
  experienceYears?: number;
  profileText: string;
  raw: { groupUrl: string; searchedAt: string };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const normalizeTerms = (terms: unknown) =>
  [...new Set((Array.isArray(terms) ? terms : [])
    .filter((term): term is string => typeof term === "string")
    .map((term) => term.trim().toLocaleLowerCase())
    .filter((term) => term.length >= 3))].slice(0, 40);

const parseYears = (text: string) => {
  const match = text.match(/(\d+)\s*ปี/);
  return match ? Number(match[1]) : 0;
};

const stripHtml = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const storageCookies = (storageState: string | undefined) => {
  if (!storageState) return [];
  const parsed = JSON.parse(storageState) as { cookies?: Array<Record<string, unknown>> };
  return (parsed.cookies ?? []).filter((cookie) => typeof cookie.name === "string" && typeof cookie.value === "string").map((cookie) => ({ name: cookie.name as string, value: cookie.value as string, ...(typeof cookie.domain === "string" ? { domain: cookie.domain } : {}), ...(typeof cookie.path === "string" ? { path: cookie.path } : {}) }));
};

const searchPosts = async (env: Env, input: SearchInput): Promise<CandidateRecord[]> => {
  const terms = normalizeTerms(input.terms);
  if (terms.length === 0) return [];
  const minimumYears = Math.max(0, Math.min(50, Number(input.minimumYears ?? 0) || 0));
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`;
  const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${env.CLOUDFLARE_BROWSER_RENDERING_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ url: env.FACEBOOK_GROUP_URL, cookies: storageCookies(env.FACEBOOK_STORAGE_STATE_JSON), gotoOptions: { waitUntil: "networkidle", timeout: 30_000 } }) });
  if (!response.ok) throw new Error(`Browser Rendering REST failed with status ${response.status}`);
  const body = await response.json() as { success?: boolean; result?: string };
  if (!body.success || typeof body.result !== "string") throw new Error("Browser Rendering REST returned invalid content");
  const posts = [...body.result.matchAll(/<div[^>]*role=["']article["'][^>]*>([\s\S]*?)(?=<div[^>]*role=["']article["']|<\/body>|$)/gi)].map((match) => ({ text: stripHtml(match[1]), url: "" })).filter((post) => post.text.length >= 40);
  const candidates = posts;
  const maxPosts = Math.max(1, Math.min(200, Number(env.MAX_POSTS ?? 80) || 80));
  const records: CandidateRecord[] = [];
  for (const post of candidates.slice(0, maxPosts)) {
    const lower = post.text.toLocaleLowerCase();
    const textTokens = new Set(lower.split(/[^\p{L}\p{N}+#.]+/u).filter((token) => token.length >= 3));
    if (!terms.some((term) => textTokens.has(term)) || parseYears(post.text) < minimumYears) continue;
    const externalId = await sha256(post.url || post.text);
    const experienceYears = parseYears(post.text) || undefined;
    const skills = [...new Set((post.text.match(/(?:React|Vue|Angular|Node(?:\.js)?|TypeScript|JavaScript|Python|Java|Go|PHP|SQL|AWS|Docker|Kubernetes)/gi) ?? []).map((skill) => skill.toLowerCase()))];
    records.push({ source: "facebook-group", externalId, profileUrl: post.url || env.FACEBOOK_GROUP_URL, fullName: "Facebook group candidate", skills, experienceYears, profileText: post.text, raw: { groupUrl: env.FACEBOOK_GROUP_URL, searchedAt: new Date().toISOString() } });
  }
  return records;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") return json({ status: "ok", service: "talentflow-facebook-search" });
    if (request.method !== "POST" || url.pathname !== "/search") return json({ error: "Not found" }, 404);
    if (request.headers.get("authorization") !== `Bearer ${env.DISCOVERY_SOURCE_API_KEY}`) return json({ error: "Unauthorized" }, 401);
    try {
      const body = await request.json() as SearchInput;
      return json({ records: await searchPosts(env, body) });
    } catch (error) {
      console.error("facebook_search_failed", error instanceof Error ? error.message : "unknown");
      return json({ error: "Search failed" }, 502);
    }
  },
};
