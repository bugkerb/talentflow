"use client";

import { useMemo, useState } from "react";
import { runScreening, uploadResume } from "../app/screening/actions";
import { AppShell, Header, Sidebar } from "./talentflow";

export type ScreeningTarget = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  resumeId: string | null;
  resumeFileName: string | null;
};

export type ScreeningHistory = {
  id: string;
  applicationId: string;
  resumeId: string;
  status: string;
  score: number | null;
  summary: string;
  evidence: string[];
  risks: string[];
  createdAt: string;
};

export type ScreeningWorkspaceData = {
  targets: ScreeningTarget[];
  history: ScreeningHistory[];
  loadError: string | null;
};

type Result = { score: number; summary: string; evidence: string[]; riskFlags: string[] };

const panel = "rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,.06)]";
const primary = "rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-lg border border-[#c2c6d9] bg-white px-4 py-3 text-sm font-semibold text-[#004cca] disabled:cursor-not-allowed disabled:opacity-50";

export function ScreeningWorkspace({ data }: { data: ScreeningWorkspaceData }) {
  const [targetId, setTargetId] = useState(data.targets[0]?.applicationId ?? "");
  const [tab, setTab] = useState<"upload" | "text">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState(data.targets[0]?.resumeId ?? "");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const target = useMemo(() => data.targets.find((item) => item.applicationId === targetId) ?? null, [data.targets, targetId]);
  const canRun = Boolean(target && resumeId && resumeText.trim() && !busy);

  const onTargetChange = (value: string) => {
    const next = data.targets.find((item) => item.applicationId === value);
    setTargetId(value);
    setResumeId(next?.resumeId ?? "");
    setFile(null);
    setResult(null);
    setMessage("");
    setError("");
  };

  const onFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setMessage("");
    setError("");
  };

  const startAnalysis = async () => {
    if (!target) return;
    setBusy(true); setError(""); setMessage(""); setResult(null);
    try {
      let selectedResumeId = resumeId;
      if (file) {
        const uploaded = await uploadResume(target.candidateId, file);
        if ("error" in uploaded) { setError(uploaded.error.message); return; }
        selectedResumeId = uploaded.data.id;
        setResumeId(selectedResumeId);
        setMessage("อัปโหลดเรซูเม่แล้ว กรุณาวางข้อความเรซูเม่เพื่อเริ่มวิเคราะห์");
      }
      if (!resumeText.trim()) { setError("กรุณาวางข้อความเรซูเม่ก่อนเริ่มการวิเคราะห์"); return; }
      const response = await runScreening({ applicationId: target.applicationId, resumeId: selectedResumeId, jobDescription: target.jobDescription, resumeText });
      if ("error" in response) { setError(response.error.message); return; }
      const screeningResult = response.data.result;
      setResult({ score: screeningResult.score, summary: screeningResult.summary, evidence: screeningResult.evidence, riskFlags: screeningResult.riskFlags });
      setMessage("วิเคราะห์และบันทึกผลเรียบร้อยแล้ว");
    } catch { setError("ไม่สามารถวิเคราะห์เรซูเม่ได้ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  };

  return <AppShell><Sidebar activePath="/screening" /><Header activePath="/screening" /><main className="min-h-[calc(100vh-4rem)] bg-[#f7f9fb] px-4 py-6 md:ml-[260px] md:px-8 lg:px-10"><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p><h1 className="mt-2 font-serif text-4xl">คัดกรองเรซูเม่</h1><p className="mt-1 text-sm text-[#565e74]">วิเคราะห์เรซูเม่จากข้อมูลจริง โดยมี HR ตรวจสอบก่อนตัดสินใจ</p>
    {data.loadError && <p role="alert" className="mt-5 rounded-lg border border-[#ba1a1a]/30 bg-[#fff7f5] p-4 text-sm text-[#93000a]">{data.loadError}</p>}
    {!data.loadError && data.targets.length === 0 && <section className={`${panel} mt-6`}><h2 className="font-semibold">ยังไม่มีผู้สมัครที่พร้อมคัดกรอง</h2><p className="mt-2 text-sm text-[#565e74]">เพิ่มผู้สมัครและตำแหน่งงานก่อน แล้วกลับมาที่หน้านี้เพื่อเริ่มวิเคราะห์</p></section>}
    {data.targets.length > 0 && <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12"><div className="flex flex-col gap-6 lg:col-span-5"><section className={panel}><h2 className="mb-4 text-lg font-semibold">ข้อมูลผู้สมัคร</h2><label className="block text-sm font-semibold">ผู้สมัครและตำแหน่งงาน<select aria-label="ผู้สมัครและตำแหน่งงาน" value={targetId} onChange={(event) => onTargetChange(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-3">{data.targets.map((item) => <option key={item.applicationId} value={item.applicationId}>{item.candidateName} — {item.jobTitle}</option>)}</select></label><div role="tablist" aria-label="วิธีเพิ่มเรซูเม่" className="mt-6 flex border-b border-[#e0e3e5]"><button type="button" role="tab" aria-selected={tab === "upload"} onClick={() => setTab("upload")} className={`px-4 py-3 text-sm ${tab === "upload" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>อัปโหลดไฟล์</button><button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} className={`px-4 py-3 text-sm ${tab === "text" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>วางข้อความ</button></div>{tab === "upload" ? <label htmlFor="screening-resume-file" className="mt-5 block cursor-pointer rounded-lg border-2 border-dashed border-[#c2c6d9] p-8 text-center hover:bg-[#f2f4f6] focus-within:ring-2 focus-within:ring-[#004cca]"><input id="screening-resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /><span aria-hidden="true" className="material-symbols-outlined text-4xl text-[#004cca]">cloud_upload</span><p className="mt-2 font-medium">ลากไฟล์มาวางที่นี่ หรือ <span className="text-[#004cca]">เบราว์</span></p><p className="mt-1 text-sm text-[#565e74]">{file?.name ?? target?.resumeFileName ?? "รองรับ PDF, DOCX (สูงสุด 5MB)"}</p></label> : <textarea aria-label="ข้อความเรซูเม่" value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="mt-5 block w-full rounded-lg border border-[#c2c6d9] p-4 text-sm" rows={9} placeholder="วางข้อความเรซูเม่ที่นี่..." />}{tab === "upload" && <textarea aria-label="ข้อความเรซูเม่" value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="mt-4 block w-full rounded-lg border border-[#c2c6d9] p-4 text-sm" rows={5} placeholder="วางข้อความเรซูเม่เพื่อให้ AI วิเคราะห์หลังอัปโหลดไฟล์..." />}<button type="button" disabled={!canRun} onClick={startAnalysis} className={`${primary} mt-5 flex w-full items-center justify-center gap-2`}><span aria-hidden="true" className="material-symbols-outlined">psychology</span>{busy ? "กำลังวิเคราะห์..." : "เริ่มการวิเคราะห์ AI"}</button>{message && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#dbe1ff] p-3 text-sm text-[#00174b]">{message}</p>}{error && <p role="alert" className="mt-3 rounded-lg bg-[#fff7f5] p-3 text-sm text-[#93000a]">{error}</p>}</section><section className={panel}><h2 className="mb-4 font-semibold">สถานะการประมวลผล</h2><p className="text-sm text-[#565e74]">{busy ? "กำลังส่งข้อมูลให้ระบบวิเคราะห์..." : result ? "บันทึกผลจากระบบแล้ว" : "รอข้อมูลจากผู้สมัคร"}</p>{busy && <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-[#0062ff]" />}</section></div><div className="space-y-6 lg:col-span-7">{result ? <><section className={`${panel} grid gap-4 md:grid-cols-3`}><div><p className="text-xs font-bold text-[#565e74]">คะแนนจากระบบ</p><strong className="mt-2 block font-serif text-4xl text-[#004cca]">{result.score}<span className="text-base text-[#565e74]">/100</span></strong></div><div className="md:col-span-2"><p className="text-xs font-bold text-[#565e74]">สรุปผล</p><p className="mt-2 text-sm">{result.summary}</p></div></section><section className={panel}><h2 className="flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-[#0f766e]">fact_check</span>หลักฐานจากผลวิเคราะห์</h2>{result.evidence.length ? <ul className="mt-4 space-y-3">{result.evidence.map((item) => <li key={item} className="rounded-lg bg-[#f2f4f6] p-3 text-sm">{item}</li>)}</ul> : <p className="mt-4 text-sm text-[#565e74]">ระบบไม่ได้ส่งหลักฐานเพิ่มเติม</p>}<h3 className="mt-6 flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-[#ba1a1a]">warning</span>ข้อควรตรวจสอบ</h3>{result.riskFlags.length ? <ul className="mt-3 space-y-2 text-sm text-[#93000a]">{result.riskFlags.map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p className="mt-3 text-sm text-[#565e74]">ไม่พบข้อควรตรวจสอบจากระบบ</p>}</section></> : <section className={`${panel} min-h-[320px]`}><h2 className="font-semibold">ผลการประเมิน</h2><p className="mt-3 text-sm text-[#565e74]">ผลลัพธ์จะแสดงที่นี่หลังจากวิเคราะห์และบันทึกสำเร็จ</p></section>}</div></div>}</main></AppShell>;
}
