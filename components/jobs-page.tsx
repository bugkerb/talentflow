"use client";

import { FormEvent, useState, useTransition } from "react";
import { closeJob, createDraftJob, pauseJob, publishJob, updateJob } from "../app/jobs/actions";
import type { JobRecord } from "@/application/job-service";
import { AppShell, Header, Sidebar } from "./talentflow";

const statusLabels: Record<JobRecord["status"], string> = { draft: "ฉบับร่าง", open: "เปิดรับ", paused: "หยุดชั่วคราว", closed: "ปิดรับ" };

function statusClass(status: JobRecord["status"]): string {
  if (status === "open") return "bg-[#dcfce7] text-[#166534]";
  if (status === "closed") return "bg-[#ffdad6] text-[#93000a]";
  return "bg-[#e0e3e5] text-[#424656]";
}

export type JobStatusFilter = JobRecord["status"] | "all";

export function filterJobs(jobs: readonly JobRecord[], searchTerm: string, statusFilter: JobStatusFilter): JobRecord[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return jobs.filter((job) => {
    const matchesSearch = normalizedSearch.length === 0 || [job.title, job.department ?? "", job.description].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

export function JobsPage({ initialJobs }: { initialJobs: JobRecord[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<{ title?: string; description?: string }>({});
  const [pending, startTransition] = useTransition();
  const visibleJobs = filterJobs(jobs, searchTerm, statusFilter);

  function replaceJob(updated: JobRecord) {
    setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
  }

  function submitDraft(formData: FormData) {
    startTransition(async () => {
      const result = await createDraftJob({ title: formData.get("title"), description: formData.get("description"), department: formData.get("department") || undefined });
      if (result.error || !result.data) { setMessage(result.error?.message ?? "บันทึกไม่สำเร็จ"); return; }
      setJobs((current) => [result.data as JobRecord, ...current]);
      setMessage("บันทึกตำแหน่งงานเป็นฉบับร่างแล้ว");
    });
  }

  function validateCreate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    const description = String(new FormData(form).get("description") ?? "").trim();
    const errors = {
      ...(title ? {} : { title: "กรุณาระบุชื่อตำแหน่งงาน" }),
      ...(description ? {} : { description: "กรุณาระบุรายละเอียดงาน" })
    };
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setMessage("กรุณากรอกข้อมูลที่จำเป็นก่อนบันทึก");
    }
  }

  function saveEdit(job: JobRecord, formData: FormData) {
    startTransition(async () => {
      const result = await updateJob(job.id, { title: formData.get("title"), description: formData.get("description"), department: formData.get("department") || undefined }, job.version);
      if (result.error || !result.data) { setMessage(result.error?.message ?? "บันทึกไม่สำเร็จ"); return; }
      replaceJob(result.data as JobRecord);
      setEditingId(null);
      setMessage("บันทึกการแก้ไขแล้ว");
    });
  }

  function publish(job: JobRecord) {
    startTransition(async () => {
      const result = await publishJob(job.id, job.version);
      if (result.error || !result.data) { setMessage(result.error?.message ?? "ดำเนินการไม่สำเร็จ"); return; }
      replaceJob(result.data as JobRecord);
      setMessage("เปิดรับสมัครแล้ว");
    });
  }

  function pause(job: JobRecord) {
    startTransition(async () => {
      const result = await pauseJob(job.id, job.version);
      if (result.error || !result.data) { setMessage(result.error?.message ?? "ดำเนินการไม่สำเร็จ"); return; }
      replaceJob(result.data as JobRecord);
      setMessage("หยุดรับสมัครชั่วคราวแล้ว");
    });
  }

  function close(formData: FormData, job: JobRecord) {
    startTransition(async () => {
      const result = await closeJob(job.id, job.version, { reason: formData.get("reason"), note: formData.get("note") || undefined });
      if (result.error || !result.data) { setMessage(result.error?.message ?? "ดำเนินการไม่สำเร็จ"); return; }
      replaceJob(result.data as JobRecord);
      setClosingId(null);
      setMessage("ปิดรับสมัครแล้ว");
    });
  }

  return <AppShell><Sidebar activePath="/jobs" /><Header activePath="/jobs" /><main className="min-h-[calc(100vh-4rem)] bg-[#f7f9fb] px-4 py-6 md:ml-[260px] md:px-8 lg:px-10">
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col items-start gap-2"><h1 className="font-serif text-[40px] leading-[52px] tracking-[-0.01em] text-[#191c1e]">จัดการตำแหน่งงาน</h1><p className="text-base text-[#424656]">ดูแลและสร้างประกาศรับสมัครงานใหม่สำหรับองค์กรของคุณ</p></div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <section className="space-y-4 xl:col-span-8"><div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2" role="group" aria-label="กรองตำแหน่งงานตามสถานะ">
        {([['all', `ทั้งหมด (${jobs.length})`], ['open', 'เปิดรับ'], ['draft', 'ฉบับร่าง'], ['closed', 'ปิดรับ']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${statusFilter === value ? 'bg-[#0062ff] text-white' : 'bg-[#eceef0] text-[#424656] hover:bg-[#e0e3e5]'}`}>{label}</button>)}
      </div><button type="button" onClick={() => setStatusFilter('all')} className="flex items-center gap-1 text-sm text-[#565e74] transition-colors hover:text-[#004cca]"><span aria-hidden="true" className="material-symbols-outlined text-base">filter_list</span>ตัวกรอง</button></div>
      <label className="sr-only" htmlFor="job-search">ค้นหาตำแหน่งงาน</label><div className="relative"><span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#737687]">search</span><input id="job-search" aria-label="ค้นหาตำแหน่งงาน" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาชื่อตำแหน่ง แผนก หรือรายละเอียด" className="w-full rounded-xl border border-[#c2c6d9] bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-[#004cca] focus:ring-2 focus:ring-[#004cca]/20" /></div>
      <p aria-live="polite" className="text-sm text-[#565e74]">แสดง {visibleJobs.length} จาก {jobs.length} ตำแหน่งงาน</p><div className="space-y-4">
        {visibleJobs.map((job) => <article key={job.id} className="group rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          {editingId === job.id ? <form action={(formData) => saveEdit(job, formData)} className="space-y-3"><h3 className="font-semibold">แก้ไขตำแหน่งงาน</h3><label className="block text-sm font-semibold">ชื่อตำแหน่ง<input name="title" defaultValue={job.title} required className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="block text-sm font-semibold">แผนก<input name="department" defaultValue={job.department ?? ""} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="block text-sm font-semibold">รายละเอียดงาน<textarea name="description" defaultValue={job.description} required rows={4} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-[#0062ff] px-3 py-2 text-sm font-semibold text-white">บันทึก</button><button type="button" onClick={() => setEditingId(null)} className="rounded-lg border px-3 py-2 text-sm font-semibold">ยกเลิก</button></div></form> : <><div className="mb-4 flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-3"><h3 className="text-lg font-bold text-[#191c1e] transition-colors group-hover:text-[#004cca]">{job.title}</h3><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass(job.status)}`}><span className={`h-2 w-2 rounded-full ${job.status === 'open' ? 'bg-[#22c55e]' : job.status === 'closed' ? 'bg-[#ef4444]' : 'bg-[#737687]'}`} />{statusLabels[job.status]}</span></div><p className="text-sm text-[#424656]">{job.department ?? "ไม่ระบุแผนก"}</p></div><button type="button" aria-label={`ตัวเลือก ${job.title}`} className="text-[#565e74] transition-colors hover:text-[#004cca]"><span aria-hidden="true" className="material-symbols-outlined">more_vert</span></button></div><div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#e0e3e5]/70 pt-4">{job.status === 'closed' ? <><div><p className="text-xs font-bold uppercase tracking-wider text-[#565e74]">ผู้สมัครทั้งหมด</p><p className="mt-1 font-mono text-lg text-[#191c1e]">—</p></div><div className="col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-[#565e74]">สถานะการจ้างงาน</p><p className="mt-1 flex items-center gap-1 text-sm font-medium text-[#004cca]"><span aria-hidden="true" className="material-symbols-outlined text-sm">check_circle</span>ปิดรับสมัครแล้ว</p></div></> : <><div><p className="text-xs font-bold uppercase tracking-wider text-[#565e74]">ผู้สมัครใหม่</p><p className="mt-1 font-mono text-lg text-[#004cca]">—</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#565e74]">กำลังสัมภาษณ์</p><p className="mt-1 font-mono text-lg text-[#191c1e]">—</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#565e74]">วันที่ประกาศ</p><p className="mt-1 text-sm text-[#191c1e]">ยังไม่ระบุ</p></div></>}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingId(job.id)} disabled={pending || job.status === "closed"} className="rounded-lg border border-[#c2c6d9] px-3 py-2 text-xs font-semibold">แก้ไข</button>{job.status === "draft" && <button type="button" onClick={() => publish(job)} disabled={pending} className="rounded-lg bg-[#0062ff] px-3 py-2 text-xs font-semibold text-white">เผยแพร่</button>}{job.status === "open" && <button type="button" onClick={() => pause(job)} disabled={pending} className="rounded-lg border border-[#92400e] px-3 py-2 text-xs font-semibold text-[#92400e]">หยุดชั่วคราว</button>}{(job.status === "open" || job.status === "paused") && <button type="button" onClick={() => setClosingId(closingId === job.id ? null : job.id)} disabled={pending} className="rounded-lg border border-[#ba1a1a] px-3 py-2 text-xs font-semibold text-[#ba1a1a]">ปิดรับ</button>}</div>{closingId === job.id && <form action={(formData) => close(formData, job)} className="mt-3 space-y-2 rounded-lg bg-[#fff7f5] p-3"><label className="block text-xs font-semibold">เหตุผลการปิด<input name="reason" required maxLength={160} className="mt-1 block w-full rounded border px-2 py-1.5 text-sm" /></label><label className="block text-xs font-semibold">หมายเหตุ<textarea name="note" maxLength={500} rows={2} className="mt-1 block w-full rounded border px-2 py-1.5 text-sm" /></label><button type="submit" disabled={pending} className="rounded-lg bg-[#ba1a1a] px-3 py-2 text-xs font-semibold text-white">ยืนยันการปิด</button></form>}</>}</article>)}
        {visibleJobs.length === 0 && <p className="text-sm text-[#565e74]">{jobs.length === 0 ? "ยังไม่มีตำแหน่งงาน" : "ไม่พบตำแหน่งงานที่ตรงกับตัวกรอง"}</p>}
      </div></section><div className="xl:col-span-4"><form id="create-job-form" action={submitDraft} onSubmit={validateCreate} noValidate className="sticky top-[100px] rounded-xl border border-[#e0e3e5] bg-white shadow-lg"><div className="border-b border-[#e0e3e5] p-6"><h2 className="flex items-center gap-2 text-xl font-bold"><span aria-hidden="true" className="material-symbols-outlined text-[#004cca]">add_box</span>สร้างตำแหน่งงานใหม่</h2></div><div className="space-y-6 p-6"><label className="block text-xs font-bold uppercase tracking-wider text-[#424656]">ชื่อตำแหน่ง<input name="title" required aria-invalid={Boolean(createErrors.title)} aria-describedby={createErrors.title ? "create-title-error" : undefined} placeholder="เช่น Marketing Manager" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-[#f7f9fb] px-4 py-2 text-base outline-none transition focus:border-[#004cca] focus:ring-2 focus:ring-[#004cca]/20" />{createErrors.title && <span id="create-title-error" role="alert" className="mt-1 block text-xs font-medium text-[#ba1a1a]">{createErrors.title}</span>}</label><label className="block text-xs font-bold uppercase tracking-wider text-[#424656]">แผนก<select name="department" defaultValue="" className="mt-2 block w-full appearance-none rounded-lg border border-[#c2c6d9] bg-[#f7f9fb] px-4 py-2 text-base outline-none transition focus:border-[#004cca] focus:ring-2 focus:ring-[#004cca]/20"><option value="" disabled>เลือกแผนก</option><option>Engineering</option><option>Marketing</option><option>Human Resources</option><option>Sales</option></select></label><fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#424656]">สถานะเริ่มต้น</legend><div className="grid grid-cols-2 gap-3"><label className="flex cursor-pointer items-center justify-center rounded-lg border border-[#004cca] bg-[#0062ff]/10 p-3 text-sm font-medium text-[#004cca]"><input className="sr-only" name="status" type="radio" value="draft" defaultChecked />บันทึกร่าง</label><label className="flex cursor-pointer items-center justify-center rounded-lg border border-[#c2c6d9] p-3 text-sm font-medium text-[#424656] transition hover:bg-[#f2f4f6]"><input className="sr-only" name="status" type="radio" value="open" />เปิดรับสมัคร</label></div></fieldset><label className="block text-xs font-bold uppercase tracking-wider text-[#424656]">รายละเอียดงาน<textarea name="description" required aria-invalid={Boolean(createErrors.description)} aria-describedby={createErrors.description ? "create-description-error" : undefined} placeholder="อธิบายความรับผิดชอบและคุณสมบัติที่ต้องการ..." rows={5} className="mt-2 block w-full resize-none rounded-lg border border-[#c2c6d9] bg-[#f7f9fb] px-4 py-3 text-sm outline-none transition focus:border-[#004cca] focus:ring-2 focus:ring-[#004cca]/20" />{createErrors.description && <span id="create-description-error" role="alert" className="mt-1 block text-xs font-medium text-[#ba1a1a]">{createErrors.description}</span>}</label><div className="flex gap-3 pt-2"><button type="button" onClick={() => { (document.getElementById('create-job-form') as HTMLFormElement)?.reset(); setCreateErrors({}); setMessage(""); }} className="flex-1 rounded-lg border border-[#020617] px-4 py-2.5 text-sm font-medium text-[#020617] transition hover:bg-[#f2f4f6]">ยกเลิก</button><button type="submit" disabled={pending} className="flex-1 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">{pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button></div>{message && <p role="status" className="text-sm text-[#424656]">{message}</p>}</div></form></div></div></div>
  </main></AppShell>;
}
