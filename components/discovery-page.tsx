"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { JobRecord } from "@/application/job-service";
import type { DiscoveryCandidateRecord } from "@/server/discovery-repository";
import { approveDiscoveryResult, runDiscovery, updateDiscoveryDecision } from "../app/discovery/actions";
import { AppShell, Header, Sidebar } from "./talentflow";

type CandidateSource = "referral" | "manual" | "discovery" | "import";

type DiscoveryCandidate = DiscoveryCandidateRecord & {
  id: string;
  fullName: string;
  initials: string;
  role: string;
  company: string;
};

type CandidateDecision = "interview" | "review" | "rejected";

const decisionDetails: Record<CandidateDecision, { label: string; message: string }> = {
  interview: { label: "อนุมัติเพื่อสัมภาษณ์", message: "อนุมัติผู้สมัครเพื่อเข้าสู่ขั้นตอนสัมภาษณ์แล้ว" },
  review: { label: "รอการตรวจสอบ", message: "เก็บผู้สมัครไว้รอการตรวจสอบเพิ่มเติมแล้ว" },
  rejected: { label: "ปฏิเสธ", message: "ปฏิเสธผู้สมัครแล้ว และนำออกจากรายการที่ต้องดำเนินการต่อ" },
};

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#c2c6d9] bg-white px-4 py-2 text-sm font-semibold text-[#004cca] transition hover:bg-[#dbe1ff]/40";
const field =
  "mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2.5 text-sm text-[#191c1e]";

export function DiscoveryPage({ jobs, initialCandidates }: { jobs: JobRecord[]; initialCandidates: DiscoveryCandidateRecord[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimumScore, setMinimumScore] = useState("0");
  const [sourceFilter, setSourceFilter] = useState<"all" | CandidateSource>("all");
  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);
  const [searchedJobId, setSearchedJobId] = useState<string | null>(null);
  const [searchConfirmationOpen, setSearchConfirmationOpen] = useState(false);
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, CandidateDecision>>({});
  const searchConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minimumYears, setMinimumYears] = useState("0");
  const [runState, setRunState] = useState<"idle" | "running" | "done">("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Array<{ source: string; externalId: string; profileUrl: string; fullName: string; role?: string; company?: string; skills: string[]; score: number; evidence: string[]; concerns: string[] }>>([]);
  const [approvedResults, setApprovedResults] = useState<Record<string, string>>({});

  const openJobs = jobs.filter((job) => job.status === "open");
  const selectedJob = openJobs.find((job) => job.id === selectedJobId);
  useEffect(() => { if (selectedJob) { setJobDescription(selectedJob.description); setSkillsInput(""); setMinimumYears("0"); } }, [selectedJob]);
  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const scoreFloor = Number(minimumScore);

  const rankedResults = useMemo(
    () =>
      candidates.filter((candidate) => !selectedJobId || candidate.jobId === selectedJobId).map((candidate) => ({ ...candidate, initials: candidate.fullName.slice(0, 2) }))
        .filter((candidate) => {
          const searchableText = [
            candidate.fullName,
            candidate.role,
            candidate.company,
            ...candidate.skills,
          ]
            .join(" ")
            .toLocaleLowerCase();

          const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
          const matchesScore = candidate.score === null ? scoreFloor === 0 : candidate.score >= scoreFloor;
          const matchesSource = sourceFilter === "all" || candidate.source === sourceFilter;
          return matchesSearch && matchesScore && matchesSource;
        })
        .sort((left, right) => (right.score ?? -1) - (left.score ?? -1)),
    [candidates, scoreFloor, searchTerm, sourceFilter, selectedJobId],
  );

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

  function confirmSearch() {
    if (!selectedJobId) return;
    setSearchConfirmationOpen(false);
    setRunState("running");
    startTransition(async () => {
      const result = await runDiscovery({ jobId: selectedJobId, title: selectedJob?.title ?? "", jobDescription, skills: skillsInput.split(",").map((item) => item.trim()).filter(Boolean), minimumYears: Number(minimumYears) });
      if (result.error || !result.data) { setRunState("idle"); setActionError(result.error ? `${result.error.message} (รหัสคำขอ ${result.error.requestId})` : "ไม่สามารถเริ่มการค้นหาได้"); return; }
      setRunId(result.data.runId); setRunResults(result.data.results.map((item) => ({ source: item.source, externalId: item.externalId, profileUrl: item.profileUrl, fullName: item.fullName, role: item.role, company: item.company, skills: item.skills, score: item.normalizedProfile.score, evidence: item.normalizedProfile.evidence, concerns: item.normalizedProfile.concerns }))); setRunState("done"); setSearchedJobId(selectedJobId); setActionError(null);
    });
  }

  function approveResult(result: typeof runResults[number]) {
    if (!runId || !selectedJobId) return;
    startTransition(async () => { const response = await approveDiscoveryResult({ runId, externalId: result.externalId, jobId: selectedJobId, idempotencyKey: `discovery-${runId}-${result.externalId}` }); if (response.error) setActionError(`${response.error.message} (รหัสคำขอ ${response.error.requestId})`); else setApprovedResults((current) => ({ ...current, [result.externalId]: response.data?.applicationId ?? "approved" })); });
  }

  function updateCandidateDecision(candidate: DiscoveryCandidate, decision: CandidateDecision) {
    startTransition(async () => {
      const result = await updateDiscoveryDecision({ applicationId: candidate.applicationId, expectedVersion: candidate.version, decision });
      if (result.error) {
        setActionError(`${result.error.message} (รหัสคำขอ ${result.error.requestId})`);
        return;
      }
      setActionError(null);
      setCandidates((current) => current.map((item) => item.applicationId === candidate.applicationId ? { ...item, version: result.data.version } : item));
      setCandidateDecisions((currentDecisions) => ({ ...currentDecisions, [candidate.id]: decision }));
    });
  }

  return (
    <AppShell>
      <Sidebar activePath="/discovery" />
      <Header showSearch searchValue={searchQuery} onSearch={setSearchQuery} />
      <main className="mx-auto min-h-screen min-w-0 max-w-7xl space-y-8 px-4 py-6 md:ml-[260px] md:px-8 md:py-8">
        <section aria-labelledby="discovery-heading" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
            {selectedJob && <div className="mt-4 grid max-w-3xl gap-3 rounded-xl border border-[#c2c6d9] bg-white p-4 text-sm shadow-sm">
              <label className="font-semibold">เกณฑ์และรายละเอียดตำแหน่งงาน<textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className={`${field} min-h-24`} aria-label="รายละเอียดตำแหน่งงาน" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="font-semibold">ทักษะที่ต้องการ<input value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} className={field} aria-label="ทักษะที่ต้องการ" placeholder="เช่น TypeScript, React" /></label><label className="font-semibold">ประสบการณ์ขั้นต่ำ (ปี)<input type="number" min="0" max="60" value={minimumYears} onChange={(event) => setMinimumYears(event.target.value)} className={field} aria-label="ประสบการณ์ขั้นต่ำ" /></label></div>
              <p className="text-xs text-[#565e74]">ระบบจะสร้างคำค้นจากรายละเอียดและทักษะ แล้วเรียกแหล่งข้อมูลที่ตั้งค่าไว้จริง</p>
            </div>}
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen((isOpen) => !isOpen)}
              aria-expanded={filterOpen}
              aria-controls="discovery-filters"
              className={secondaryButton}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">tune</span>
              ตัวกรอง
            </button>
            <button type="button" onClick={startSearch} disabled={!selectedJobId || runState === "running"} className={primaryButton}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">refresh</span>
              {runState === "running" ? "กำลังค้นหา…" : "เริ่มค้นหา"}
            </button>
          </div>
        </section>

        {runState === "done" && <section aria-labelledby="discovery-run-results" className="rounded-xl border border-[#c2c6d9] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><h2 id="discovery-run-results" className="text-xl font-bold">ผลลัพธ์จากแหล่งข้อมูล</h2><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบ evidence ก่อนอนุมัติเข้า Applicant Tracker</p></div><span className="text-sm font-semibold text-[#565e74]">พบ {runResults.length} คน</span></div>
          <div className="mt-4 grid gap-4">{runResults.map((result) => <article key={result.externalId} className="rounded-lg border border-[#e0e3e5] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold">{result.fullName}</h3><p className="text-sm text-[#565e74]">{result.role ?? "ไม่ระบุ"} · {result.company ?? "ไม่ระบุ"}</p><a className="text-xs text-[#004cca] underline" href={result.profileUrl} target="_blank" rel="noreferrer">เปิดแหล่งข้อมูล</a></div><div className="flex items-center gap-3"><strong className="rounded-full bg-[#dbe1ff] px-3 py-1 text-[#004cca]">{result.score}/100</strong><button type="button" className={secondaryButton} disabled={Boolean(approvedResults[result.externalId])} onClick={() => approveResult(result)}>{approvedResults[result.externalId] ? "อนุมัติแล้ว" : "อนุมัติเข้า Tracker"}</button></div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><h4 className="font-semibold">หลักฐาน</h4><ul className="mt-1 list-disc pl-5">{result.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h4 className="font-semibold">ข้อควรตรวจสอบ</h4><ul className="mt-1 list-disc pl-5">{(result.concerns.length ? result.concerns : ["ไม่พบข้อควรตรวจสอบเพิ่มเติม"]).map((item) => <li key={item}>{item}</li>)}</ul></div></div></article>)}</div>
        </section>}

        <section aria-label="ตั้งค่าการค้นหา">
          {filterOpen && (
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
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | CandidateSource)} className={`${field} ml-0`}>
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
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="ranked-results-heading" className="text-xl font-bold sm:text-2xl">ผลลัพธ์ที่จัดอันดับ</h2>
              <p className="mt-1 text-sm text-[#565e74]">เรียงจากคะแนนความเหมาะสมสูงสุด พร้อมหลักฐานและข้อควรตรวจสอบ</p>
            </div>
            <span className="text-sm font-semibold text-[#565e74]">พบ {rankedResults.length} คน</span>
          </div>

          {rankedResults.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#c2c6d9] bg-white p-8 text-center text-sm text-[#565e74]">ไม่พบผู้สมัครตามเงื่อนไขการค้นหา</div>
          ) : (
            <div className="mt-4 grid grid-cols-12 gap-6">
              {rankedResults.map((candidate) => (
                <article key={candidate.id} className="col-span-12 overflow-hidden rounded-xl border border-[#c2c6d9] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <header className="flex flex-col gap-4 border-b border-[#e0e3e5] bg-[#f2f4f6] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#dae2fd] text-lg font-bold text-[#004cca] shadow-sm sm:h-16 sm:w-16 sm:text-xl">
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
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#565e74]">
                          <span className="font-semibold">แหล่งที่มา: {candidate.source === "referral" ? "การแนะนำ" : "ค้นพบโดยตรง"}</span>
                          {candidate.referrerName && (
                            <button
                              type="button"
                              onClick={() => setExpandedReferralId((currentId) => currentId === candidate.id ? null : candidate.id)}
                              aria-expanded={expandedReferralId === candidate.id}
                              className="rounded-full border border-[#004cca] px-2.5 py-1 font-semibold text-[#004cca] hover:bg-[#dbe1ff]"
                            >
                              {expandedReferralId === candidate.id ? "ซ่อนชื่อผู้แนะนำ" : "ดูชื่อผู้แนะนำ"}
                            </button>
                          )}
                        </div>
                        {candidate.referrerName && expandedReferralId === candidate.id && <p className="mt-2 text-sm font-semibold text-[#004cca]">แนะนำโดย: {candidate.referrerName}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 self-start sm:block sm:text-right">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#004cca] bg-[#dbe1ff]/50 text-xl font-bold text-[#004cca] sm:ml-auto sm:h-16 sm:w-16 sm:text-2xl">{candidate.score}</div>
                      <p className="text-xs font-semibold text-[#565e74]">คะแนนความเหมาะสม</p>
                    </div>
                  </header>

                  <div className="grid divide-y divide-[#e0e3e5] md:grid-cols-3 md:divide-x md:divide-y-0">
                    <section className="p-5 sm:p-6">
                      <h4 className="flex items-center gap-2 font-semibold"><span aria-hidden="true" className="material-symbols-outlined text-[#004cca]">fact_check</span>หลักฐานที่พบ</h4>
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.evidence.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#22c55e]">check_circle</span><span>{item}</span></li>)}</ul>
                    </section>
                    <section className="bg-[#ffdad6]/20 p-5 sm:p-6">
                      <h4 className="flex items-center gap-2 font-semibold text-[#ba1a1a]"><span aria-hidden="true" className="material-symbols-outlined">warning</span>ข้อควรตรวจสอบ</h4>
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.concerns.map((item) => <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-[#737687]">info</span><span>{item}</span></li>)}</ul>
                    </section>
                    <section className="flex flex-col justify-center gap-3 bg-[#f2f4f6] p-5 sm:p-6" aria-label={`การตัดสินใจสำหรับ ${candidate.fullName}`}>
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
                        onClick={() => updateCandidateDecision(candidate, "review")}
                        aria-pressed={candidateDecisions[candidate.id] === "review"}
                        className={`${secondaryButton} w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] ${candidateDecisions[candidate.id] === "review" ? "ring-2 ring-[#004cca] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">help</span>{decisionDetails.review.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate, "rejected")}
                        aria-pressed={candidateDecisions[candidate.id] === "rejected"}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ba1a1a] px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition hover:bg-[#ffdad6]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba1a1a] ${candidateDecisions[candidate.id] === "rejected" ? "ring-2 ring-[#ba1a1a] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_down</span>{decisionDetails.rejected.label}
                      </button>
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
