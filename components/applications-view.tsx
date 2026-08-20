"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppShell, Header, Sidebar } from "./talentflow";

const candidates = [
  ["สมัครใหม่ (New)", "12", "วิชญะ อารีรัตน์", "3 ปีประสบการณ์", "React · Tailwind"],
  ["คัดกรองเบื้องต้น", "5", "ธนโชติ วงศ์วิวัฒน์", "4 ปีประสบการณ์", "ผู้สมัครมีทักษะ React แข็งแกร่ง แต่ต้องการเงินเดือนสูงกว่าโครงสร้างเล็กน้อย..."],
  ["สัมภาษณ์ (Interview)", "3", "นภัสสร รุ่งเรือง", "6 ปีประสบการณ์", "พรุ่งนี้, 14:00 น."],
  ["ข้อเสนอ/รับเข้าทำงาน", "1", "ธนพล สุขสันต์", "Frontend Lead", "รอเซ็นสัญญา"],
] as const;

function CandidateRow({ item, onSelect }: { item: (typeof candidates)[number]; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className="flex w-full items-center gap-4 border-b border-[#e1e4ea] bg-white px-5 py-4 text-left hover:bg-[#f8f9fb]"><div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dbe3ff] text-sm font-bold text-[#163b92]">{item[2].slice(0, 2)}</div><div className="min-w-48"><b className="text-sm">{item[2]}</b><p className="text-xs text-[#565e74]">{item[3]}</p></div><span className="rounded-md bg-[#e5e7eb] px-3 py-1 text-xs text-[#565e74]">{item[4]}</span><span className="ml-auto text-xs text-[#7c8292]">{item[0]}</span><span aria-hidden="true" className="material-symbols-outlined text-[#7c8292]">chevron_right</span></button>;
}

function Drawer({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState("คัดกรองเบื้องต้น");
  const [message, setMessage] = useState("");
  const titleId = useId();
  const statusLabelId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const controls = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); previousFocus?.focus(); };
  }, [onClose]);

  return <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-y-0 right-0 z-50 flex h-screen w-full max-w-[400px] flex-col border-l border-[#e1e4ea] bg-white shadow-2xl">
    <header className="flex items-center justify-between border-b border-[#e1e4ea] px-6 py-6"><h2 id={titleId} className="text-xl font-bold">รายละเอียดผู้สมัคร</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="ปิดรายละเอียดผู้สมัคร"><span aria-hidden="true" className="material-symbols-outlined text-2xl">close</span></button></header>
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex gap-4"><div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#dbe3ff] text-xl font-bold text-[#163b92]">ส</div><div><h3 className="text-2xl font-bold">สมชาย ใจดี</h3><p>Senior React Developer</p><p className="mt-1 text-sm text-[#7c8292]"><span aria-hidden="true" className="material-symbols-outlined mr-1 align-middle text-[14px]">location_on</span>กรุงเทพมหานคร, ประเทศไทย</p></div></div>
      <div className="mb-6 flex gap-2"><button type="button" onClick={() => setMessage("ยังไม่มีไฟล์เรซูเม่สำหรับผู้สมัครรายนี้")} className="flex-1 rounded-lg border border-[#bec5d8] py-2 text-sm">เรซูเม่ (PDF)</button><button type="button" onClick={() => setMessage("ยังไม่มีอีเมลสำหรับผู้สมัครรายนี้")} className="flex-1 rounded-lg border border-[#bec5d8] py-2 text-sm">อีเมล</button></div>
      {message && <p role="status" className="mb-6 rounded-lg bg-[#dbe3ff] p-3 text-sm">{message}</p>}
      <h4 id={statusLabelId} className="mb-2 text-xs font-bold uppercase text-[#565e74]">สถานะปัจจุบัน</h4><div className="mb-6 flex items-center justify-between rounded-lg border border-[#acd9ee] bg-[#effaff] p-3"><span className="text-sm font-bold text-[#087b99]">● {status}</span><select aria-labelledby={statusLabelId} value={status} onChange={(event) => { setStatus(event.target.value); setMessage(`เปลี่ยนสถานะเป็น ${event.target.value} แล้ว`); }} className="border-0 bg-transparent text-xs text-[#087b99] underline"><option>คัดกรองเบื้องต้น</option><option>สัมภาษณ์</option><option>ปฏิเสธ</option></select></div>
      <h4 className="mb-2 text-xs font-bold uppercase text-[#565e74]">ทักษะหลัก (Primary Skills)</h4><div className="mb-6 flex flex-wrap gap-2">{["React (Expert)", "TypeScript", "Next.js", "Tailwind CSS", "Redux"].map((skill) => <span key={skill} className="rounded-full bg-[#dbe3ff] px-3 py-1 text-sm text-[#163b92]">{skill}</span>)}</div>
      <h4 className="mb-2 text-xs font-bold uppercase text-[#565e74]">ประสบการณ์ทำงาน</h4><div className="mb-6 space-y-4 border-l-2 border-[#e1e4ea] pl-4"><div><b>Senior Frontend Developer</b><p className="text-sm text-[#0057d9]">TechCorp (Thailand) Co., Ltd.</p><p className="text-xs text-[#7c8292]">2021 - ปัจจุบัน (3 ปี)</p></div><div><b>Web Developer</b><p className="text-sm text-[#0057d9]">Digital Agency BKK</p><p className="text-xs text-[#7c8292]">2017 - 2021 (4 ปี)</p></div></div>
      <h4 className="mb-2 text-xs font-bold uppercase text-[#565e74]">การศึกษา</h4><div className="mb-6 border-l-2 border-[#e1e4ea] pl-4"><b>ปริญญาตรี วิศวกรรมคอมพิวเตอร์</b><p className="text-sm text-[#0057d9]">มหาวิทยาลัยเทคโนโลยีแห่งหนึ่ง</p><p className="text-xs text-[#7c8292]">2016 - 2020</p></div>
      <h4 className="mb-2 text-xs font-bold uppercase text-[#565e74]">เงินเดือนที่คาดหวัง</h4><div className="flex justify-between rounded-lg border border-[#e1e4ea] p-3"><b>45,000 บาท</b><span className="text-xs text-[#7c8292]">ปัจจุบัน: 35,000 บาท</span></div>
    </div>
    <footer className="border-t border-[#e1e4ea] p-6"><button type="button" onClick={() => setMessage("เลือกเมนูตารางสัมภาษณ์เพื่อสร้างนัดหมาย")} className="w-full rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] py-3 text-sm font-bold text-white">นัดหมายสัมภาษณ์</button></footer>
  </aside>;
}

export function ApplicationsView() {
  const [view, setView] = useState<"board" | "list">("board");
  const [drawer, setDrawer] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const filtersId = useId();
  const visibleCandidates = candidates.filter((item) => item.some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  return <AppShell><Sidebar activePath="/applications" /><Header showSearch searchValue={query} onSearch={setQuery} /><main className="min-h-screen bg-[#f8f9fb] md:ml-[260px]">
    <div className="px-6 py-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-serif text-3xl font-bold">ติดตามผู้สมัคร</h1><p className="mt-1 text-sm text-[#565e74]">ตรวจสอบผู้สมัคร เปลี่ยนขั้นตอน และบันทึกการตัดสินใจของ HR</p></div><div className="flex flex-wrap gap-3"><div role="group" aria-label="รูปแบบการแสดงผู้สมัคร" className="flex rounded-lg bg-[#e6e8ec] p-1">
      <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm ${view === "board" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined text-[18px]">dashboard</span>บอร์ด</button>
      <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm ${view === "list" ? "bg-white font-semibold text-[#0057d9] shadow-sm" : "text-[#565e74]"}`}><span aria-hidden="true" className="material-symbols-outlined text-[18px]">format_list_bulleted</span>รายการ</button>
    </div><span className="rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm">ตำแหน่ง: Senior Frontend Engineer</span><span className="rounded-lg border border-[#bec5d8] bg-white px-3 py-2 text-sm">สัปดาห์นี้</span><button type="button" aria-expanded={showFilters} aria-controls={filtersId} onClick={() => setShowFilters((value) => !value)} className="rounded-lg bg-[#071d37] px-4 py-2 text-sm font-semibold text-white">ตัวกรองเพิ่มเติม</button></div></div>
    {showFilters && <div id={filtersId} role="status" className="mb-6 rounded-xl border border-[#e1e4ea] bg-white p-4 text-sm">ตัวกรองเพิ่มเติมยังไม่พร้อมใช้งาน</div>}
    {visibleCandidates.length === 0 ? <p role="status" className="rounded-xl border border-[#e1e4ea] bg-white p-6 text-sm">ไม่พบผู้สมัครที่ตรงกับคำค้นหา</p> : view === "board" ? <div className="flex gap-6 overflow-x-auto pb-6">{visibleCandidates.map((item) => <section key={item[0]} className="min-h-[560px] w-80 shrink-0 rounded-xl border border-[#e1e4ea] bg-[#f0f2f5] p-3"><header className="mb-4 flex items-center justify-between px-2"><h2 className="text-base font-bold"><span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#087b99]" />{item[0]}</h2><span className="rounded-full bg-[#dfe2e7] px-2 py-0.5 text-xs">{item[1]}</span></header><button type="button" onClick={() => setDrawer(true)} className="w-full rounded-lg border border-[#e0e3e8] bg-white p-4 text-left shadow-sm hover:shadow-md"><b className="text-sm">{item[2]}</b><p className="text-sm text-[#565e74]">{item[3]}</p><p className="mt-3 text-sm text-[#565e74]">{item[4]}</p></button></section>)}</div> : <div className="overflow-hidden rounded-xl border border-[#e1e4ea] bg-white">{visibleCandidates.map((item) => <CandidateRow key={item[0]} item={item} onSelect={() => setDrawer(true)} />)}</div>}
  </div></main>{drawer && <Drawer onClose={() => setDrawer(false)} />}</AppShell>;
}
