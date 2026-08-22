import type { DiscoveryQuery, DiscoverySourceAdapter, DiscoverySourceRecord } from "./types";
import { AppError } from "@/server/errors";
export const createPersistedSourceAdapter = (repository: { searchSourceRecords(query: DiscoveryQuery): Promise<DiscoverySourceRecord[]> }): DiscoverySourceAdapter => ({ search: (query) => repository.searchSourceRecords(query) });
export const createHttpSourceAdapter = (options: { endpoint: string; apiKey: string; fetcher?: typeof fetch }): DiscoverySourceAdapter => ({ async search(query) { const response = await (options.fetcher ?? fetch)(options.endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${options.apiKey}` }, body: JSON.stringify(query) }); if (!response.ok) throw new Error(`Discovery source provider failed with status ${response.status}`); const body = await response.json() as { records?: DiscoverySourceRecord[] }; if (!Array.isArray(body.records)) throw new Error("Discovery source provider returned invalid records"); return body.records; } });

export const createConfiguredDiscoveryAdapter = (): DiscoverySourceAdapter => {
  const endpoint = process.env.DISCOVERY_SEARCH_ENDPOINT?.trim();
  const apiKey = process.env.DISCOVERY_SOURCE_API_KEY?.trim();
  if (!endpoint || !apiKey) return { search: async () => { throw new AppError("DATABASE_ERROR", "ยังไม่ได้ตั้งค่าแหล่งข้อมูลภายนอก: search worker สำหรับค้นหาผู้สมัครแบบ live"); } };
  return createHttpSourceAdapter({ endpoint, apiKey });
};
