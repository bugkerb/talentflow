"use client";
import { useState } from "react";
import { AppShell, Header, Sidebar } from "./talentflow";

const pageData: Record<string, { title: string; description: string; primary: string }> = {
  jobs: { title: "ตำแหน่งงาน", description: "สร้างและจัดการประกาศรับสมัครงาน", primary: "สร้างตำแหน่งงาน" },
  discovery: { title: "ค้นหาผู้สมัคร", description: "เลือกตำแหน่งงานก่อนเริ่มค้นหาและตรวจหลักฐาน", primary: "เริ่มค้นหา" },
  screening: { title: "คัดกรองเรซูเม่", description: "วิเคราะห์เรซูเม่โดยมี HR ตรวจสอบก่อนตัดสินใจ", primary: "เริ่มการวิเคราะห์" },
  applications: { title: "ติดตามผู้สมัคร", description: "เปลี่ยนขั้นตอนและบันทึกการตัดสินใจของ HR", primary: "ดูผู้สมัครที่ต้องทำ" },
  interviews: { title: "ตารางนัดสัมภาษณ์", description: "สร้างนัดหมายโดยตรวจสอบเวลาชนก่อนเสมอ", primary: "นัดหมายใหม่" },
  settings: { title: "ตั้งค่าพื้นที่ทำงาน", description: "จัดการการแจ้งเตือน สิทธิ์ และการเชื่อมต่อ", primary: "บันทึกการตั้งค่า" },
  help: { title: "ศูนย์ช่วยเหลือ", description: "คำแนะนำและแนวทางแก้ไขปัญหาตาม workflow", primary: "ค้นหาคำตอบ" },
};

export function WorkspacePage({ page }: { page: keyof typeof pageData }) {
  const data = pageData[page]; const [job, setJob] = useState(""); const [message, setMessage] = useState("");
  const action = () => { if (page === "discovery" && !job) { setMessage("กรุณาเลือกตำแหน่งงานก่อนเริ่มค้นหา"); return; } setMessage(`${data.primary}สำเร็จ`); };
  return <AppShell><Sidebar /><Header /><main className="mx-auto max-w-7xl space-y-6 px-4 py-6 xl:ml-[260px] md:px-6"><div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">TalentFlow</p><h2 className="mt-2 font-serif text-4xl">{data.title}</h2><p className="mt-2 text-[#565e74]">{data.description}</p></div><section className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-lg font-semibold">ขั้นตอนถัดไป</h3><p className="mt-1 text-sm text-[#565e74]">ทำงานต่อจาก context ที่ชัดเจน และตรวจผลลัพธ์ก่อนบันทึก</p></div>{page !== "settings" && page !== "help" && <button onClick={action} className="rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 text-sm font-bold text-white">{data.primary}</button>}</div>{(page === "jobs" || page === "discovery" || page === "screening" || page === "applications" || page === "interviews") && <label className="mt-6 block max-w-xl text-sm font-semibold">ตำแหน่งงาน<select value={job} onChange={(event) => setJob(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2"><option value="">เลือกตำแหน่งงาน</option><option>Tech Lead / Senior Developer</option><option>Senior Frontend Engineer</option><option>Product Designer</option></select></label>}<div className="mt-6 grid gap-4 md:grid-cols-3"><article className="rounded-lg bg-[#f2f4f6] p-5"><span className="text-sm text-[#565e74]">สถานะ</span><strong className="mt-2 block">รอการดำเนินการ</strong></article><article className="rounded-lg bg-[#f2f4f6] p-5"><span className="text-sm text-[#565e74]">ข้อมูลที่ต้องตรวจ</span><strong className="mt-2 block">8 รายการ</strong></article><article className="rounded-lg bg-[#f2f4f6] p-5"><span className="text-sm text-[#565e74]">ขั้นตอนถัดไป</span><strong className="mt-2 block">ตรวจสอบโดย HR</strong></article></div>{message && <p role="status" className="mt-5 rounded-lg bg-[#dbe1ff] p-3 text-sm text-[#00174b]">{message}</p>}</section></main></AppShell>;
}
