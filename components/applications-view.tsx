"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppShell, Header, Sidebar } from "./talentflow";

const stageOptions = [
  { label: "สมัครใหม่", dot: "bg-[#94a3b8]" },
  { label: "คัดกรองเบื้องต้น", dot: "bg-[#f59e0b]" },
  { label: "สัมภาษณ์", dot: "bg-[#0f766e]" },
  { label: "ข้อเสนอ/รับเข้าทำงาน", dot: "bg-[#64748b]" },
] as const;

type CandidateStage = (typeof stageOptions)[number]["label"];
type TimeFilter = "all" | "today" | "week";

type Candidate = {
  id: string;
  stage: CandidateStage;
  name: string;
  initials: string;
  role: string;
  experience: string;
  summary: string;
  skills: readonly string[];
  timeLabel: string;
  timeFilter: Exclude<TimeFilter, "all">;
  location: string;
  desiredSalary: string;
  currentSalary: string;
};

const initialCandidates: readonly Candidate[] = [
  {
    id: "vichaya-areerat",
    stage: "สมัครใหม่",
    name: "วิชญะ อารีรัตน์",
    initials: "วอ",
    role: "Senior Frontend Engineer",
    experience: "3 ปีประสบการณ์",
    summary: "มีประสบการณ์สร้างหน้าจอด้วย React และ Tailwind",
    skills: ["React", "Tailwind"],
    timeLabel: "วันนี้",
    timeFilter: "today",
    location: "กรุงเทพมหานคร, ประเทศไทย",
    desiredSalary: "42,000 บาท",
    currentSalary: "32,000 บาท",
  },
  {
    id: "thanachot-wongwivat",
    stage: "คัดกรองเบื้องต้น",
    name: "ธนโชติ วงศ์วิวัฒน์",
    initials: "ธว",
    role: "Senior Frontend Engineer",
    experience: "4 ปีประสบการณ์",
    summary: "มีทักษะ React แข็งแกร่ง แต่เงินเดือนสูงกว่าโครงสร้างเล็กน้อย",
    skills: ["React", "TypeScript", "Next.js"],
    timeLabel: "อัปเดต 1 ชั่วโมงที่แล้ว",
    timeFilter: "week",
    location: "นนทบุรี, ประเทศไทย",
    desiredSalary: "58,000 บาท",
    currentSalary: "48,000 บาท",
  },
  {
    id: "napatsorn-rungrueang",
    stage: "สัมภาษณ์",
    name: "นภัสสร รุ่งเรือง",
    initials: "นร",
    role: "Senior Frontend Engineer",
    experience: "6 ปีประสบการณ์",
    summary: "นัดสัมภาษณ์พรุ่งนี้ เวลา 14:00 น.",
    skills: ["React", "System Design", "Redux"],
    timeLabel: "พรุ่งนี้, 14:00 น.",
    timeFilter: "week",
    location: "กรุงเทพมหานคร, ประเทศไทย",
    desiredSalary: "65,000 บาท",
    currentSalary: "55,000 บาท",
  },
  {
    id: "thanapon-suksan",
    stage: "ข้อเสนอ/รับเข้าทำงาน",
    name: "ธนพล สุขสันต์",
    initials: "ธส",
    role: "Tech Lead / Senior Developer",
    experience: "Frontend Lead",
    summary: "รอเซ็นสัญญา",
    skills: ["React", "TypeScript", "Leadership"],
    timeLabel: "สัปดาห์นี้",
    timeFilter: "week",
    location: "ปทุมธานี, ประเทศไทย",
    desiredSalary: "85,000 บาท",
    currentSalary: "72,000 บาท",
  },
] as const;

const jobOptions = [
  "Senior Frontend Engineer",
  "Tech Lead / Senior Developer",
] as const;

function CandidateRow({ candidate, onSelect }: { candidate: Candidate; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-haspopup="dialog"
        aria-label={`เปิดรายละเอียด ${candidate.name}`}
        className="flex w-full items-center gap-3 border-b border-[#e1e4ea] bg-white px-4 py-4 text-left transition hover:bg-[#f8f9fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0057d9] sm:gap-4 sm:px-5"
      >
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe3ff] text-sm font-bold text-[#163b92]">
          {candidate.initials}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-sm">{candidate.name}</b>
          <span className="block truncate text-xs text-[#565e74]">{candidate.experience}</span>
        </span>
        <span className="hidden rounded-md bg-[#e5e7eb] px-3 py-1 text-xs text-[#565e74] md:inline-block">{candidate.summary}</span>
        <span className="hidden text-xs text-[#7c8292] sm:inline">{candidate.stage}</span>
        <span aria-hidden="true" className="material-symbols-outlined text-[#7c8292]">chevron_right</span>
      </button>
    </li>
  );
}

function Drawer({ candidate, onClose, onStageChange }: { candidate: Candidate; onClose: () => void; onStageChange: (stage: CandidateStage) => void }) {
  const [message, setMessage] = useState("");
  const titleId = useId();
  const statusLabelId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const controls = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled])"));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  const updateStage = (nextStage: CandidateStage) => {
    onStageChange(nextStage);
    setMessage(`เปลี่ยนสถานะเป็น ${nextStage} แล้ว`);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#071d37]/40" role="presentation">
      <button type="button" aria-label="ปิดพื้นหลังรายละเอียด" onClick={onClose} className="absolute inset-0 cursor-default" />
      <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative ml-auto flex h-dvh w-full max-w-[400px] flex-col border-l border-[#e1e4ea] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#e1e4ea] px-4 py-4 sm:px-6 sm:py-6">
          <h2 id={titleId} className="text-xl font-bold">รายละเอียดผู้สมัคร</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="ปิดรายละเอียดผู้สมัคร" className="rounded-full p-2 text-[#565e74] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0057d9]">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">close</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-6 flex gap-4">
            <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#dbe3ff] text-lg font-bold text-[#163b92] sm:h-16 sm:w-16 sm:text-xl">{candidate.initials}</div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold">{candidate.name}</h3>
              <p>{candidate.role}</p>
              <p className="mt-1 text-sm text-[#7c8292]"><span aria-hidden="true" className="material-symbols-outlined mr-1 align-middle text-[14px]">location_on</span>{candidate.location}</p>
            </div>
          </div>
          <div className="mb-6 flex gap-2">
            <button type="button" onClick={() => setMessage("เปิดเรซูเม่ของผู้สมัครแล้ว")} className="flex-1 rounded-lg border border-[#bec5d8] py-2 text-sm hover:bg-[#f2f4f6]">ดูเรซูเม่</button>
            <button type="button" onClick={() => setMessage("เตรียมอีเมลสำหรับผู้สมัครแล้ว")} className="flex-1 rounded-lg border border-[#bec5d8] py-2 text-sm hover:bg-[#f2f4f6]">ส่งอีเมล</button>
          </div>
          {message && <p role="status" className="mb-6 rounded-lg bg-[#dbe3ff] p-3 text-sm">{message}</p>}
          <h4 id={statusLabelId} className="mb-2 text-xs font-bold text-[#565e74]">สถานะปัจจุบัน</h4>
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-[#acd9ee] bg-[#effaff] p-3">
            <span className="text-sm font-bold text-[#087b99]">● {candidate.stage}</span>
            <select aria-labelledby={statusLabelId} value={candidate.stage} onChange={(event) => updateStage(event.target.value as CandidateStage)} className="max-w-[150px] border-0 bg-transparent text-right text-xs text-[#087b99] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0057d9]">
              {stageOptions.map((stage) => <option key={stage.label}>{stage.label}</option>)}
            </select>
          </div>
          <h4 className="mb-2 text-xs font-bold text-[#565e74]">ทักษะหลัก</h4>
          <div className="mb-6 flex flex-wrap gap-2">{candidate.skills.map((skill) => <span key={skill} className="rounded-full bg-[#dbe3ff] px-3 py-1 text-sm text-[#163b92]">{skill}</span>)}</div>
          <h4 className="mb-2 text-xs font-bold text-[#565e74]">ประสบการณ์ทำงาน</h4>
          <div className="mb-6 space-y-4 border-l-2 border-[#e1e4ea] pl-4"><div><b>{candidate.role}</b><p className="text-sm text-[#0057d9]">TechCorp (Thailand) Co., Ltd.</p><p className="text-xs text-[#7c8292]">2021 - ปัจจุบัน ({candidate.experience})</p></div><div><b>Web Developer</b><p className="text-sm text-[#0057d9]">Digital Agency BKK</p><p className="text-xs text-[#7c8292]">2017 - 2021</p></div></div>
          <h4 className="mb-2 text-xs font-bold text-[#565e74]">การศึกษา</h4>
          <div className="mb-6 border-l-2 border-[#e1e4ea] pl-4"><b>ปริญญาตรี วิศวกรรมคอมพิวเตอร์</b><p className="text-sm text-[#0057d9]">มหาวิทยาลัยเทคโนโลยีแห่งหนึ่ง</p><p className="text-xs text-[#7c8292]">2016 - 2020</p></div>
          <h4 className="mb-2 text-xs font-bold text-[#565e74]">เงินเดือนที่คาดหวัง</h4>
          <div className="flex justify-between gap-3 rounded-lg border border-[#e1e4ea] p-3"><b>{candidate.desiredSalary}</b><span className="text-right text-xs text-[#7c8292]">ปัจจุบัน: {candidate.currentSalary}</span></div>
        </div>
        <footer className="border-t border-[#e1e4ea] p-4 sm:p-6"><button type="button" onClick={() => setMessage("พร้อมสร้างนัดหมายสัมภาษณ์สำหรับผู้สมัครแล้ว")} className="w-full rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] py-3 text-sm font-bold text-white hover:brightness-105">นัดหมายสัมภาษณ์</button></footer>
      </aside>
    </div>
  );
}

export function ApplicationsView() {
  const [view, setView] = useState<"board" | "list">("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [stageFilter, setStageFilter] = useState<CandidateStage | "">("");
  const [skillFilter, setSkillFilter] = useState("");
  const [candidates, setCandidates] = useState<readonly Candidate[]>(initialCandidates);
  const filtersId = useId();

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
  const visibleCandidates = candidates.filter((candidate) => {
    const searchableValues = [candidate.name, candidate.role, candidate.experience, candidate.summary, candidate.stage, ...candidate.skills];
    const matchesQuery = !normalizedQuery || searchableValues.some((value) => value.toLocaleLowerCase("th-TH").includes(normalizedQuery));
    const matchesJob = !jobFilter || candidate.role === jobFilter;
    const matchesTime = timeFilter === "all" || candidate.timeFilter === timeFilter;
    const matchesStage = !stageFilter || candidate.stage === stageFilter;
    const matchesSkill = !skillFilter || candidate.skills.includes(skillFilter);
    return matchesQuery && matchesJob && matchesTime && matchesStage && matchesSkill;
  });
  const activeFilterCount = [jobFilter, timeFilter !== "all" ? timeFilter : "", stageFilter, skillFilter].filter(Boolean).length;

  const openCandidate = useCallback((candidate: Candidate) => setSelectedId(candidate.id), []);
  const closeCandidate = useCallback(() => setSelectedId(null), []);
  const updateCandidateStage = useCallback((candidateId: string, nextStage: CandidateStage) => {
    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, stage: nextStage } : candidate));
  }, []);
  const clearFilters = () => {
    setJobFilter("");
    setTimeFilter("all");
    setStageFilter("");
    setSkillFilter("");
  };

  return (
    <AppShell>
      <Sidebar activePath="/applications" />
      <Header showSearch searchValue={query} onSearch={setQuery} />
      <main className="min-h-screen bg-[#f8f9fb] md:ml-[260px]">
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold">ติดตามผู้สมัคร</h1>
              <p className="mt-1 text-sm text-[#565e74]">ตรวจสอบผู้สมัคร เปลี่ยนขั้นตอน และบันทึกการตัดสินใจของ HR</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
              <div role="group" aria-label="รูปแบบการแสดงข้อมูล" className="flex w-fit rounded-lg bg-[#e6e8ec] p-1">
                <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm ${view === "board" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined text-[18px]">dashboard</span>บอร์ด</button>
                <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm ${view === "list" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined text-[18px]">format_list_bulleted</span>รายการ</button>
              </div>
              <label className="text-sm font-semibold">ตำแหน่งงาน<select aria-label="ตำแหน่งงาน" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm font-normal sm:w-[240px]"><option value="">ทุกตำแหน่งงาน</option>{jobOptions.map((job) => <option key={job}>{job}</option>)}</select></label>
              <label className="text-sm font-semibold">ช่วงเวลา<select aria-label="ช่วงเวลา" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm font-normal sm:w-[160px]"><option value="all">ทุกช่วงเวลา</option><option value="today">วันนี้</option><option value="week">สัปดาห์นี้</option></select></label>
              <button type="button" aria-expanded={showFilters} aria-controls={filtersId} onClick={() => setShowFilters((value) => !value)} className="rounded-lg bg-[#071d37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#102d4d]">ตัวกรองเพิ่มเติม{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</button>
            </div>
          </div>

          {showFilters && <div id={filtersId} className="mb-6 rounded-xl border border-[#e1e4ea] bg-white p-4" aria-label="ตัวกรองเพิ่มเติม">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-sm font-semibold">ขั้นตอน<select aria-label="กรองตามขั้นตอน" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as CandidateStage | "")} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm font-normal"><option value="">ทุกขั้นตอน</option>{stageOptions.map((stage) => <option key={stage.label}>{stage.label}</option>)}</select></label>
              <label className="text-sm font-semibold">ทักษะ<select aria-label="กรองตามทักษะ" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm font-normal"><option value="">ทุกทักษะ</option><option>React</option><option>TypeScript</option><option>Next.js</option><option>Tailwind</option><option>System Design</option><option>Redux</option><option>Leadership</option></select></label>
              <button type="button" onClick={clearFilters} className="rounded-lg border border-[#bec5d8] px-4 py-2 text-sm font-semibold text-[#0057d9] hover:bg-[#f2f4f6]">ล้างตัวกรอง</button>
            </div>
            <p role="status" className="mt-3 text-sm text-[#565e74]">แสดงผู้สมัคร {visibleCandidates.length} รายการ</p>
          </div>}

          {visibleCandidates.length === 0 ? <p role="status" className="rounded-xl border border-[#e1e4ea] bg-white p-6 text-sm">ไม่พบผู้สมัครที่ตรงกับตัวกรอง ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p> : view === "board" ? <div aria-label="บอร์ดผู้สมัคร" className="flex gap-4 overflow-x-auto pb-6 sm:gap-6">
            {stageOptions.map((stage) => {
              const columnCandidates = visibleCandidates.filter((candidate) => candidate.stage === stage.label);
              return <section key={stage.label} aria-labelledby={`stage-${stage.label}`} className="flex min-h-[520px] w-[min(82vw,320px)] shrink-0 flex-col rounded-xl border border-[#e1e4ea] bg-[#f0f2f5] p-3 sm:w-80">
                <header className="mb-4 flex items-center justify-between px-2"><h2 id={`stage-${stage.label}`} className="flex items-center gap-2 text-base font-bold"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />{stage.label}</h2><span aria-label={`${stage.label} ${columnCandidates.length} คน`} className="rounded-full bg-[#dfe2e7] px-2 py-0.5 text-xs">{columnCandidates.length}</span></header>
                <ul aria-label={`ผู้สมัครในขั้นตอน${stage.label}`} className="flex flex-1 flex-col gap-3">{columnCandidates.length === 0 ? <li className="rounded-lg border border-dashed border-[#c8ced9] bg-white/60 p-4 text-center text-sm text-[#7c8292]">ยังไม่มีผู้สมัครในขั้นตอนนี้</li> : columnCandidates.map((candidate) => <li key={candidate.id}><button type="button" onClick={() => openCandidate(candidate)} aria-haspopup="dialog" aria-label={`เปิดรายละเอียด ${candidate.name}`} className="w-full rounded-lg border border-[#e0e3e8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057d9]"><div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe3ff] text-sm font-bold text-[#163b92]">{candidate.initials}</span><span className="min-w-0"><b className="block truncate text-sm">{candidate.name}</b><span className="block text-sm text-[#565e74]">{candidate.experience}</span></span></div><p className="mt-3 text-sm text-[#565e74]">{candidate.summary}</p><div className="mt-3 flex flex-wrap gap-1.5">{candidate.skills.map((skill) => <span key={skill} className="rounded bg-[#e5e7eb] px-2 py-0.5 text-[11px] text-[#565e74]">{skill}</span>)}</div><span className="mt-3 block text-xs text-[#7c8292]">{candidate.timeLabel}</span></button></li>)}</ul>
              </section>;
            })}
          </div> : <ul aria-label="รายการผู้สมัคร" className="overflow-hidden rounded-xl border border-[#e1e4ea] bg-white">{visibleCandidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} onSelect={() => openCandidate(candidate)} />)}</ul>}
        </div>
      </main>
      {selectedCandidate && <Drawer candidate={selectedCandidate} onClose={closeCandidate} onStageChange={(stage) => updateCandidateStage(selectedCandidate.id, stage)} />}
    </AppShell>
  );
}
