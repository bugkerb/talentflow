"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JobRecord } from "@/application/job-service";
import { approveDiscoveryResult, runDemoDiscovery, runDiscovery } from "../app/discovery/actions";
import { AppShell, Header, Sidebar } from "./talentflow";
import { demoDiscoveryResults } from "@/application/discovery/demo-data";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#c2c6d9] bg-white px-4 py-2 text-sm font-semibold text-[#004cca] transition hover:bg-[#dbe1ff]/40";
const field =
  "mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2.5 text-sm text-[#191c1e]";
type CandidateDecision = "interview" | "rejected";
const decisionDetails: Record<CandidateDecision, { label: string; message: string }> = { interview: { label: "อนุมัติเพื่อสัมภาษณ์", message: "อนุมัติผู้สมัครเพื่อเข้าสู่ขั้นตอนสัมภาษณ์แล้ว" }, rejected: { label: "ปฏิเสธ", message: "ปฏิเสธผู้สมัครแล้ว" } };
type LegacyCandidate = { id: string; fullName: string; initials: string; role: string; company: string; skills: string[]; score: number; evidence: string[]; concerns: string[]; applicationId: string; version: number };
type DiscoveryResult = (typeof demoDiscoveryResults)[number];
type DiscoveryViewResult = { source: string; externalId: string; profileUrl: string; fullName: string; role?: string; company?: string; skills: string[]; score: number; evidence: string[]; concerns: string[]; location?: string; education?: string; expectedSalary?: string; experience?: string };

export function DiscoveryPage({ jobs }: { jobs: JobRecord[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [minimumScore, setMinimumScore] = useState("0");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchedJobId, setSearchedJobId] = useState<string | null>(null);
  const [searchConfirmationOpen, setSearchConfirmationOpen] = useState(false);
  const searchConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, CandidateDecision>>({});
  const [jobDescription, setJobDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minimumYears, setMinimumYears] = useState("0");
  const [runState, setRunState] = useState<"idle" | "running" | "done">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<DiscoveryViewResult[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [approvedResults, setApprovedResults] = useState<Record<string, string>>({});

  const openJobs = jobs.filter((job) => job.status === "open");
  const selectedJob = openJobs.find((job) => job.id === selectedJobId);
  useEffect(() => { if (selectedJob) { setJobDescription(selectedJob.description); setSkillsInput(""); setMinimumYears("0"); } }, [selectedJob]);
  const rankedResults: LegacyCandidate[] = [];

  useEffect(() => {
    if (!searchConfirmationOpen) return;

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchConfirmButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchConfirmationOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [searchConfirmationOpen]);

  function startSearch() {
    if (selectedJobId) setSearchConfirmationOpen(true);
  }

  function updateCandidateDecision(candidate: LegacyCandidate, decision: CandidateDecision) {
    setCandidateDecisions((current) => ({ ...current, [candidate.id]: decision }));
  }

  function updateResultDecision(result: typeof runResults[number], decision: CandidateDecision) {
    setCandidateDecisions((current) => ({ ...current, [result.externalId]: decision }));
    if (decision === "interview") approveResult(result);
  }

  function confirmSearch() {
    if (!selectedJobId) return;
    setSearchConfirmationOpen(false);
    setRunState("running");
    startTransition(async () => {
      const input = { jobId: selectedJobId, title: selectedJob?.title ?? "", jobDescription, skills: skillsInput.split(",").map((item) => item.trim()).filter(Boolean), minimumYears: Number(minimumYears) };
      const result = demoMode ? await runDemoDiscovery(input) : await runDiscovery(input);
      if (result.error || !result.data) { setRunState("idle"); setActionError(result.error ? `${result.error.message} (รหัสคำขอ ${result.error.requestId})` : "ไม่สามารถเริ่มการค้นหาได้"); return; }
      setRunId(result.data.runId); setRunResults(result.data.results.map((item) => ({ source: item.source, externalId: item.externalId, profileUrl: item.profileUrl, fullName: item.normalizedProfile.ai?.name ?? item.fullName, role: item.normalizedProfile.ai?.currentPosition ?? item.role, company: item.normalizedProfile.ai?.company ?? item.company, skills: item.normalizedProfile.ai?.skills ?? item.skills, score: item.normalizedProfile.ai?.matchScore ?? item.normalizedProfile.score, evidence: item.normalizedProfile.ai?.evidence.keywordMatches ?? item.normalizedProfile.evidence, concerns: item.normalizedProfile.ai?.warnings ?? item.normalizedProfile.concerns, location: item.normalizedProfile.ai?.location ?? (typeof item.raw.location === "string" ? item.raw.location : undefined), education: item.normalizedProfile.ai?.education ?? (typeof item.raw.education === "string" ? item.raw.education : undefined), expectedSalary: item.normalizedProfile.ai?.expectedSalary ?? (typeof item.raw.expectedSalary === "string" ? item.raw.expectedSalary : undefined), experience: item.normalizedProfile.ai?.evidence.experienceSummary ?? (typeof item.raw.experience === "string" ? item.raw.experience : undefined) }))); setRunState("done"); setSearchedJobId(selectedJobId); setActionError(null);
    });
  }

  function approveResult(result: typeof runResults[number]) {
    if (!runId || !selectedJobId) return;
    startTransition(async () => { const response = await approveDiscoveryResult({ runId, externalId: result.externalId, jobId: selectedJobId, idempotencyKey: `discovery-${runId}-${result.externalId}` }); if (response.error) setActionError(`${response.error.message} (รหัสคำขอ ${response.error.requestId})`); else setApprovedResults((current) => ({ ...current, [result.externalId]: response.data?.applicationId ?? "approved" })); });
  }


  return (
    <AppShell>
      <Sidebar activePath="/discovery" />
      <Header showSearch searchValue={searchQuery} onSearch={setSearchQuery} />
      <main className="min-h-screen min-w-0 bg-[#f7f9fb] px-4 py-6 md:ml-[260px] md:px-8 md:py-8">
        <section aria-labelledby="discovery-heading" className="mx-auto mb-8 flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="discovery-heading" className="font-serif text-3xl leading-tight sm:text-4xl">
            ค้นหาผู้สมัคร
            </h1>
            <p className="mt-2 text-sm text-[#565e74]">เลือกตำแหน่งงานก่อนเริ่มค้นหาและประเมินผู้สมัคร</p>
            <label className="mt-4 block max-w-xl text-xs font-bold uppercase tracking-[0.05em] text-[#424656]">
              ตำแหน่งงาน
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className={`${field} mt-2 py-2.5`}
                aria-label="เลือกตำแหน่งงาน"
              >
                <option value="">เลือกตำแหน่งงานที่เปิดรับ</option>
                {openJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </label>
            {selectedJob && <div className="mt-4 grid max-w-3xl gap-4 rounded-xl border border-[#c2c6d9] bg-white p-5 text-sm shadow-sm">
              <div><p className="text-xs font-bold uppercase tracking-[0.05em] text-[#565e74]">กำลังค้นหาสำหรับตำแหน่ง</p><p className="mt-1 text-lg font-bold text-[#191c1e]">{selectedJob.title}</p><p className="mt-1 text-xs text-[#565e74]">เกณฑ์ด้านล่างดึงจากรายละเอียดตำแหน่งงาน เพื่อให้ผลค้นหาผูกกับตำแหน่งนี้โดยตรง</p></div>
              <label className="font-semibold">เกณฑ์และรายละเอียดตำแหน่งงาน<textarea value={jobDescription} readOnly className={`${field} min-h-24 bg-[#f8f9fb]`} aria-label="รายละเอียดตำแหน่งงาน" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="font-semibold">ทักษะที่ต้องการ<input value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} className={field} aria-label="ทักษะที่ต้องการ" placeholder="เช่น TypeScript, React" /></label><label className="font-semibold">ประสบการณ์ขั้นต่ำ (ปี)<input type="number" min="0" max="60" value={minimumYears} onChange={(event) => setMinimumYears(event.target.value)} className={field} aria-label="ประสบการณ์ขั้นต่ำ" /></label></div>
              <div className="rounded-lg bg-[#f2f4f6] p-3"><p className="font-semibold text-[#191c1e]">แหล่งข้อมูลที่จะค้นหา</p><p className="mt-1 flex items-center gap-2 text-xs text-[#565e74]"><span className="h-2 w-2 rounded-full bg-[#16a34a]" aria-hidden="true" />Facebook Group ที่เชื่อมต่อไว้</p></div>
              <p className="text-xs text-[#565e74]">ระบบจะให้ AI วิเคราะห์เกณฑ์ → สร้างคำค้น → ค้นหาจาก Facebook → normalize และจัดอันดับก่อนแสดงให้ HR ตรวจสอบ</p>
            </div>}
            <label className="mt-4 flex max-w-xl cursor-pointer items-center justify-between rounded-lg border border-[#c2c6d9] bg-white p-3 text-sm shadow-sm">
              <span><span className="block font-semibold text-[#191c1e]">โหมดทดสอบการค้นหา</span><span className="mt-1 block text-xs text-[#565e74]">สร้างผลลัพธ์ตัวอย่าง 3 คนเข้า database จริง โดยไม่เรียกแหล่งข้อมูลภายนอก</span></span>
              <input type="checkbox" role="switch" aria-label="โหมดจำลองการค้นหา" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)} className="h-5 w-5 accent-[#0062ff]" />
            </label>
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={startSearch} disabled={!selectedJobId || runState === "running"} className={primaryButton}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">refresh</span>
              {runState === "running" ? "กำลังค้นหา…" : "เริ่มค้นหา"}
            </button>
          </div>
        </section>

        {runState === "done" && <section aria-labelledby="discovery-run-results" className="mx-auto w-full max-w-7xl rounded-xl border border-[#c2c6d9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 id="discovery-run-results" className="text-xl font-bold">ผลลัพธ์จากแหล่งข้อมูล</h2><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบ evidence ก่อนอนุมัติเข้า Applicant Tracker</p></div><span className="text-sm font-semibold text-[#565e74]">พบ {runResults.length} คน</span></div>
          <div className="mt-6 grid gap-6">{runResults.map((result) => <article key={result.externalId} className="overflow-hidden rounded-xl border border-[#c2c6d9] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><header className="flex flex-col items-start justify-between gap-5 border-b border-[#e0e3e5] bg-[#f7f9fb] p-6 sm:flex-row"><div className="flex min-w-0 items-center gap-5"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#dae2fd] text-xl font-bold text-[#004cca] shadow-sm">{result.fullName.slice(0, 2)}</div><div className="min-w-0"><h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">{result.fullName}<span aria-hidden="true" className="material-symbols-outlined text-sm text-[#004cca]">verified</span></h3><p className="text-sm text-[#565e74]">{result.role ?? "ไม่ระบุ"} · {result.company ?? "ไม่ระบุ"}</p><p className="mt-1 text-xs text-[#565e74]">{(result as DiscoveryResult).location ?? "ไม่ระบุ"} · {(result as DiscoveryResult).education ?? "ไม่ระบุ"} · {(result as DiscoveryResult).expectedSalary ?? "ไม่ระบุ"}</p><div className="mt-2 flex flex-wrap gap-2">{result.skills.map((skill) => <span key={skill} className="rounded-full border border-[#005e80]/20 bg-[#c4e7ff]/40 px-2.5 py-0.5 text-xs font-semibold text-[#005e80]">{skill}</span>)}</div></div></div><div className="flex shrink-0 items-center gap-3 self-start sm:block sm:text-right"><div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#004cca] bg-[#dbe1ff]/50 text-xl font-bold text-[#004cca]">{result.score}</div><p className="text-xs font-semibold text-[#565e74]">คะแนนความเหมาะสม</p></div></header><div className="grid divide-y divide-[#e0e3e5] md:grid-cols-3 md:divide-x md:divide-y-0"><section className="border-b border-[#e0e3e5] bg-white p-6 md:border-b-0 md:border-r"><h4 className="mb-4 flex items-center gap-2 text-sm font-bold"><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none text-[#004cca]">fact_check</span>หลักฐานที่พบ</h4><ul className="space-y-3 text-sm text-[#424656]">{result.evidence.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#22c55e]">check_circle</span><span>{item}</span></li>)}</ul><p className="mt-4 border-t border-[#e0e3e5] pt-3 text-xs text-[#565e74]"><strong>ประสบการณ์:</strong> {(result as DiscoveryResult).experience ?? "ไม่ระบุ"}</p></section><section className="border-b border-[#e0e3e5] bg-white p-6 md:border-b-0 md:border-r"><h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#191c1e]"><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none text-[#ba1a1a]">warning</span>ข้อควรตรวจสอบ</h4><ul className="space-y-3 text-sm text-[#424656]">{(result.concerns.length ? result.concerns : ["ไม่พบข้อควรตรวจสอบเพิ่มเติม"]).map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#737687]">info</span><span>{item}</span></li>)}</ul></section><section className="flex flex-col justify-center bg-white p-6" aria-label={`การตัดสินใจสำหรับ ${result.fullName}`}>{candidateDecisions[result.externalId] && <p role="status" aria-live="polite" className="mb-3 rounded-lg bg-[#dbe1ff] p-3 text-sm font-semibold text-[#00174b]">{decisionDetails[candidateDecisions[result.externalId] as CandidateDecision].message}</p>}<div className="flex w-full flex-col gap-3"><button type="button" onClick={() => updateResultDecision(result, "interview")} aria-pressed={candidateDecisions[result.externalId] === "interview"} className={`${primaryButton} w-full ${candidateDecisions[result.externalId] === "interview" ? "ring-2 ring-[#004cca] ring-offset-2" : ""}`}><span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_up</span>{approvedResults[result.externalId] ? "อนุมัติแล้ว" : "อนุมัติเพื่อสัมภาษณ์"}</button><button type="button" onClick={() => updateResultDecision(result, "rejected")} aria-pressed={candidateDecisions[result.externalId] === "rejected"} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ba1a1a] px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition hover:bg-[#ffdad6]/30 ${candidateDecisions[result.externalId] === "rejected" ? "ring-2 ring-[#ba1a1a] ring-offset-2" : ""}`}><span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_down</span>ปฏิเสธ</button></div></section></div></article>)}</div>
        </section>}

        <section aria-label="ตั้งค่าการค้นหา">
          {false && (
            <div id="discovery-filters" className="grid gap-4 border-t border-[#e0e3e5] pt-4 sm:grid-cols-2" role="region" aria-label="ตัวกรองผลลัพธ์">
              <label className="mb-0 block text-sm font-semibold">
                คะแนนขั้นต่ำ
                <select value={minimumScore} onChange={(event) => setMinimumScore(event.target.value)} className={`${field} ml-0`}>
                  <option value="0">ทุกคะแนน</option>
                  <option value="80">80 ขึ้นไป</option>
                  <option value="90">90 ขึ้นไป</option>
                </select>
              </label>
              <label className="mb-0 block text-sm font-semibold">
                แหล่งที่มา
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className={`${field} ml-0`}>
                  <option value="all">ทุกแหล่งที่มา</option>
                  <option value="referral">ผู้สมัครที่มีผู้แนะนำ</option>
                  <option value="manual">เพิ่มด้วยตนเอง</option>
                  <option value="discovery">ระบบค้นพบ</option>
                  <option value="import">นำเข้า</option>
                </select>
              </label>
            </div>
          )}

          {openJobs.length === 0 && <p className="mt-4 rounded-lg bg-[#ffdad6]/60 p-3 text-sm text-[#93000a]">ยังไม่มีตำแหน่งงานที่เปิดรับสำหรับการค้นหา</p>}
          {searchedJobId === selectedJobId && selectedJob && <p role="status" aria-live="polite" className="mt-4 rounded-lg bg-[#dbe1ff] p-3 text-sm text-[#00174b]">ค้นหาสำหรับตำแหน่ง {selectedJob.title} แล้ว — ตรวจสอบผลลัพธ์และหลักฐานก่อนอนุมัติ</p>}
        </section>

        {searchConfirmationOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/50 p-4" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="search-confirmation-heading"
              aria-describedby="search-confirmation-description"
              className="w-full max-w-lg rounded-xl border border-[#c2c6d9] bg-white p-6 shadow-2xl"
            >
              <h2 id="search-confirmation-heading" className="text-xl font-bold">เริ่มค้นหาผู้สมัคร</h2>
              <p id="search-confirmation-description" className="mt-3 rounded-lg bg-[#dbe1ff]/60 p-4 text-sm text-[#00174b]">
                ระบบจะค้นหาผู้สมัครสำหรับตำแหน่ง <strong>{selectedJob.title}</strong> และแสดงหลักฐานให้ตรวจสอบก่อนตัดสินใจ
              </p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSearchConfirmationOpen(false)}
                  className={`${secondaryButton} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff]`}
                >
                  ยกเลิก
                </button>
                <button
                  ref={searchConfirmButtonRef}
                  type="button"
                  onClick={confirmSearch}
                  className={`${primaryButton} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff]`}
                >
                  ยืนยันการค้นหา
                </button>
              </div>
            </div>
          </div>
        )}

        <section aria-labelledby="ranked-results-heading">
          {actionError && <p role="alert" className="rounded-lg border border-[#ba1a1a] bg-[#ffdad6]/40 p-3 text-sm text-[#93000a]">{actionError}</p>}
          <div className="sr-only flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="ranked-results-heading" className="text-xl font-bold sm:text-2xl">ผลลัพธ์ที่จัดอันดับ</h2>
              <p className="mt-1 text-sm text-[#565e74]">เรียงจากคะแนนความเหมาะสมสูงสุด พร้อมหลักฐานและข้อควรตรวจสอบ</p>
            </div>
            <span className="text-sm font-semibold text-[#565e74]">พบ {rankedResults.length} คน</span>
          </div>

          {rankedResults.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#c2c6d9] bg-white p-8 text-center text-sm text-[#565e74]">ไม่พบผู้สมัครตามเงื่อนไขการค้นหา</div>
          ) : (
            <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-6">
              {rankedResults.map((candidate) => (
                <article key={candidate.id} className="col-span-12 overflow-hidden rounded-xl border border-[#c2c6d9] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <header className="flex flex-col items-start justify-between gap-5 border-b border-[#e0e3e5] bg-[#f7f9fb] p-6 sm:flex-row">
                    <div className="flex min-w-0 items-center gap-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#dae2fd] text-xl font-bold text-[#004cca] shadow-sm">
                        {candidate.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                          {candidate.fullName}
                          <span aria-label="ยืนยันโปรไฟล์แล้ว" className="material-symbols-outlined text-sm text-[#004cca]">verified</span>
                        </h3>
                        <p className="text-sm text-[#565e74]">{candidate.role} · {candidate.company}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {candidate.skills.map((skill) => <span key={skill} className="rounded-full border border-[#005e80]/20 bg-[#c4e7ff]/40 px-2.5 py-0.5 text-xs font-semibold text-[#005e80]">{skill}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 self-start sm:block sm:text-right">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#004cca] bg-[#dbe1ff]/50 text-xl font-bold text-[#004cca]">{candidate.score}</div>
                      <p className="text-xs font-semibold text-[#565e74]">คะแนนความเหมาะสม</p>
                    </div>
                  </header>

                  <div className="grid divide-y divide-[#e0e3e5] md:grid-cols-3 md:divide-x md:divide-y-0">
                    <section className="border-b border-[#e0e3e5] bg-white p-6 md:border-b-0 md:border-r">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold"><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none text-[#004cca]">fact_check</span>หลักฐานที่พบ</h4>
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.evidence.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#22c55e]">check_circle</span><span>{item}</span></li>)}</ul>
                    </section>
                    <section className="border-b border-[#e0e3e5] bg-white p-6 md:border-b-0 md:border-r">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#191c1e]"><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none text-[#ba1a1a]">warning</span>ข้อควรตรวจสอบ</h4>
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.concerns.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#737687]">info</span><span>{item}</span></li>)}</ul>
                    </section>
                    <section className="flex flex-col justify-center bg-white p-6" aria-label={`การตัดสินใจสำหรับ ${candidate.fullName}`}>
                      <div className="flex w-full flex-col gap-3">
                      {candidateDecisions[candidate.id] && (
                        <p role="status" aria-live="polite" className="rounded-lg bg-[#dbe1ff] p-3 text-sm font-semibold text-[#00174b]">
                          {decisionDetails[candidateDecisions[candidate.id]].message}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate, "interview")}
                        aria-pressed={candidateDecisions[candidate.id] === "interview"}
                        className={`${primaryButton} w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] ${candidateDecisions[candidate.id] === "interview" ? "ring-2 ring-[#004cca] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_up</span>{decisionDetails.interview.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate, "rejected")}
                        aria-pressed={candidateDecisions[candidate.id] === "rejected"}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ba1a1a] px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition hover:bg-[#ffdad6]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba1a1a] ${candidateDecisions[candidate.id] === "rejected" ? "ring-2 ring-[#ba1a1a] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_down</span>{decisionDetails.rejected.label}
                      </button>
                      </div>
                    </section>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
