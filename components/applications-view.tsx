"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidStageTransition, applicationStages, type ApplicationStage, type CandidateSource } from "@/domain/enums";
import { defaultTrackerFilters, filterApplications, groupApplicationsByStage, parseTrackerFilters, serializeTrackerFilters, type ApplicationTrackerData, type TrackerApplication, type TrackerFilters } from "@/application/application-tracker";
import { AppShell, Header, Sidebar } from "./talentflow";

const stageLabels: Record<ApplicationStage, string> = {
  screening: "คัดกรองเบื้องต้น",
  phone_screen: "คัดกรองทางโทรศัพท์",
  interview: "สัมภาษณ์",
  offer: "ข้อเสนอ",
  hired: "รับเข้าทำงาน",
  rejected: "ปฏิเสธ",
};

const sourceLabels: Record<CandidateSource, string> = {
  manual: "เพิ่มเอง",
  referral: "แนะนำ",
  discovery: "ค้นหา",
  import: "นำเข้า",
};

const stageColors: Record<ApplicationStage, string> = {
  screening: "bg-slate-400",
  phone_screen: "bg-amber-500",
  interview: "bg-teal-600",
  offer: "bg-blue-600",
  hired: "bg-emerald-600",
  rejected: "bg-rose-500",
};

const updateUrl = (filters: TrackerFilters): void => {
  const query = serializeTrackerFilters(filters);
  window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  window.localStorage.setItem("talentflow.applications.filters", query);
};

function StageSelect({ application, onChange, pending }: { application: TrackerApplication; onChange: (stage: ApplicationStage) => void; pending: boolean }) {
  const choices = applicationStages.filter((stage) => stage === application.stage || isValidStageTransition(application.stage, stage));
  return <label className="text-xs text-[#565e74]"><span className="sr-only">เปลี่ยนขั้นตอนของ {application.candidate.fullName}</span><select aria-label={`เปลี่ยนขั้นตอนของ ${application.candidate.fullName}`} disabled={pending} value={application.stage} onChange={(event) => onChange(event.target.value as ApplicationStage)} className="rounded border border-[#bec5d8] bg-white px-2 py-1 text-xs">{choices.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>;
}

function ApplicationCard({ application, onStageChange, pending }: { application: TrackerApplication; onStageChange: (application: TrackerApplication, stage: ApplicationStage) => void; pending: boolean }) {
  return <article className="rounded-lg border border-[#d9dee7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe1ff] text-sm font-bold text-[#004cca]">{application.candidate.fullName.slice(0, 2)}</div><div className="min-w-0"><h3 className="truncate font-semibold">{application.candidate.fullName}</h3><p className="truncate text-xs text-[#565e74]">{application.job.title}</p></div></div><StageSelect application={application} pending={pending} onChange={(stage) => onStageChange(application, stage)} /></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#565e74]"><span className="rounded bg-[#e8edf2] px-2 py-0.5">{sourceLabels[application.candidate.source]}</span>{application.candidate.email && <span className="truncate">{application.candidate.email}</span>}</div></article>;
}

function FilterControls({ data, filters, onChange }: { data: ApplicationTrackerData; filters: TrackerFilters; onChange: (patch: Partial<TrackerFilters>) => void }) {
  return <div className="flex flex-wrap items-end gap-3"><label className="block min-w-56 flex-1 text-xs font-semibold text-[#565e74]">ค้นหา<input value={filters.search} onChange={(event) => onChange({ search: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-[#fbfcff] px-3 py-2 text-sm text-[#191c1e]" placeholder="ชื่อผู้สมัคร, อีเมล, ตำแหน่ง" /></label><label className="block text-xs font-semibold text-[#565e74]">ตำแหน่งงาน<select value={filters.jobId} onChange={(event) => onChange({ jobId: event.target.value })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="">ทุกตำแหน่งงาน</option>{data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label><label className="block text-xs font-semibold text-[#565e74]">ขั้นตอน<select value={filters.stage} onChange={(event) => onChange({ stage: event.target.value as TrackerFilters["stage"] })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="all">ทุกขั้นตอน</option>{applicationStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label className="block text-xs font-semibold text-[#565e74]">แหล่งที่มา<select value={filters.source} onChange={(event) => onChange({ source: event.target.value as TrackerFilters["source"] })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="all">ทุกแหล่งที่มา</option>{Object.entries(sourceLabels).map(([source, label]) => <option key={source} value={source}>{label}</option>)}</select></label></div>;
}

function EmptyState() { return <div className="rounded-xl border border-dashed border-[#bec5d8] bg-white p-12 text-center"><h2 className="font-serif text-2xl">ไม่พบผู้สมัคร</h2><p className="mt-2 text-sm text-[#565e74]">ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูรายการอื่น</p></div>; }

export function ApplicationsView({ data, initialFilters = defaultTrackerFilters, loadError }: { data: ApplicationTrackerData; initialFilters?: TrackerFilters; loadError?: boolean }) {
  const [applications, setApplications] = useState(data.applications);
  const [filters, setFilters] = useState(initialFilters);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.search) return;
    const saved = window.localStorage.getItem("talentflow.applications.filters");
    if (!saved) return;
    setFilters(parseTrackerFilters(new URLSearchParams(saved)));
  }, [initialFilters.source, initialFilters.stage]);

  const filteredApplications = useMemo(() => filterApplications(applications, filters), [applications, filters]);
  const groupedApplications = useMemo(() => groupApplicationsByStage(filteredApplications), [filteredApplications]);

  const changeFilters = (patch: Partial<TrackerFilters>): void => {
    const next = { ...filters, ...patch };
    setFilters(next);
    updateUrl(next);
  };

  const changeStage = async (application: TrackerApplication, stage: ApplicationStage): Promise<void> => {
    if (stage === application.stage) return;
    setPendingId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${application.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStage: stage, expectedVersion: application.version }) });
      const payload = await response.json() as { data?: { stage: ApplicationStage; version: number; updatedBy: string | null }; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกขั้นตอนได้");
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, stage: payload.data!.stage, version: payload.data!.version } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกขั้นตอนได้");
    } finally {
      setPendingId(null);
    }
  };

  return <AppShell><Sidebar activePath="/applications" /><Header /><main className="min-h-screen bg-[#f8f9fb] px-4 py-6 md:ml-[260px] md:px-6"><div className="mx-auto max-w-[1500px]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p><h1 className="mt-2 font-serif text-3xl font-bold">ติดตามผู้สมัคร</h1><p className="mt-1 text-sm text-[#565e74]">ข้อมูลจากฐานข้อมูลผู้สมัคร ตำแหน่งงาน และใบสมัคร</p></div><div className="text-right text-xs text-[#565e74]"><p>{data.candidates.length} ผู้สมัคร · {data.jobs.length} ตำแหน่งงาน</p><p>{filteredApplications.length} ใบสมัครที่แสดง</p></div></div>{loadError ? <div className="rounded-xl border border-[#ba1a1a]/30 bg-[#fff5f4] p-6"><h2 className="font-semibold text-[#ba1a1a]">โหลดข้อมูลใบสมัครไม่สำเร็จ</h2><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบการเชื่อมต่อและสิทธิ์ Supabase แล้วลองใหม่อีกครั้ง</p><button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#071d37] px-4 py-2 text-sm font-semibold text-white">ลองใหม่</button></div> : <><section className="mb-5 rounded-xl border border-[#e1e4ea] bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg bg-[#e8edf2] p-1"><button onClick={() => changeFilters({ view: "board" })} className={`rounded-md px-3 py-2 text-sm ${filters.view === "board" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}>บอร์ด</button><button onClick={() => changeFilters({ view: "list" })} className={`rounded-md px-3 py-2 text-sm ${filters.view === "list" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}>รายการ</button></div><button onClick={() => changeFilters(defaultTrackerFilters)} className="rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-xs font-semibold text-[#565e74]">ล้างตัวกรอง</button></div><FilterControls data={data} filters={filters} onChange={changeFilters} /></section>{error && <p role="alert" className="mb-4 rounded-lg border border-[#ba1a1a]/30 bg-[#fff5f4] p-3 text-sm text-[#ba1a1a]">{error}</p>}{filteredApplications.length === 0 ? <EmptyState /> : filters.view === "list" ? <div className="overflow-x-auto rounded-xl border border-[#e1e4ea] bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#e1e4ea] bg-[#f8f9fb] text-xs text-[#565e74]"><tr><th className="px-4 py-3">ผู้สมัคร</th><th className="px-4 py-3">ตำแหน่งงาน</th><th className="px-4 py-3">แหล่งที่มา</th><th className="px-4 py-3">ขั้นตอน</th></tr></thead><tbody>{filteredApplications.map((application) => <tr key={application.id} className="border-b border-[#eef0f3] last:border-0"><td className="px-4 py-4 font-semibold">{application.candidate.fullName}<span className="block text-xs font-normal text-[#7c8292]">{application.candidate.email ?? "ไม่มีอีเมล"}</span></td><td className="px-4 py-4">{application.job.title}</td><td className="px-4 py-4 text-[#565e74]">{sourceLabels[application.candidate.source]}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${stageColors[application.stage]}`} />{stageLabels[application.stage]}<StageSelect application={application} pending={pendingId === application.id} onChange={(stage) => changeStage(application, stage)} /></div></td></tr>)}</tbody></table></div> : <div className="flex gap-5 overflow-x-auto pb-5">{applicationStages.map((stage) => <section key={stage} className="flex min-h-[430px] w-80 shrink-0 flex-col rounded-xl border border-[#d9dee7] bg-[#eef2f5] p-3"><header className="mb-4 flex items-center justify-between px-2"><h2 className="flex items-center gap-2 font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${stageColors[stage]}`} />{stageLabels[stage]}</h2><span className="rounded-full bg-[#dce2e8] px-2 py-0.5 text-xs text-[#565e74]">{groupedApplications[stage].length}</span></header><div className="flex-1 space-y-3">{groupedApplications[stage].map((application) => <ApplicationCard key={application.id} application={application} pending={pendingId === application.id} onStageChange={changeStage} />)}</div></section>)}</div>}</>}</div></main></AppShell>;
}
