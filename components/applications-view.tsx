"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";
import { isValidStageTransition, applicationStages, type ApplicationStage, type CandidateSource } from "@/domain/enums";
import { defaultTrackerFilters, filterApplications, groupApplicationsByStage, parseTrackerFilters, serializeTrackerFilters, type ApplicationTrackerData, type TrackerApplication, type TrackerCandidate, type TrackerFilters } from "@/application/application-tracker";
import { AppShell, Header, Sidebar } from "./talentflow";
import { ApplicationDrawer } from "./application-drawer";

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

type CandidateFormState = {
  fullName: string;
  email: string;
  phone: string;
  source: CandidateSource;
  sourceDetail: string;
  referrerName: string;
  jobId: string;
  appliedAt: string;
};

const todayInput = (): string => new Date().toISOString().slice(0, 10);
const toDateInput = (value: string): string => value.slice(0, 10);
const emptyCandidateForm = (jobId = ""): CandidateFormState => ({ fullName: "", email: "", phone: "", source: "manual", sourceDetail: "", referrerName: "", jobId, appliedAt: todayInput() });

const stageColors: Record<ApplicationStage, string> = {
  screening: "bg-slate-400",
  phone_screen: "bg-amber-500",
  interview: "bg-teal-600",
  offer: "bg-blue-600",
  hired: "bg-emerald-600",
  rejected: "bg-rose-500",
};

const boardStages = ["new", ...applicationStages] as const;
const boardStageLabels: Record<string, string> = { new: "สมัครใหม่", ...stageLabels };
const boardStageColors: Record<string, string> = { new: "bg-blue-400", ...stageColors };

const updateUrl = (filters: TrackerFilters): void => {
  const query = serializeTrackerFilters(filters);
  window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  window.localStorage.setItem("talentflow.applications.filters", query);
};

function StageSelect({ application, onChange, pending }: { application: TrackerApplication; onChange: (stage: ApplicationStage) => void; pending: boolean }) {
  const choices = applicationStages.filter((stage) => stage === application.stage || isValidStageTransition(application.stage, stage));
  return <label onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} className="text-xs text-[#565e74]"><span className="sr-only">เปลี่ยนขั้นตอนของ {application.candidate.fullName}</span><select aria-label={`เปลี่ยนขั้นตอนของ ${application.candidate.fullName}`} disabled={pending} value={application.stage} onChange={(event) => onChange(event.target.value as ApplicationStage)} className="rounded border border-[#bec5d8] bg-white px-2 py-1 text-xs">{choices.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>;
}

function ApplicationCard({ application, onStageChange, onOpen, pending, onDragStart = (event, item) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/application-id", item.id); } }: { application: TrackerApplication; onStageChange: (application: TrackerApplication, stage: ApplicationStage) => void; onOpen: (application: TrackerApplication) => void; pending: boolean; onDragStart?: (event: DragEvent, application: TrackerApplication) => void }) {
  return <article draggable onDragStart={(event) => onDragStart(event, application)} onClick={() => onOpen(application)} className="cursor-grab rounded-lg border border-[#d9dee7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe1ff] text-sm font-bold text-[#004cca]">{application.candidate.fullName.slice(0, 2)}</div><div className="min-w-0"><h3 className="truncate font-semibold">{application.candidate.fullName}</h3><p className="truncate text-xs text-[#565e74]">{application.job.title}</p></div></div><StageSelect application={application} pending={pending} onChange={(stage) => onStageChange(application, stage)} /></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#565e74]"><span className="rounded bg-[#e8edf2] px-2 py-0.5">{sourceLabels[application.candidate.source]}</span>{application.candidate.email && <span className="truncate">{application.candidate.email}</span>}<span>สมัคร {toDateInput(application.appliedAt)}</span></div></article>;
}

function FilterControls({ data, filters, onChange }: { data: ApplicationTrackerData; filters: TrackerFilters; onChange: (patch: Partial<TrackerFilters>) => void }) {
  return <div className="flex flex-wrap items-end gap-3"><label className="block min-w-56 flex-1 text-xs font-semibold text-[#565e74]">ค้นหา<input value={filters.search} onChange={(event) => onChange({ search: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-[#fbfcff] px-3 py-2 text-sm text-[#191c1e]" placeholder="ชื่อผู้สมัคร, อีเมล, ตำแหน่ง" /></label><label className="block text-xs font-semibold text-[#565e74]">ตำแหน่งงาน<select value={filters.jobId} onChange={(event) => onChange({ jobId: event.target.value })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="">ทุกตำแหน่งงาน</option>{data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label><label className="block text-xs font-semibold text-[#565e74]">ขั้นตอน<select value={filters.stage} onChange={(event) => onChange({ stage: event.target.value as TrackerFilters["stage"] })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="all">ทุกขั้นตอน</option>{applicationStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label className="block text-xs font-semibold text-[#565e74]">แหล่งที่มา<select value={filters.source} onChange={(event) => onChange({ source: event.target.value as TrackerFilters["source"] })} className="mt-1 block rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm text-[#191c1e]"><option value="all">ทุกแหล่งที่มา</option>{Object.entries(sourceLabels).map(([source, label]) => <option key={source} value={source}>{label}</option>)}</select></label></div>;
}

function EmptyState() { return <div className="rounded-xl border border-dashed border-[#bec5d8] bg-white p-12 text-center"><h2 className="font-serif text-2xl">ไม่พบผู้สมัคร</h2><p className="mt-2 text-sm text-[#565e74]">ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูรายการอื่น</p></div>; }

function CandidateDialog({ form, editing, candidate, jobs, pending, error, onChange, onClose, onSubmit }: { form: CandidateFormState; editing: TrackerApplication | null; candidate: TrackerCandidate | null; jobs: ApplicationTrackerData["jobs"]; pending: boolean; error: string | null; onChange: (patch: Partial<CandidateFormState>) => void; onClose: () => void; onSubmit: () => void }) {
  const isCreate = !editing && !candidate;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071d37]/45 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">Applicant Tracker</p><h2 id="candidate-dialog-title" className="mt-1 font-serif text-2xl font-bold">{isCreate ? "เพิ่มผู้สมัคร" : "แก้ไขผู้สมัคร"}</h2><p className="mt-1 text-sm text-[#565e74]">{isCreate ? "บันทึกข้อมูลลง Supabase และผูกกับตำแหน่งงานทันที" : "แก้ไขข้อมูลผู้สมัครด้วย optimistic locking"}</p></div><button type="button" aria-label="ปิดหน้าต่าง" onClick={onClose} className="rounded-md px-2 py-1 text-xl text-[#565e74]">×</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">ชื่อผู้สมัคร<input required value={form.fullName} onChange={(event) => onChange({ fullName: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label><label className="text-sm font-semibold">อีเมล<input type="email" value={form.email} onChange={(event) => onChange({ email: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label><label className="text-sm font-semibold">เบอร์โทร<input value={form.phone} onChange={(event) => onChange({ phone: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label><label className="text-sm font-semibold">แหล่งที่มา<select value={form.source} onChange={(event) => onChange({ source: event.target.value as CandidateSource })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 font-normal">{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold sm:col-span-2">รายละเอียดแหล่งที่มา<input value={form.sourceDetail} onChange={(event) => onChange({ sourceDetail: event.target.value })} placeholder="เช่น LinkedIn, JobsDB, ชื่อกลุ่ม หรือ URL" className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label>{form.source === "referral" && <label className="text-sm font-semibold sm:col-span-2">ผู้แนะนำ<input required value={form.referrerName} onChange={(event) => onChange({ referrerName: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label>}<label className="text-sm font-semibold">ตำแหน่งงาน{isCreate ? <select required value={form.jobId} onChange={(event) => onChange({ jobId: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] bg-white px-3 py-2 font-normal"><option value="">เลือกตำแหน่งงาน</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select> : <span className="mt-1 block rounded-lg border border-[#eef0f3] bg-[#f8f9fb] px-3 py-2 text-sm font-normal text-[#565e74]">{editing?.job.title ?? "ยังไม่มีใบสมัคร"}</span>}</label><label className="text-sm font-semibold">วันที่สมัคร<input required={isCreate || Boolean(editing)} type="date" value={form.appliedAt} onChange={(event) => onChange({ appliedAt: event.target.value })} className="mt-1 block w-full rounded-lg border border-[#bec5d8] px-3 py-2 font-normal" /></label></div>{error && <p role="alert" className="mt-4 rounded-lg bg-[#fff5f4] p-3 text-sm text-[#ba1a1a]">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-[#bec5d8] px-4 py-2 text-sm font-semibold">ยกเลิก</button><button type="button" disabled={pending} onClick={onSubmit} className="rounded-lg bg-[#0057d9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "กำลังบันทึก..." : "บันทึกผู้สมัคร"}</button></div></div></div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained temporarily as a visual fallback while the production drawer is verified
function LegacyApplicationDrawer({ application, onClose }: { application: TrackerApplication; onClose: () => void }) {
  const skills = ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"];
  return <div className="fixed inset-0 z-50" role="presentation"><button type="button" aria-label="ปิดรายละเอียดผู้สมัคร" className="absolute inset-0 h-full w-full bg-[#071d37]/40" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-labelledby="application-drawer-title" className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[#e1e4ea] p-6"><h2 id="application-drawer-title" className="text-xl font-bold">รายละเอียดผู้สมัคร</h2><button type="button" aria-label="ปิดรายละเอียด" onClick={onClose} className="rounded-full p-1 text-2xl text-[#565e74] hover:bg-[#f2f4f6]">×</button></header><div className="flex-1 overflow-y-auto p-6"><div className="mb-6 flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#c2c6d9] bg-[#dbe1ff] text-xl font-bold text-[#004cca]">{application.candidate.fullName.slice(0, 2)}</div><div><h3 className="text-2xl font-bold leading-tight">{application.candidate.fullName}</h3><p className="text-base text-[#565e74]">{application.job.title}</p><p className="mt-1 flex items-center gap-1 text-sm text-[#7c8292]"><span className="material-symbols-outlined !text-[14px] !leading-none">location_on</span>กรุงเทพมหานคร, ประเทศไทย</p></div></div><div className="mb-8 flex gap-2"><button type="button" className="flex-1 rounded-lg border border-[#c2c6d9] bg-white py-2 text-sm font-medium shadow-sm"><span className="material-symbols-outlined mr-1 !text-[18px] !leading-none align-middle">download</span>เรซูเม่ (PDF)</button><button type="button" className="flex-1 rounded-lg border border-[#c2c6d9] bg-white py-2 text-sm font-medium shadow-sm"><span className="material-symbols-outlined mr-1 !text-[18px] !leading-none align-middle">mail</span>อีเมล</button><button type="button" aria-label="เมนูเพิ่มเติม" className="flex w-10 items-center justify-center rounded-lg border border-[#c2c6d9] bg-white shadow-sm"><span className="material-symbols-outlined !text-[18px] !leading-none">more_horiz</span></button></div><div className="space-y-6"><section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">สถานะปัจจุบัน</h4><div className="flex items-center justify-between rounded-lg border border-[#38bdf8]/30 bg-[#e0f2fe] p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" /><span className="font-medium text-[#005e80]">{stageLabels[application.stage]}</span></div><span className="text-sm text-[#005e80] underline decoration-dotted">เปลี่ยนสถานะ</span></div></section><section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">ทักษะหลัก (Primary Skills)</h4><div className="flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-full border border-[#c2d2ff] bg-[#dbe1ff] px-3 py-1 text-sm text-[#00174b]">{skill}</span>)}</div></section><section><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#565e74]">ประสบการณ์ทำงาน</h4><div className="space-y-4 border-l-2 border-[#c2c6d9] pl-4"><div><h5 className="font-bold">{application.job.title}</h5><p className="text-sm text-[#004cca]">บริษัทปัจจุบัน</p><p className="mt-0.5 text-xs text-[#7c8292]">2021 - ปัจจุบัน</p></div><div><h5 className="font-bold">ประสบการณ์ก่อนหน้า</h5><p className="text-sm text-[#004cca]">บริษัทเดิม</p><p className="mt-0.5 text-xs text-[#7c8292]">2017 - 2021</p></div></div></section><section><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#565e74]">การศึกษา</h4><div className="border-l-2 border-[#c2c6d9] pl-4"><h5 className="font-bold">ปริญญาตรี วิศวกรรมคอมพิวเตอร์</h5><p className="text-sm text-[#004cca]">มหาวิทยาลัยเทคโนโลยีแห่งหนึ่ง</p><p className="mt-0.5 text-xs text-[#7c8292]">2016 - 2020</p></div></section><section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">เงินเดือนที่คาดหวัง</h4><div className="flex items-center justify-between rounded-lg border border-[#e1e4ea] bg-white p-3"><strong>45,000 THB</strong><span className="text-sm text-[#7c8292]">ปัจจุบัน: 35,000 THB</span></div></section></div></div><footer className="border-t border-[#e1e4ea] bg-[#f7f9fb] p-6"><button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-3 font-bold text-white shadow-md"><span className="material-symbols-outlined">calendar_add_on</span>นัดหมายสัมภาษณ์</button></footer></aside></div>;
}

export function ApplicationsView({ data, initialFilters = defaultTrackerFilters, loadError }: { data: ApplicationTrackerData; initialFilters?: TrackerFilters; loadError?: boolean }) {
  const router = useRouter();
  const [applications, setApplications] = useState(data.applications);
  const [filters, setFilters] = useState(initialFilters);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidateDialog, setCandidateDialog] = useState<"create" | "edit" | null>(null);
  const [editingApplication, setEditingApplication] = useState<TrackerApplication | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<TrackerCandidate | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>(() => emptyCandidateForm(data.jobs[0]?.id ?? ""));
  const [candidatePending, setCandidatePending] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<TrackerApplication | null>(null);
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);

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
    if (stage === application.stage || !isValidStageTransition(application.stage, stage)) return;
    setPendingId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${application.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStage: stage, expectedVersion: application.version }) });
      const payload = await response.json() as { data?: { stage: ApplicationStage; version: number; updatedBy: string | null }; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกขั้นตอนได้");
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, stage: payload.data!.stage, version: payload.data!.version } : item));
      setSelectedApplication((current) => current?.id === application.id ? { ...current, stage: payload.data!.stage, version: payload.data!.version } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกขั้นตอนได้");
    } finally {
      setPendingId(null);
    }
  };

  const dropOnStage = (event: DragEvent, stage: string): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/application-id") || draggedApplicationId;
    const application = applications.find((item) => item.id === id);
    if (!application || stage === "new" || application.stage === stage || !isValidStageTransition(application.stage, stage as ApplicationStage)) return;
    void changeStage(application, stage as ApplicationStage);
    setDraggedApplicationId(null);
  };

  useEffect(() => {
    const handleDrop = (event: Event): void => {
      const dragEvent = event as unknown as DragEvent;
      const target = document.elementFromPoint(dragEvent.clientX, dragEvent.clientY)?.closest("section");
      const label = target?.querySelector("h2")?.textContent?.trim();
      const stage = Object.entries(boardStageLabels).find(([, value]) => value === label)?.[0];
      if (stage) dropOnStage(dragEvent, stage);
      setDraggedApplicationId(null);
    };
    const handleDragOver = (event: Event): void => event.preventDefault();
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => { window.removeEventListener("dragover", handleDragOver); window.removeEventListener("drop", handleDrop); };
  }, [applications, draggedApplicationId]);

  useEffect(() => {
    const onDeleteEvent = (event: Event): void => {
      const detail = (event as CustomEvent<{ candidateId: string; applicationId?: string }>).detail;
      const application = applications.find((item) => item.id === detail.applicationId || item.candidate.id === detail.candidateId);
      if (application) void deleteCandidate(application.candidate, application.id);
    };
    const onStageEvent = (event: Event): void => {
      const detail = (event as CustomEvent<{ application: TrackerApplication; stage: ApplicationStage }>).detail;
      void changeStage(detail.application, detail.stage);
    };
    window.addEventListener("talentflow:delete-candidate", onDeleteEvent);
    window.addEventListener("talentflow:change-stage", onStageEvent);
    return () => { window.removeEventListener("talentflow:delete-candidate", onDeleteEvent); window.removeEventListener("talentflow:change-stage", onStageEvent); };
  }, [applications]);

  const openEditCandidate = (application: TrackerApplication): void => {
    setEditingApplication(application);
    setEditingCandidate(application.candidate);
    setCandidateForm({ fullName: application.candidate.fullName, email: application.candidate.email ?? "", phone: application.candidate.phone ?? "", source: application.candidate.source, sourceDetail: application.candidate.sourceDetail ?? "", referrerName: "", jobId: application.jobId, appliedAt: toDateInput(application.appliedAt) });
    setCandidateError(null);
    setCandidateDialog("edit");
  };

  const submitCandidate = async (): Promise<void> => {
    setCandidatePending(true);
    setCandidateError(null);
    try {
      const payload = { fullName: candidateForm.fullName, email: candidateForm.email || undefined, phone: candidateForm.phone || undefined, source: candidateForm.source, sourceDetail: candidateForm.sourceDetail || undefined, referrerName: candidateForm.referrerName || undefined, ...(candidateForm.jobId ? { jobId: candidateForm.jobId } : {}), ...(candidateForm.appliedAt ? { appliedAt: new Date(`${candidateForm.appliedAt}T00:00:00.000Z`).toISOString() } : {}) };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let response: Response;
      if (!editingCandidate) {
        headers["Idempotency-Key"] = crypto.randomUUID();
        response = await fetch("/api/candidates", { method: "POST", headers, body: JSON.stringify(payload) });
      } else {
        response = await fetch(`/api/candidates/${editingCandidate.id}`, { method: "PATCH", headers, body: JSON.stringify({ ...payload, expectedVersion: editingCandidate.version, ...(editingApplication ? { applicationId: editingApplication.id, applicationVersion: editingApplication.version } : {}) }) });
      }
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "บันทึกผู้สมัครไม่สำเร็จ");
      setCandidateDialog(null);
      router.refresh();
    } catch (cause) {
      setCandidateError(cause instanceof Error ? cause.message : "บันทึกผู้สมัครไม่สำเร็จ");
    } finally {
      setCandidatePending(false);
    }
  };

  const deleteCandidate = async (candidate: TrackerCandidate, applicationId?: string): Promise<void> => {
    if (!window.confirm(`ยืนยันลบ ${candidate.fullName} หรือไม่`)) return;
    setPendingId(applicationId ?? candidate.id);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: candidate.version }) });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "ลบผู้สมัครไม่สำเร็จ");
      setApplications((current) => current.filter((item) => item.id !== applicationId && item.candidate.id !== candidate.id));
      setSelectedApplication((current) => current?.candidate.id === candidate.id ? null : current);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ลบผู้สมัครไม่สำเร็จ");
    } finally {
      setPendingId(null);
    }
  };

  return <AppShell><Sidebar activePath="/applications" /><Header /><main className="min-h-screen bg-[#f8f9fb] px-4 py-6 md:ml-[260px] md:px-6"><div className="mx-auto max-w-[1500px]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p><h1 className="mt-2 font-serif text-3xl font-bold">ติดตามผู้สมัคร</h1><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบผู้สมัคร เปลี่ยนขั้นตอน และบันทึกการตัดสินใจของ HR</p></div><div className="flex items-end gap-4"><div className="text-right text-xs text-[#565e74]"><p>{data.candidates.length} ผู้สมัคร · {data.jobs.length} ตำแหน่งงาน</p><p>{filteredApplications.length} ใบสมัครที่แสดง</p></div></div></div>{loadError ? <div className="rounded-xl border border-[#ba1a1a]/30 bg-[#fff5f4] p-6"><h2 className="font-semibold text-[#ba1a1a]">โหลดข้อมูลใบสมัครไม่สำเร็จ</h2><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบการเชื่อมต่อและสิทธิ์ Supabase แล้วลองใหม่อีกครั้ง</p><button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#071d37] px-4 py-2 text-sm font-semibold text-white">ลองใหม่</button></div> : <><section className="mb-5 rounded-xl border border-[#e1e4ea] bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg bg-[#e8edf2] p-1"><button onClick={() => changeFilters({ view: "board" })} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${filters.view === "board" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none">dashboard</span>บอร์ด</button><button onClick={() => changeFilters({ view: "list" })} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${filters.view === "list" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined !text-base !leading-none">format_list_bulleted</span>รายการ</button></div><button onClick={() => changeFilters(defaultTrackerFilters)} className="rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-xs font-semibold text-[#565e74]">ล้างตัวกรอง</button></div><FilterControls data={data} filters={filters} onChange={changeFilters} /></section>{error && <p role="alert" className="mb-4 rounded-lg border border-[#ba1a1a]/30 bg-[#fff5f4] p-3 text-sm text-[#ba1a1a]">{error}</p>}{filteredApplications.length === 0 ? <EmptyState /> : filters.view === "list" ? <div className="overflow-x-auto rounded-xl border border-[#e1e4ea] bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#e1e4ea] bg-[#f8f9fb] text-xs text-[#565e74]"><tr><th className="px-4 py-3">ผู้สมัคร</th><th className="px-4 py-3">ตำแหน่งงาน</th><th className="px-4 py-3">วันที่สมัคร</th><th className="px-4 py-3">แหล่งที่มา</th><th className="px-4 py-3">ขั้นตอน</th><th className="px-4 py-3">จัดการ</th></tr></thead><tbody>{filteredApplications.map((application) => <tr key={application.id} className="border-b border-[#eef0f3] last:border-0"><td className="px-4 py-4 font-semibold">{application.candidate.fullName}<span className="block text-xs font-normal text-[#7c8292]">{application.candidate.email ?? "ไม่มีอีเมล"}<br />{application.candidate.phone ?? "ไม่มีเบอร์โทร"}</span></td><td className="px-4 py-4">{application.job.title}</td><td className="px-4 py-4">{toDateInput(application.appliedAt)}</td><td className="px-4 py-4 text-[#565e74]">{sourceLabels[application.candidate.source]}{application.candidate.sourceDetail ? <span className="block text-xs">{application.candidate.sourceDetail}</span> : null}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${stageColors[application.stage]}`} />{stageLabels[application.stage]}<StageSelect application={application} pending={pendingId === application.id} onChange={(stage) => changeStage(application, stage)} /></div></td><td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => openEditCandidate(application)} className="text-xs font-semibold text-[#0057d9]">แก้ไข</button><button type="button" onClick={() => deleteCandidate(application.candidate, application.id)} className="text-xs font-semibold text-[#ba1a1a]">ลบ</button></div></td></tr>)}</tbody></table></div> : <div className="flex gap-5 overflow-x-auto pb-5">{boardStages.map((stage) => <section key={stage} className="flex min-h-[430px] w-80 shrink-0 flex-col rounded-xl border border-[#d9dee7] bg-[#eef2f5] p-3"><header className="mb-4 flex items-center justify-between px-2"><h2 className="flex items-center gap-2 font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${boardStageColors[stage]}`} />{boardStageLabels[stage]}</h2><span className="rounded-full bg-[#dce2e8] px-2 py-0.5 text-xs text-[#565e74]">{stage === "new" ? 0 : groupedApplications[stage].length}</span></header><div className="flex-1 space-y-3">{(stage === "new" ? [] : groupedApplications[stage]).map((application) => <ApplicationCard key={application.id} application={application} pending={pendingId === application.id} onStageChange={changeStage} onOpen={setSelectedApplication} />)}</div></section>)}</div>}</>}</div></main>{candidateDialog && <CandidateDialog form={candidateForm} editing={editingApplication} candidate={editingCandidate} jobs={data.jobs} pending={candidatePending} error={candidateError} onChange={(patch) => setCandidateForm((current) => ({ ...current, ...patch }))} onClose={() => setCandidateDialog(null)} onSubmit={() => void submitCandidate()} />}{selectedApplication && <ApplicationDrawer application={selectedApplication} onClose={() => setSelectedApplication(null)} />}</AppShell>;
}
