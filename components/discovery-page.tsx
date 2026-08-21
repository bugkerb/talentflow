"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobRecord } from "@/application/job-service";
import { AppShell, Header, Sidebar } from "./talentflow";

type CandidateSource = "referral" | "direct";

type DiscoveryCandidate = {
  id: string;
  fullName: string;
  initials: string;
  role: string;
  company: string;
  score: number;
  skills: readonly string[];
  evidence: readonly string[];
  concerns: readonly string[];
  source: CandidateSource;
  referrerName?: string;
};

type CandidateDecision = "interview" | "review" | "rejected";

const decisionDetails: Record<CandidateDecision, { label: string; message: string }> = {
  interview: { label: "อนุมัติเพื่อสัมภาษณ์", message: "อนุมัติผู้สมัครเพื่อเข้าสู่ขั้นตอนสัมภาษณ์แล้ว" },
  review: { label: "รอการตรวจสอบ", message: "เก็บผู้สมัครไว้รอการตรวจสอบเพิ่มเติมแล้ว" },
  rejected: { label: "ปฏิเสธ", message: "ปฏิเสธผู้สมัครแล้ว และนำออกจากรายการที่ต้องดำเนินการต่อ" },
};

const candidateFixtures: readonly DiscoveryCandidate[] = [
  {
    id: "kittipong",
    fullName: "กิตติพงษ์ วิริยะ",
    initials: "กพ",
    role: "Senior Frontend Developer",
    company: "TechCorp",
    score: 94,
    skills: ["React", "TypeScript", "System Design"],
    evidence: [
      "ประสบการณ์ตรง 5 ปีในการสร้างระบบด้วย React",
      "ผ่าน Technical Test ระดับยอดเยี่ยม 95%",
      "ร่วมพัฒนา Open Source ระดับองค์กร",
    ],
    concerns: [
      "ประสบการณ์จัดการทีมขนาดใหญ่ยังจำกัด",
      "คาดหวังเงินเดือนสูงกว่าโครงสร้าง 10%",
    ],
    source: "referral",
    referrerName: "พิมพ์ชนก ศรีสุวรรณ",
  },
  {
    id: "araya",
    fullName: "อารยา นำโชค",
    initials: "อน",
    role: "Frontend Engineer",
    company: "WebSolutions",
    score: 78,
    skills: ["Vue.js", "JavaScript", "UI/UX"],
    evidence: [
      "ผลงานโดดเด่นด้านการออกแบบ UI/UX",
      "ประสบการณ์ทำงาน 3 ปีกับโปรเจกต์ E-commerce",
    ],
    concerns: [
      "ขาดประสบการณ์ด้าน React ซึ่งเป็น Core Tech Stack",
      "ระยะเวลาการทำงานที่เก่าสั้น ควรตรวจสอบเพิ่มเติม",
    ],
    source: "direct",
  },
];

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#c2c6d9] bg-white px-4 py-2 text-sm font-semibold text-[#004cca] transition hover:bg-[#dbe1ff]/40";
const field =
  "mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2.5 text-sm text-[#191c1e]";

export function DiscoveryPage({ jobs }: { jobs: JobRecord[] }) {
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

  const openJobs = jobs.filter((job) => job.status === "open");
  const selectedJob = openJobs.find((job) => job.id === selectedJobId);
  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const scoreFloor = Number(minimumScore);

  const rankedResults = useMemo(
    () =>
      [...candidateFixtures]
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
          const matchesScore = candidate.score >= scoreFloor;
          const matchesSource = sourceFilter === "all" || candidate.source === sourceFilter;
          return matchesSearch && matchesScore && matchesSource;
        })
        .sort((left, right) => right.score - left.score),
    [scoreFloor, searchTerm, sourceFilter],
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
    setSearchedJobId(selectedJobId);
    setSearchConfirmationOpen(false);
  }

  function updateCandidateDecision(candidateId: string, decision: CandidateDecision) {
    setCandidateDecisions((currentDecisions) => ({ ...currentDecisions, [candidateId]: decision }));
  }

  return (
    <AppShell>
      <Sidebar activePath="/discovery" />
      <Header />
      <main className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 md:ml-[260px] md:px-6">
        <section aria-labelledby="discovery-heading">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#004cca]">TalentFlow</p>
          <h1 id="discovery-heading" className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
            ค้นหาผู้สมัคร
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#565e74]">
            เลือกตำแหน่งงาน ค้นหาผู้สมัครที่เหมาะสม และตรวจสอบหลักฐานก่อนตัดสินใจ
          </p>
        </section>

        <section className="rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] sm:p-6" aria-label="ตั้งค่าการค้นหา">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
            <label className="mb-0 block text-sm font-semibold">
              ค้นหาทักษะหรือชื่อผู้สมัคร
              <span className="relative mt-2 block">
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#737687]">
                  search
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={`${field} pl-10`}
                  placeholder="เช่น React, TypeScript, กิตติพงษ์"
                  aria-label="ค้นหาทักษะหรือชื่อผู้สมัคร"
                />
              </span>
            </label>
            <label className="mb-0 block text-sm font-semibold">
              ตำแหน่งงาน
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className={`${field} ml-0`}
                aria-label="เลือกตำแหน่งงาน"
              >
                <option value="">เลือกตำแหน่งงานที่เปิดรับ</option>
                {openJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#e0e3e5] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
            <button type="button" onClick={startSearch} disabled={!selectedJobId} className={`${primaryButton} w-full sm:w-auto`}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">refresh</span>
              เริ่มค้นหา
            </button>
          </div>

          {filterOpen && (
            <div id="discovery-filters" className="mt-4 grid gap-4 border-t border-[#e0e3e5] pt-4 sm:grid-cols-2" role="region" aria-label="ตัวกรองผลลัพธ์">
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
                  <option value="direct">ค้นพบโดยตรง</option>
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
            <div className="mt-4 space-y-5">
              {rankedResults.map((candidate) => (
                <article key={candidate.id} className="overflow-hidden rounded-xl border border-[#c2c6d9] bg-white shadow-[0_2px_8px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:shadow-md">
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
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.evidence.map((item) => <li key={item}><span aria-hidden="true" className="mr-2 text-[#22c55e]">✓</span>{item}</li>)}</ul>
                    </section>
                    <section className="bg-[#ffdad6]/20 p-5 sm:p-6">
                      <h4 className="flex items-center gap-2 font-semibold text-[#ba1a1a]"><span aria-hidden="true" className="material-symbols-outlined">warning</span>ข้อควรตรวจสอบ</h4>
                      <ul className="mt-4 space-y-3 text-sm text-[#424656]">{candidate.concerns.map((item) => <li key={item}><span aria-hidden="true" className="mr-2 text-[#ba1a1a]">!</span>{item}</li>)}</ul>
                    </section>
                    <section className="flex flex-col justify-center gap-3 bg-[#f2f4f6] p-5 sm:p-6" aria-label={`การตัดสินใจสำหรับ ${candidate.fullName}`}>
                      {candidateDecisions[candidate.id] && (
                        <p role="status" aria-live="polite" className="rounded-lg bg-[#dbe1ff] p-3 text-sm font-semibold text-[#00174b]">
                          {decisionDetails[candidateDecisions[candidate.id]].message}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate.id, "interview")}
                        aria-pressed={candidateDecisions[candidate.id] === "interview"}
                        className={`${primaryButton} w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] ${candidateDecisions[candidate.id] === "interview" ? "ring-2 ring-[#004cca] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">thumb_up</span>{decisionDetails.interview.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate.id, "review")}
                        aria-pressed={candidateDecisions[candidate.id] === "review"}
                        className={`${secondaryButton} w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] ${candidateDecisions[candidate.id] === "review" ? "ring-2 ring-[#004cca] ring-offset-2" : ""}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">help</span>{decisionDetails.review.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCandidateDecision(candidate.id, "rejected")}
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
