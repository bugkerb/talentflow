"use client";

import { useMemo, useState } from "react";
import { extractResumeText, runScreening, uploadResume } from "../app/screening/actions";
import { createCandidate } from "../app/discovery/actions";
import { createApplication } from "../app/applications/actions";
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

export type ScreeningJob = { id: string; title: string; description: string };

export type ScreeningWorkspaceData = {
  targets: ScreeningTarget[];
  history: ScreeningHistory[];
  jobs?: ScreeningJob[];
  loadError: string | null;
};

type Result = { score: number; summary: string; evidence: string[]; riskFlags: string[]; scores: { skills: number; experience: number; cultureCommunication: number }; reasoning: { skills: string; experience: string; cultureCommunication: string }; strengths: string[]; prescreenQuestions: string[]; teamInterviewReport: { summary: string; focusAreas: string[]; recommendation: string } };
type IntakeResult = Pick<Result, "score" | "summary" | "evidence" | "riskFlags" | "scores" | "reasoning" | "strengths" | "prescreenQuestions" | "teamInterviewReport">;

const panel = "rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,.06)]";
const primary = "rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

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
  const canRun = Boolean(target && (resumeId || file) && !busy);

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
        const uploadForm = new FormData(); uploadForm.set("file", file);
        const uploaded = await uploadResume(target.candidateId, uploadForm);
        if ("error" in uploaded) { setError(uploaded.error.message); return; }
        selectedResumeId = uploaded.data.id;
        setResumeId(selectedResumeId);
        setMessage("อัปโหลดเรซูเม่แล้ว");
      }
      const extractedForm = new FormData(); if (file) extractedForm.set("file", file);
      const extracted = resumeText.trim() ? { data: resumeText.trim() } : file ? await extractResumeText(extractedForm) : { data: "" };
      if ("error" in extracted) { setError(extracted.error.message); return; }
      const extractedText = extracted.data;
      if (!extractedText.trim()) { setError("ไม่พบข้อความในเรซูเม่ กรุณาวางข้อความเรซูเม่ก่อนเริ่มการวิเคราะห์"); return; }
      const response = await runScreening({ applicationId: target.applicationId, resumeId: selectedResumeId, jobDescription: target.jobDescription.trim() || target.jobTitle, resumeText: extractedText });
      if ("error" in response) { setError(response.error.message); return; }
      const screeningResult = response.data.result;
      setResult({ score: screeningResult.score ?? 0, summary: screeningResult.summary, evidence: screeningResult.evidence ?? [], riskFlags: screeningResult.riskFlags, scores: screeningResult.scores, reasoning: screeningResult.reasoning, strengths: screeningResult.strengths, prescreenQuestions: screeningResult.prescreenQuestions, teamInterviewReport: screeningResult.teamInterviewReport });
      setMessage("วิเคราะห์และบันทึกผลเรียบร้อยแล้ว");
    } catch { setError("ไม่สามารถวิเคราะห์เรซูเม่ได้ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  };

  return <AppShell>
<Sidebar activePath="/screening" />
<Header activePath="/screening" />
<main className="min-h-[calc(100vh-4rem)] bg-[#f7f9fb] px-4 py-6 md:ml-[260px] md:px-8 lg:px-10">
<p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p>
<h1 className="mt-2 font-serif text-4xl">คัดกรองเรซูเม่</h1>
<p className="mt-1 text-sm text-[#565e74]">วิเคราะห์เรซูเม่จากข้อมูลจริง โดยมี HR ตรวจสอบก่อนตัดสินใจ</p>
    {data.jobs && <ScreeningIntake jobs={data.jobs} />}
    {data.loadError && <p role="alert" className="mt-5 rounded-lg border border-[#ba1a1a]/30 bg-[#fff7f5] p-4 text-sm text-[#93000a]">{data.loadError}</p>}
    {!data.loadError && !data.jobs && data.targets.length === 0 && <section className={`${panel} mt-6`}>
<h2 className="font-semibold">ยังไม่มีผู้สมัครที่พร้อมคัดกรอง</h2>
<p className="mt-2 text-sm text-[#565e74]">เพิ่มผู้สมัครและตำแหน่งงานก่อน แล้วกลับมาที่หน้านี้เพื่อเริ่มวิเคราะห์</p>
</section>}
    {data.targets.length > 0 && <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
<div className="flex flex-col gap-6 lg:col-span-5">
<section className={panel}>
<h2 className="mb-4 text-lg font-semibold">ข้อมูลผู้สมัคร</h2>
<label className="block text-sm font-semibold">ผู้สมัครและตำแหน่งงาน<select aria-label="ผู้สมัครและตำแหน่งงาน" value={targetId} onChange={(event) => onTargetChange(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-3">{data.targets.map((item) => <option key={item.applicationId} value={item.applicationId}>{item.candidateName} — {item.jobTitle}</option>)}</select>
</label>
<div role="tablist" aria-label="วิธีเพิ่มเรซูเม่" className="mt-6 flex border-b border-[#e0e3e5]">
<button type="button" role="tab" aria-selected={tab === "upload"} onClick={() => setTab("upload")} className={`px-4 py-3 text-sm ${tab === "upload" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>อัปโหลดไฟล์</button>
<button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} className={`px-4 py-3 text-sm ${tab === "text" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>วางข้อความ</button>
</div>{tab === "upload" ? <label htmlFor="screening-resume-file" className="mt-5 block cursor-pointer rounded-lg border-2 border-dashed border-[#c2c6d9] p-8 text-center hover:bg-[#f2f4f6] focus-within:ring-2 focus-within:ring-[#004cca]">
<input id="screening-resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
<span aria-hidden="true" className="material-symbols-outlined text-4xl text-[#004cca]">cloud_upload</span>
<p className="mt-2 font-medium">ลากไฟล์มาวางที่นี่ หรือ <span className="text-[#004cca]">เบราว์</span>
</p>
<p className="mt-1 text-sm text-[#565e74]">{file?.name ?? target?.resumeFileName ?? "รองรับ PDF, DOCX (สูงสุด 5MB)"}</p>
</label> : <textarea aria-label="ข้อความเรซูเม่" value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="mt-5 block w-full rounded-lg border border-[#c2c6d9] p-4 text-sm" rows={9} placeholder="วางข้อความเรซูเม่ที่นี่..." />}{tab === "upload" && <textarea aria-label="ข้อความเรซูเม่" value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="mt-4 block w-full rounded-lg border border-[#c2c6d9] p-4 text-sm" rows={5} placeholder="วางข้อความเรซูเม่เพื่อให้ AI วิเคราะห์หลังอัปโหลดไฟล์..." />}<button type="button" disabled={!canRun} onClick={startAnalysis} className={`${primary} mt-5 flex w-full items-center justify-center gap-2`}>
<span aria-hidden="true" className="material-symbols-outlined">psychology</span>{busy ? "กำลังวิเคราะห์..." : "เริ่มการวิเคราะห์ AI"}</button>{message && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#dbe1ff] p-3 text-sm text-[#00174b]">{message}</p>}{error && <p role="alert" className="mt-3 rounded-lg bg-[#fff7f5] p-3 text-sm text-[#93000a]">{error}</p>}</section>
</div>
<div className="space-y-6 lg:col-span-7">{result ? <>
<section className={`${panel} grid gap-4 md:grid-cols-3`}>
<div>
<p className="text-xs font-bold text-[#565e74]">คะแนนจากระบบ</p>
<strong className="mt-2 block font-serif text-4xl text-[#004cca]">{result.score}<span className="text-base text-[#565e74]">/10</span>
</strong>
</div>
<div className="md:col-span-2">
<p className="text-xs font-bold text-[#565e74]">สรุปผล</p>
<p className="mt-2 text-sm">{result.summary}</p>
</div>
</section>
<section className={panel}>
<h2 className="flex items-center gap-2 font-semibold">
<span className="material-symbols-outlined text-[#0f766e]">fact_check</span>หลักฐานจากผลวิเคราะห์</h2>{result.evidence.length ? <ul className="mt-4 space-y-3">{result.evidence.map((item) => <li key={item} className="rounded-lg bg-[#f2f4f6] p-3 text-sm">{item}</li>)}</ul> : <p className="mt-4 text-sm text-[#565e74]">ระบบไม่ได้ส่งหลักฐานเพิ่มเติม</p>}<h3 className="mt-6 flex items-center gap-2 font-semibold">
<span className="material-symbols-outlined text-[#ba1a1a]">warning</span>ข้อควรตรวจสอบ</h3>{result.riskFlags.length ? <ul className="mt-3 space-y-2 text-sm text-[#93000a]">{result.riskFlags.map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p className="mt-3 text-sm text-[#565e74]">ไม่พบข้อควรตรวจสอบจากระบบ</p>}</section>
</> : <section className={`${panel} min-h-[320px]`}>
<h2 className="font-semibold">ผลการประเมิน</h2>
<p className="mt-3 text-sm text-[#565e74]">ผลลัพธ์จะแสดงที่นี่หลังจากวิเคราะห์และบันทึกสำเร็จ</p>
</section>}</div>
</div>}</main>
</AppShell>;
}

function ScreeningIntake({ jobs }: { jobs: ScreeningJob[] }) {
  const [jobId, setJobId] = useState("");
  const [tab, setTab] = useState<"upload" | "text">("upload");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const selectedJob = jobs.find((job) => job.id === jobId);
  const hasInput = Boolean(file || resumeText.trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);

  const startIntakeAnalysis = async () => {
    if (!selectedJob || !hasInput || busy) return;
    setBusy(true); setError(""); setMessage(""); setResult(null);
    try {
      const baseName = (file?.name ?? fileName).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const candidate = await createCandidate({ fullName: baseName || "ผู้สมัครจากเรซูเม่", source: "manual", sourceDetail: "เพิ่มจากหน้าคัดกรองเรซูเม่" });
      if (candidate.error || !candidate.data) { setError(candidate.error?.message ?? "สร้างข้อมูลผู้สมัครไม่สำเร็จ"); return; }
      const application = await createApplication(candidate.data.id, selectedJob.id);
      if (application.error || !application.data) { setError(application.error?.message ?? "สร้างใบสมัครไม่สำเร็จ"); return; }
      const inputFile = file ?? new File([resumeText], "resume.txt", { type: "text/plain" });
      const uploadForm = new FormData(); uploadForm.set("file", inputFile);
      const uploaded = await uploadResume(candidate.data.id, uploadForm);
      if ("error" in uploaded) { setError(uploaded.error.message); return; }
      const extractedForm = new FormData(); extractedForm.set("file", inputFile);
      const extracted = resumeText.trim() ? { data: resumeText.trim() } : await extractResumeText(extractedForm);
      if ("error" in extracted) { setError(extracted.error.message); return; }
      const extractedText = extracted.data;
      if (!extractedText.trim()) { setError("ไม่พบข้อความในเรซูเม่ กรุณาตรวจสอบไฟล์หรือวางข้อความเรซูเม่"); return; }
      const screened = await runScreening({ applicationId: application.data.id, resumeId: uploaded.data.id, jobDescription: selectedJob.description.trim() || selectedJob.title, resumeText: extractedText });
      if ("error" in screened) { setError(screened.error.message); return; }
      setResult({ ...screened.data.result, score: screened.data.result.score ?? 0, evidence: screened.data.result.evidence ?? [] });
      setMessage("เพิ่มผู้สมัครและวิเคราะห์เรซูเม่เรียบร้อยแล้ว");
    } catch { setError("ไม่สามารถเริ่มการวิเคราะห์ได้ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto mt-6 grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12">
    <div className="flex flex-col gap-6 lg:col-span-5">
      <section className={panel}>
        <h2 className="mb-4 text-lg font-semibold">ข้อมูลผู้สมัคร</h2>
        <div className="mb-6 flex border-b border-[#e0e3e5]">
          <button type="button" onClick={() => setTab("upload")} className={`px-4 py-2 text-sm ${tab === "upload" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>อัปโหลดไฟล์</button>
          <button type="button" onClick={() => setTab("text")} className={`px-4 py-2 text-sm ${tab === "text" ? "border-b-2 border-[#004cca] font-bold text-[#004cca]" : "text-[#565e74]"}`}>วางข้อความ</button>
        </div>
        {tab === "upload" ? <label htmlFor="screening-intake-file" className="mb-6 block cursor-pointer rounded-lg border-2 border-dashed border-[#c2c6d9] p-8 text-center hover:bg-[#f2f4f6]">
          <input id="screening-intake-file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onInput={(event) => { const next = event.currentTarget.files?.[0] ?? null; setFile(next); setFileName(next?.name ?? ""); setError(""); setMessage(""); }} onChange={(event) => { const next = event.currentTarget.files?.[0] ?? null; setFile(next); setFileName(next?.name ?? ""); setError(""); setMessage(""); }} />
          <span aria-hidden="true" className="material-symbols-outlined text-[32px] text-[#004cca]">cloud_upload</span>
          <p className="mt-2 font-medium">ลากไฟล์มาวางที่นี่ หรือ <span className="text-[#004cca]">เบราว์</span></p>
          <p className="mt-1 text-sm text-[#565e74]">{fileName || "รองรับ PDF, DOCX, TXT (สูงสุด 5MB)"}</p>
        </label> : <textarea aria-label="ข้อความเรซูเม่" value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="mb-6 block w-full resize-none rounded-lg border border-[#c2c6d9] p-4 text-sm" rows={9} placeholder="วางข้อความเรซูเม่ที่นี่..." />}
        <label className="mb-6 block text-xs font-bold uppercase tracking-wide text-[#565e74]">ตำแหน่งงานที่ต้องการประเมิน<select aria-label="ตำแหน่งงานที่ต้องการประเมิน" value={jobId} onChange={(event) => setJobId(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-4 py-3 text-sm font-normal normal-case"><option value="">เลือกตำแหน่งงาน</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
        <button type="button" disabled={!selectedJob || !hasInput || busy} onClick={() => void startIntakeAnalysis()} className={`${primary} flex w-full items-center justify-center gap-2`}><span aria-hidden="true" className="material-symbols-outlined">psychology</span>{busy ? "กำลังวิเคราะห์..." : "เริ่มการวิเคราะห์ AI"}</button>
        {message && <p role="status" className="mt-3 rounded-lg bg-[#dbe1ff] p-3 text-sm text-[#00174b]">{message}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff7f5] p-3 text-sm text-[#93000a]">{error}</p>}
      </section>
    </div>
    <div className="space-y-6 lg:col-span-7">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{[["ความเหมาะสมโดยรวม", result?.score, "stars"], ["ทักษะที่ตรงกัน (Hard Skills)", result?.scores.skills, "code"], ["ประสบการณ์การทำงาน", result?.scores.experience, "work_history"], ["การสื่อสารและวัฒนธรรม", result?.scores.cultureCommunication, "forum"]].map(([label, scoreValue, icon]) => <article key={label} aria-label={`${label} ${scoreValue ?? "ยังไม่มีคะแนน"}${scoreValue === undefined ? "" : " จาก 10"}`} className={`${panel} flex min-h-[150px] flex-col justify-between`}><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wide text-[#565e74]">{label}</span><span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#004cca]">{icon}</span></div><div className="flex items-baseline gap-1"><strong className="font-serif text-4xl text-[#191c1e]">{scoreValue ?? "—"}</strong><span className="text-sm text-[#565e74]">/10</span></div><p className="text-sm text-[#565e74]">{result ? "ผลจาก AI" : "รอผลวิเคราะห์"}</p></article>)}</div>
      <section className={`${panel} overflow-hidden p-0`}><div className="flex border-b border-[#e0e3e5] px-4"><button type="button" className="border-b-2 border-[#004cca] px-4 py-4 text-sm font-bold text-[#004cca]">ผลการประเมิน (Scorecard)</button><button type="button" className="px-4 py-4 text-sm text-[#565e74]">ข้อมูลที่ดึงได้ (Extracted)</button></div><div className="space-y-6 p-6"><div><h3 className="mb-3 flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-[#0f766e]">check_circle</span>จุดแข็ง (Strengths)</h3>{result ? <ul className="list-disc space-y-1 pl-5 text-sm">{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-[#565e74]">ผลการวิเคราะห์จะแสดงหลังจากส่งไฟล์หรือข้อความเรซูเม่</p>}</div><div><h3 className="mb-3 flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-[#ba1a1a]">warning</span>ความเสี่ยงที่พบ (Risks)</h3>{result ? <ul className="list-disc space-y-1 pl-5 text-sm">{(result.riskFlags.length ? result.riskFlags : ["ไม่พบความเสี่ยง"]).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-[#565e74]">ระบบจะแสดงข้อควรตรวจสอบพร้อมหลักฐาน</p>}</div>{result && <><div><h3 className="font-semibold">สรุปผล</h3><p className="mt-2 text-sm">{result.summary}</p></div><div><h3 className="font-semibold">หลักฐาน</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="font-semibold">เหตุผลการให้คะแนน</h3><p className="mt-2 text-sm">ทักษะ: {result.reasoning.skills}</p><p className="text-sm">ประสบการณ์: {result.reasoning.experience}</p><p className="text-sm">การสื่อสาร: {result.reasoning.cultureCommunication}</p></div><div><h3 className="font-semibold">คำถามคัดกรอง</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.prescreenQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="font-semibold">รายงานสัมภาษณ์ทีม</h3><p className="mt-2 text-sm">{result.teamInterviewReport.summary}</p><p className="text-sm">จุดที่ควรเจาะลึก: {result.teamInterviewReport.focusAreas.join(", ")}</p><p className="text-sm">คำแนะนำ: {result.teamInterviewReport.recommendation}</p></div></>}<div className="border-t border-[#e0e3e5] pt-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-[#565e74]">edit_note</span>ปรับแก้ผลการประเมิน (Override)</h3><textarea className="block w-full resize-none rounded-lg border border-[#c2c6d9] p-3 text-sm" rows={3} placeholder="ระบุเหตุผลหากต้องการปรับเปลี่ยนคะแนนหรือสถานะที่ AI ประเมินไว้..." /></div></div></section>
    </div>
  </div>;
}
