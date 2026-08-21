"use client";

import { useState, useTransition } from "react";
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

  return <AppShell><Sidebar activePath="/jobs" /><Header activePath="/jobs" /><main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:ml-[260px] md:px-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p><h1 className="mt-2 text-4xl font-serif">ตำแหน่งงาน</h1><p className="mt-1 text-sm text-[#565e74]">สร้างและจัดการประกาศรับสมัครงาน</p></div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">รายการตำแหน่งงาน</h2><p aria-live="polite" className="mt-1 text-sm text-[#565e74]">แสดง {visibleJobs.length} จาก {jobs.length} ตำแหน่งงาน</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]"><label className="block text-sm font-semibold">ค้นหาตำแหน่งงาน<input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาชื่อตำแหน่ง แผนก หรือรายละเอียด" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold">กรองตามสถานะ<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as JobStatusFilter)} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2 font-normal"><option value="all">ทุกสถานะ</option><option value="draft">ฉบับร่าง</option><option value="open">เปิดรับ</option><option value="paused">หยุดชั่วคราว</option><option value="closed">ปิดรับ</option></select></label></div><div className="mt-4 space-y-3">
        {visibleJobs.map((job) => <article key={job.id} className="rounded-lg border border-[#e0e3e5] p-4">
          {editingId === job.id ? <form action={(formData) => saveEdit(job, formData)} className="space-y-3"><h3 className="font-semibold">แก้ไขตำแหน่งงาน</h3><label className="block text-sm font-semibold">ชื่อตำแหน่ง<input name="title" defaultValue={job.title} required className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="block text-sm font-semibold">แผนก<input name="department" defaultValue={job.department ?? ""} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="block text-sm font-semibold">รายละเอียดงาน<textarea name="description" defaultValue={job.description} required rows={4} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-[#0062ff] px-3 py-2 text-sm font-semibold text-white">บันทึก</button><button type="button" onClick={() => setEditingId(null)} className="rounded-lg border px-3 py-2 text-sm font-semibold">ยกเลิก</button></div></form> : <><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-3"><h3 className="font-semibold">{job.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(job.status)}`}>{statusLabels[job.status]}</span></div><p className="mt-1 text-sm text-[#565e74]">{job.department ?? "ไม่ระบุแผนก"}</p></div><span className="text-xs text-[#565e74]">v{job.version}</span></div><p className="mt-3 border-t border-[#e0e3e5] pt-3 text-sm text-[#565e74]">{job.description}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingId(job.id)} disabled={pending || job.status === "closed"} className="rounded-lg border px-3 py-2 text-xs font-semibold">แก้ไข</button>{job.status === "draft" && <button type="button" onClick={() => publish(job)} disabled={pending} className="rounded-lg bg-[#0062ff] px-3 py-2 text-xs font-semibold text-white">เผยแพร่</button>}{job.status === "open" && <button type="button" onClick={() => pause(job)} disabled={pending} className="rounded-lg border border-[#92400e] px-3 py-2 text-xs font-semibold text-[#92400e]">หยุดชั่วคราว</button>}{(job.status === "open" || job.status === "paused") && <button type="button" onClick={() => setClosingId(closingId === job.id ? null : job.id)} disabled={pending} className="rounded-lg border border-[#ba1a1a] px-3 py-2 text-xs font-semibold text-[#ba1a1a]">ปิดรับ</button>}</div>{closingId === job.id && <form action={(formData) => close(formData, job)} className="mt-3 space-y-2 rounded-lg bg-[#fff7f5] p-3"><label className="block text-xs font-semibold">เหตุผลการปิด<input name="reason" required maxLength={160} className="mt-1 block w-full rounded border px-2 py-1.5 text-sm" /></label><label className="block text-xs font-semibold">หมายเหตุ<textarea name="note" maxLength={500} rows={2} className="mt-1 block w-full rounded border px-2 py-1.5 text-sm" /></label><button type="submit" disabled={pending} className="rounded-lg bg-[#ba1a1a] px-3 py-2 text-xs font-semibold text-white">ยืนยันการปิด</button></form>}</>}
        </article>)}
        {visibleJobs.length === 0 && <p className="text-sm text-[#565e74]">{jobs.length === 0 ? "ยังไม่มีตำแหน่งงาน" : "ไม่พบตำแหน่งงานที่ตรงกับตัวกรอง"}</p>}
      </div></section>
      <form id="create-job-form" action={submitDraft} className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">สร้างตำแหน่งงาน</h2><label className="mt-4 block text-sm font-semibold">ชื่อตำแหน่ง<input name="title" required placeholder="เช่น นักพัฒนาซอฟต์แวร์อาวุโส" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold">แผนก<input name="department" placeholder="เช่น ฝ่ายวิศวกรรม" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold">รายละเอียดงาน<textarea name="description" required placeholder="อธิบายหน้าที่ ความรับผิดชอบ และคุณสมบัติที่ต้องการ" rows={5} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2" /></label><button type="submit" disabled={pending} className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "กำลังบันทึก..." : "บันทึกฉบับร่าง"}</button>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</form>
    </div>
  </main></AppShell>;
}
