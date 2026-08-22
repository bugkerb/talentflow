"use client";

import { useEffect, useState } from "react";
import type { TrackerApplication } from "@/application/application-tracker";
import type { ApplicationStage } from "@/domain/enums";

const stageLabels: Record<ApplicationStage, string> = { screening: "คัดกรองเบื้องต้น", phone_screen: "คัดกรองทางโทรศัพท์", interview: "สัมภาษณ์", offer: "ข้อเสนอ", hired: "รับเข้าทำงาน", rejected: "ปฏิเสธ" };
const unavailable = "ไม่พบข้อมูล";

export function ApplicationDrawer({ application, onClose }: { application: TrackerApplication; onClose: () => void }) {
  const [stage, setStage] = useState(application.stage);
  const [editingStage, setEditingStage] = useState(false);
  useEffect(() => setStage(application.stage), [application.stage]);
  const changeStage = (nextStage: ApplicationStage): void => { setStage(nextStage); setEditingStage(false); window.dispatchEvent(new CustomEvent("talentflow:change-stage", { detail: { application, stage: nextStage } })); };

  return <div className="fixed inset-0 z-50" role="presentation">
    <button type="button" aria-label="ปิดรายละเอียดผู้สมัคร" className="absolute inset-0 h-full w-full bg-[#071d37]/40" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-labelledby="application-drawer-title" className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-[#e1e4ea] p-6"><h2 id="application-drawer-title" className="text-xl font-bold">รายละเอียดผู้สมัคร</h2><button type="button" aria-label="ปิดรายละเอียด" onClick={onClose} className="rounded-full p-1 text-2xl text-[#565e74] hover:bg-[#f2f4f6]">×</button></header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#c2c6d9] bg-[#dbe1ff] text-xl font-bold text-[#004cca]">{application.candidate.fullName.slice(0, 2)}</div><div><h3 className="text-2xl font-bold leading-tight">{application.candidate.fullName}</h3><p className="text-base text-[#565e74]">{application.job.title}</p><p className="mt-1 flex items-center gap-1 text-sm text-[#7c8292]"><span className="material-symbols-outlined !text-[14px] !leading-none">location_on</span>กรุงเทพมหานคร, ประเทศไทย</p></div></div>
        <div className="mb-8 flex gap-2"><button type="button" disabled={!application.candidate.resumeUrl} onClick={() => application.candidate.resumeUrl && window.open(application.candidate.resumeUrl, "_blank", "noopener,noreferrer")} className="flex-1 rounded-lg border border-[#c2c6d9] bg-white py-2 text-sm font-medium shadow-sm disabled:opacity-50"><span className="material-symbols-outlined mr-1 !text-[18px] !leading-none align-middle">visibility</span>เรซูเม่ (PDF)</button><button type="button" disabled={!application.candidate.email} onClick={() => { if (application.candidate.email) window.location.href = `mailto:${application.candidate.email}`; }} className="flex-1 rounded-lg border border-[#c2c6d9] bg-white py-2 text-sm font-medium shadow-sm disabled:opacity-50"><span className="material-symbols-outlined mr-1 !text-[18px] !leading-none align-middle">mail</span>อีเมล</button><button type="button" aria-label="ลบผู้สมัคร" onClick={() => window.dispatchEvent(new CustomEvent("talentflow:delete-candidate", { detail: { candidateId: application.candidate.id, applicationId: application.id } }))} className="flex w-10 items-center justify-center rounded-lg border border-[#c2c6d9] bg-white text-[#ba1a1a] shadow-sm"><span className="material-symbols-outlined !text-[18px] !leading-none">delete</span></button></div>
        <div className="space-y-6">
          <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">สถานะปัจจุบัน</h4>{editingStage ? <select autoFocus aria-label="เปลี่ยนสถานะผู้สมัคร" value={stage} onChange={(event) => changeStage(event.target.value as ApplicationStage)} onBlur={() => setEditingStage(false)} className="w-full rounded-lg border border-[#8fcbe8] bg-white px-3 py-3 text-sm font-medium text-[#005e80] outline-none focus:ring-2 focus:ring-[#38bdf8]/40">{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <button type="button" onClick={() => setEditingStage(true)} className="flex w-full items-center justify-between rounded-lg border border-[#38bdf8]/30 bg-[#e0f2fe] p-3 text-left"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" /><span className="font-medium text-[#005e80]">{stageLabels[stage]}</span></span><span className="text-sm text-[#005e80] underline decoration-dotted">เปลี่ยนสถานะ</span></button>}</section>
          <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">ทักษะหลัก (Primary Skills)</h4><div className="flex flex-wrap gap-2"><span className="text-sm text-[#7c8292]">{unavailable}</span></div></section>
          <section><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#565e74]">ประสบการณ์ทำงาน</h4><div className="relative space-y-4 border-l-2 border-[#c2c6d9] pl-4"><div className="relative"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#c2c6d9]" /><p className="text-sm text-[#7c8292]">{unavailable}</p></div></div></section>
          <section><h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#565e74]">การศึกษา</h4><div className="relative space-y-4 border-l-2 border-[#c2c6d9] pl-4"><div className="relative"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#c2c6d9]" /><p className="text-sm text-[#7c8292]">{unavailable}</p></div></div></section>
          <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#565e74]">เงินเดือนที่คาดหวัง</h4><div className="flex items-center justify-between rounded-lg border border-[#e1e4ea] bg-white p-3"><span className="text-sm text-[#7c8292]">{unavailable}</span></div></section>
        </div>
      </div>
      <footer className="border-t border-[#e1e4ea] bg-[#f7f9fb] p-6"><button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-3 font-bold text-white shadow-md"><span className="material-symbols-outlined">calendar_add_on</span>นัดหมายสัมภาษณ์</button></footer>
    </aside>
  </div>;
}
