"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Header, Sidebar } from "./talentflow";
import type { InterviewListItem } from "@/application/interview-ports";
import { cancelInterview, rescheduleInterview, scheduleInterview } from "../app/interviews/actions";

type CalendarView = "day" | "week" | "month";
type InterviewEventKind = "scheduled" | "conflict" | "internal";

type InterviewEvent = {
  id: string;
  date: string;
  title: string;
  candidate: string;
  detail?: string;
  kind: InterviewEventKind;
  top: number;
  height: number;
  interview: InterviewListItem;
};

const viewLabels: Record<CalendarView, string> = { day: "วัน", week: "สัปดาห์", month: "เดือน" };
const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const formatInputDate = (date: Date) => dateKey(date);
const formatShortDate = (date: Date) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(date);
const formatFullDate = (date: Date) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(date);
const formatMonth = (date: Date) => new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(date);
const formatWeekday = (date: Date) => new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(date).replace("วัน", "");

const toEvent = (interview: InterviewListItem): InterviewEvent => {
  const start = new Date(interview.startsAt);
  const duration = Math.max(30, (new Date(interview.endsAt).getTime() - start.getTime()) / 60000);
  return { id: interview.id, date: dateKey(start), title: interview.interviewType, candidate: interview.candidateName, detail: `${interview.jobTitle} · ${interview.status === "cancelled" ? "ยกเลิกแล้ว" : interview.googleMeetUrl ? "ออนไลน์" : "นัดหมาย"}`, kind: interview.status === "cancelled" ? "internal" : "scheduled", top: Math.max(0, (start.getHours() - 9) * 64 + start.getMinutes()), height: Math.max(48, duration), interview };
};

const viewDates = (view: CalendarView, date: Date) => {
  if (view === "day") return [date];
  if (view === "week") return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
  const firstDay = startOfMonth(date);
  const gridStart = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

const eventTone = (kind: InterviewEventKind) => ({
  scheduled: "border-[#0057d9] bg-[#dbe3ff]",
  conflict: "border-[#ba1a1a] bg-[#ffdad6]",
  internal: "border-[#087b99] bg-[#d4f1f0]",
}[kind]);

export function InterviewsView({ initialInterviews = [], initialScheduleApplicationId = "", initialScheduleDate = "", initialScheduleStart = "", initialScheduleEnd = "" }: { initialInterviews?: InterviewListItem[]; initialScheduleApplicationId?: string; initialScheduleDate?: string; initialScheduleStart?: string; initialScheduleEnd?: string }) {
  const [today] = useState(() => startOfDay(new Date()));
  const [calendarDate, setCalendarDate] = useState(today);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(initialScheduleDate || formatInputDate(today));
  const [scheduleStart, setScheduleStart] = useState(initialScheduleStart || "11:00");
  const [scheduleEnd, setScheduleEnd] = useState(initialScheduleEnd || "11:30");
  const [scheduleTargetId, setScheduleTargetId] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [detailDate, setDetailDate] = useState(formatInputDate(today));
  const [detailTargetId, setDetailTargetId] = useState("");
  const detailsRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const cancelDialogRef = useRef<HTMLElement>(null);
  const [interviews, setInterviews] = useState(initialInterviews);
  useEffect(() => {
    if (!initialScheduleApplicationId) return;
    const target = initialInterviews.find((item) => item.applicationId === initialScheduleApplicationId);
    if (target) setScheduleTargetId(target.id);
    else setMessage("ไม่พบใบสมัครนี้ในรายการนัดหมาย กรุณาเลือกผู้สมัครจากรายการ");
    setScheduleOpen(true);
  }, [initialInterviews, initialScheduleApplicationId]);
  const interviewEvents = useMemo(() => interviews.map(toEvent), [interviews]);
  const visibleDates = useMemo(() => viewDates(calendarView, calendarDate), [calendarDate, calendarView]);
  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return interviewEvents.filter((event) => !query || `${event.title} ${event.candidate} ${event.detail ?? ""}`.toLocaleLowerCase().includes(query));
  }, [interviewEvents, searchTerm]);
  const selectedDetail = interviews.find((item) => item.id === detailTargetId) ?? null;
  const conflicts = useMemo(() => interviews.filter((item, index, all) => item.status === "scheduled" && all.some((other, otherIndex) => otherIndex !== index && other.status === "scheduled" && other.interviewerId === item.interviewerId && new Date(item.startsAt) < new Date(other.endsAt) && new Date(other.startsAt) < new Date(item.endsAt))), [interviews]);
  const periodLabel = calendarView === "day"
    ? formatFullDate(calendarDate)
    : calendarView === "month"
      ? formatMonth(calendarDate)
      : `${formatShortDate(visibleDates[0])} – ${formatShortDate(visibleDates[visibleDates.length - 1])}`;
  const focusRescheduleForm = (value?: string | FormEvent<HTMLButtonElement>) => { const id = typeof value === "string" ? value : undefined; if (id) { setDetailTargetId(id); const target = interviews.find((item) => item.id === id); if (target) setDetailDate(formatInputDate(new Date(target.startsAt))); } setMessage("เลือกเวลาใหม่เพื่อเลื่อนนัดหมาย"); timeRef.current?.focus(); };
  const showDetails = () => { setMessage("แสดงรายละเอียดนัดหมายที่มีเวลาซ้อนทับกัน"); detailsRef.current?.focus(); };
  const actionError = (result: { error?: string | { message?: string }; message?: string; [key: string]: unknown }) => typeof result.error === "string" ? result.error : result.error?.message ?? result.message ?? "เซิร์ฟเวอร์ไม่สามารถดำเนินการได้";
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const target = interviews.find((item) => item.id === detailTargetId); if (!target) { setMessage("คลิกนัดหมายบนปฏิทินเพื่อเลือกก่อนแก้ไข"); return; } const start = new Date(`${form.get("date")}T${form.get("time")}:00`); const result = await rescheduleInterview({ interviewId: target.id, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 30 * 60000).toISOString(), reason: String(form.get("reason") ?? "") }, target.version); if ("data" in result && result.data) { setInterviews((current) => current.map((item) => item.id === target.id ? { ...item, ...result.data } : item)); setMessage("บันทึกการเลื่อนนัดหมายแล้ว"); } else setMessage(actionError(result)); };
  const createSchedule = async () => { const target = interviews.find((item) => item.id === scheduleTargetId); if (!target) { setMessage("โปรดเลือกผู้สมัครและนัดหมายต้นแบบ"); return; } const start = new Date(`${scheduleDate}T${scheduleStart}:00`); const end = new Date(`${scheduleDate}T${scheduleEnd}:00`); const result = await scheduleInterview({ id: crypto.randomUUID(), applicationId: target.applicationId, interviewType: target.interviewType, startsAt: start.toISOString(), endsAt: end.toISOString(), timezone: target.timezone, interviewerId: target.interviewerId, description: target.description, additionalQuestions: target.additionalQuestions, idempotencyKey: crypto.randomUUID() }); if ("data" in result && result.data) { setInterviews((current) => [...current, { ...target, ...result.data }]); setMessage("สร้างนัดหมายแล้ว"); setScheduleOpen(false); } else setMessage(actionError(result)); };
  const handleCancel = async () => { const target = interviews.find((item) => item.id === cancelTargetId); if (!target) { setMessage("ไม่พบนัดหมายที่ต้องการยกเลิก"); return; } const result = await cancelInterview({ interviewId: target.id, reason: "ยกเลิกโดย HR" }, target.version); if ("data" in result && result.data) { setInterviews((current) => current.map((item) => item.id === target.id ? { ...item, ...result.data } : item)); setCancelOpen(false); setMessage("ยกเลิกนัดหมายแล้ว"); } else setMessage("ยกเลิกไม่สำเร็จ กรุณาโหลดข้อมูลใหม่"); };
  const handleReset = () => { setDetailDate(selectedDetail ? formatInputDate(new Date(selectedDetail.startsAt)) : formatInputDate(today)); setMessage("ยกเลิกการเปลี่ยนแปลงแล้ว"); };
  const moveCalendar = (amount: number) => setCalendarDate(calendarView === "month" ? addMonths(calendarDate, amount) : addDays(calendarDate, calendarView === "week" ? amount * 7 : amount));
  const resetCalendar = () => setCalendarDate(today);
  const eventsForDate = (date: Date) => filteredEvents.filter((event) => event.date === dateKey(date));
  const selectEvent = (event: InterviewEvent): void => { setDetailTargetId(event.interview.id); setDetailDate(formatInputDate(new Date(event.interview.startsAt))); detailsRef.current?.focus(); };
  useEffect(() => {
    const handleCalendarEventClick = (event: Event): void => {
      const element = (event.target as HTMLElement | null)?.closest("article");
      if (!element) return;
      const text = element.textContent ?? "";
      const match = interviews.find((item) => text.includes(item.interviewType) && text.includes(item.candidateName));
      if (match) selectEvent(toEvent(match));
    };
    document.addEventListener("click", handleCalendarEventClick);
    return () => document.removeEventListener("click", handleCalendarEventClick);
  }, [interviews]);
  useEffect(() => {
    if (!cancelOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = cancelDialogRef.current;
    const controls = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('input, button:not([disabled])')) : [];
    controls[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setCancelOpen(false); return; }
      if (event.key !== "Tab" || controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [cancelOpen]);

  return <AppShell><Sidebar activePath="/interviews" /><Header /><main className="min-h-screen bg-[#f8f9fb] md:ml-[260px]"><div className="px-4 py-5 sm:px-6 sm:py-6">
    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h1 className="font-serif text-3xl font-bold">ตารางนัดสัมภาษณ์</h1><p className="mt-1 text-sm text-[#565e74]">จัดการนัดหมาย ตรวจสอบเวลาซ้อนทับ และติดตามผู้สมัคร</p></div><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"><button type="button" onClick={() => setScheduleOpen(true)} className="rounded-lg bg-[#0057d9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0048b8]">นัดหมายสัมภาษณ์</button><div role="group" aria-label="มุมมองปฏิทิน" className="flex w-full rounded-lg bg-[#e6e8ec] p-1 sm:w-auto">{(Object.keys(viewLabels) as CalendarView[]).map((view) => <button key={view} type="button" aria-pressed={calendarView === view} onClick={() => setCalendarView(view)} className={`flex-1 rounded-md px-4 py-2 text-sm transition sm:flex-none ${calendarView === view ? "bg-white font-semibold text-[#071d37] shadow-sm" : "text-[#565e74] hover:text-[#071d37]"}`}>{viewLabels[view]}</button>)}</div></div></div>
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#d9dee7] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center justify-between gap-2 sm:justify-start"><button type="button" aria-label="ช่วงก่อนหน้า" onClick={() => moveCalendar(-1)} className="rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm hover:bg-[#f2f4f6]">ก่อนหน้า</button><button type="button" onClick={resetCalendar} className="rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm hover:bg-[#f2f4f6]">วันนี้</button><button type="button" aria-label="ช่วงถัดไป" onClick={() => moveCalendar(1)} className="rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm hover:bg-[#f2f4f6]">ถัดไป</button></div><h2 aria-live="polite" className="order-first text-center text-base font-semibold text-[#071d37] sm:order-none">{periodLabel}</h2><label className="relative mb-0 block sm:w-64"><span className="sr-only">ค้นหานัดสัมภาษณ์</span><span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#7c8292]">search</span><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาผู้สมัครหรือนัดหมาย" aria-label="ค้นหานัดสัมภาษณ์" className="w-full rounded-lg border border-[#c2c6d9] py-2 pl-10 pr-3 text-sm" /></label></div>
    {scheduleOpen && <section aria-labelledby="schedule-heading" className="mb-6 rounded-xl border border-[#d9dee7] bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-4"><div><h2 id="schedule-heading" className="text-lg font-semibold">นัดหมายสัมภาษณ์ใหม่</h2><p className="mt-1 text-sm text-[#565e74]">เลือกผู้สมัครจากข้อมูลจริง แล้วเลือกวันและเวลา</p></div><button type="button" aria-label="ปิดแบบฟอร์มนัดหมาย" onClick={() => setScheduleOpen(false)} className="rounded-lg p-1 text-[#565e74] hover:bg-[#f2f4f6]"><span aria-hidden="true" className="material-symbols-outlined text-xl">close</span></button></div><div className="mt-4 grid gap-4 sm:grid-cols-4"><label className="text-xs font-bold text-[#565e74]">ผู้สมัคร/ใบสมัคร<select aria-label="ผู้สมัครสำหรับนัดหมาย" value={scheduleTargetId} onChange={(event) => setScheduleTargetId(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] bg-white px-3 py-2 text-sm"><option value="">เลือกผู้สมัคร</option>{interviews.filter((item) => item.status !== "cancelled").map((item) => <option key={item.id} value={item.id}>{item.candidateName} — {item.interviewType}</option>)}</select></label><label className="text-xs font-bold text-[#565e74]">วันที่<input aria-label="วันที่นัดหมายใหม่" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-[#565e74]">เวลาเริ่มต้น<input aria-label="เวลาเริ่มต้น" type="time" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-[#565e74]">เวลาสิ้นสุด<input aria-label="เวลาสิ้นสุด" type="time" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" /></label></div><button type="button" disabled={!scheduleTargetId} onClick={createSchedule} className="mt-4 rounded-lg bg-[#071d37] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">ตรวจสอบและสร้างนัดหมาย</button></section>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]"><section aria-label={`ปฏิทินสัมภาษณ์มุมมอง${viewLabels[calendarView]}`} className="min-w-0 overflow-hidden rounded-xl border border-[#d9dee7] bg-white"><div className="overflow-x-auto">{calendarView === "month" ? <div className="min-w-[620px]"><div className="grid grid-cols-7 border-b border-[#e1e4ea] text-center text-xs font-semibold text-[#565e74]">{["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((day) => <div key={day} className="py-3">{day}</div>)}</div><div className="grid grid-cols-7">{visibleDates.map((date) => { const inMonth = date.getMonth() === calendarDate.getMonth(); const dateEvents = eventsForDate(date); return <div key={dateKey(date)} className={`min-h-[116px] border-b border-r border-[#e1e4ea] p-2 ${inMonth ? "bg-white" : "bg-[#f8f9fb]"}`}><button type="button" onClick={() => setCalendarDate(date)} className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${dateKey(date) === dateKey(calendarDate) ? "bg-[#0057d9] font-bold text-white" : inMonth ? "text-[#191c1e] hover:bg-[#dbe3ff]" : "text-[#9aa1b2]"}`} aria-label={`เลือกวันที่ ${formatFullDate(date)}`}>{date.getDate()}</button><div className="space-y-1">{dateEvents.map((event) => <article key={event.id} className={`rounded border-l-2 px-1.5 py-1 text-[10px] ${eventTone(event.kind)}`}><b className="block truncate">{event.title}</b><span className="block truncate text-[#565e74]">{event.candidate}</span></article>)}</div></div>; })}</div></div> : <div className={calendarView === "week" ? "min-w-[760px]" : "min-w-[360px]"}><div className={`grid ${calendarView === "week" ? "grid-cols-[3.5rem_repeat(7,minmax(90px,1fr))]" : "grid-cols-[3.5rem_minmax(260px,1fr)]"} border-b border-[#e1e4ea] text-center text-sm font-medium text-[#565e74]`}><div className="border-r border-[#e1e4ea]" />{visibleDates.map((date) => <div key={dateKey(date)} className={`border-r border-[#e1e4ea] py-3 ${dateKey(date) === dateKey(today) ? "font-bold text-[#0057d9]" : ""}`}><span className="block text-xs">{formatWeekday(date)}</span><span>{date.getDate()}</span></div>)}</div><div className={`relative grid min-h-[520px] ${calendarView === "week" ? "grid-cols-[3.5rem_repeat(7,minmax(90px,1fr))]" : "grid-cols-[3.5rem_minmax(260px,1fr)]"}`}><div className="z-10 flex flex-col border-r border-[#e1e4ea] bg-white/80 py-2 pr-2 text-right text-xs text-[#7c8292]">{hours.map((hour) => <span key={hour} className="h-16">{hour}</span>)}</div>{visibleDates.map((date) => { const dateEvents = eventsForDate(date); return <div key={dateKey(date)} className={`relative border-r border-[#e1e4ea] ${dateKey(date) === dateKey(today) ? "bg-[#dbe3ff]/20" : ""}`}>{hours.slice(0, -1).map((hour) => <div key={hour} className="h-16 border-b border-[#eef0f4]" />)}{dateEvents.map((event) => <article key={event.id} className={`absolute left-1 right-1 overflow-hidden rounded border-l-4 p-2 text-xs ${eventTone(event.kind)}`} style={{ top: event.top, height: event.height }}><div className="flex items-start justify-between gap-1"><b className="truncate">{event.title}</b>{event.kind === "conflict" && <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#ba1a1a]">warning</span>}</div><span className="block truncate text-[#565e74]">{event.candidate}</span>{event.detail && <span className="mt-1 block truncate text-[10px] text-[#565e74]">{event.detail}</span>}{event.kind === "internal" && <button type="button" onClick={focusRescheduleForm} className="mt-1 text-left text-[11px] font-semibold text-[#0057d9]">เลื่อนนัดหมาย</button>}{event.interview.status === "scheduled" && <button type="button" onClick={() => { setCancelTargetId(event.interview.id); setCancelOpen(true); }} className="mt-1 text-left text-[11px] font-semibold text-[#ba1a1a]">ยกเลิก</button>}{event.interview.status === "cancelled" && <span className="mt-1 block text-[11px] font-semibold text-[#ba1a1a]">ยกเลิกแล้ว</span>}</article>)}</div>; })}</div></div>}</div>{filteredEvents.length === 0 && <p role="status" className="border-t border-[#e1e4ea] p-4 text-sm text-[#565e74]">ไม่พบนัดหมายที่ตรงกับคำค้นหา</p>}</section>
    <div className="flex min-w-0 flex-col gap-6">{conflicts.length > 0 && <section aria-labelledby="conflict-heading" className="rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/30 p-4 sm:p-5"><div className="flex items-start gap-3"><span aria-hidden="true" className="material-symbols-outlined rounded-full bg-[#ba1a1a]/10 p-2 text-[#ba1a1a]">warning</span><div><h2 id="conflict-heading" className="font-semibold">พบตารางซ้อนทับกัน {conflicts.length} รายการ</h2><p className="mt-1 text-sm text-[#565e74]">{conflicts.map((item) => `${item.candidateName} ${formatFullDate(new Date(item.startsAt))}`).join(" · ")}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => focusRescheduleForm(conflicts[0].id)} className="rounded-md bg-[#ba1a1a] px-3 py-1.5 text-sm font-semibold text-white">เลื่อนเวลา</button><button type="button" onClick={showDetails} className="rounded-md border border-[#c2c6d9] bg-white px-3 py-1.5 text-sm">ดูรายละเอียด</button></div></div></div></section>}
      <section ref={detailsRef} tabIndex={-1} aria-labelledby="appointment-details-heading" className="rounded-xl border border-[#d9dee7] bg-white p-4 shadow-sm sm:p-6"><h2 id="appointment-details-heading" className="mb-4 text-lg font-semibold">รายละเอียดนัดหมาย</h2><form onSubmit={handleSubmit} onReset={handleReset}><label className="mb-4 block text-xs font-bold text-[#565e74]">ผู้สมัคร<select name="candidate" className="mt-1 block w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm"><option>{selectedDetail?.candidateName ?? "คลิกนัดหมายบนปฏิทิน"}</option></select></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#565e74]">วันที่<input name="date" type="date" value={detailDate} onChange={(event) => setDetailDate(event.target.value)} className="mt-1 w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-[#565e74]">เวลา<input ref={timeRef} name="time" type="time" defaultValue="11:00" aria-describedby="schedule-conflict-description" className="mt-1 w-full rounded-lg border border-[#ba1a1a] bg-[#ffdad6]/20 px-3 py-2 text-sm" /></label></div><p id="schedule-conflict-description" className="sr-only">เวลานี้ซ้อนทับกับประชุมทีม</p><label className="mt-4 block text-xs font-bold text-[#565e74]">ผู้สัมภาษณ์<input name="interviewer" value={selectedDetail?.interviewerName ?? ""} readOnly className="mt-1 w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" /></label><fieldset className="mt-4"><legend className="sr-only">รูปแบบการสัมภาษณ์</legend><div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-1"><input type="radio" defaultChecked name="format" value="online" /> ออนไลน์ (Google Meet)</label><label className="flex items-center gap-1"><input type="radio" name="format" value="onsite" /> ที่สำนักงาน</label></div></fieldset><hr className="my-5 border-[#e1e4ea]" /><label className="block text-xs font-bold text-[#565e74]">เหตุผลการเปลี่ยนแปลง (ถ้ามี)<textarea name="reason" className="mt-1 h-20 w-full resize-none rounded-lg border border-[#c2c6d9] p-3 text-sm" placeholder="ระบุเหตุผล..." /></label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><button type="submit" className="flex-1 rounded-lg bg-[#071d37] py-2.5 text-sm font-semibold text-white">เลื่อนนัดหมาย</button><button type="reset" className="rounded-lg border border-[#ba1a1a] px-4 py-2.5 text-sm text-[#ba1a1a]">ยกเลิก</button></div></form>{message && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#dbe3ff] p-3 text-sm">{message}</p>}</section>
    </div></div>
  </div></main>{cancelOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#071d37]/30 p-4 sm:items-center"><section ref={cancelDialogRef} role="dialog" aria-modal="true" aria-labelledby="cancel-heading" aria-describedby="cancel-description" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="cancel-heading" className="text-lg font-semibold">ยกเลิกนัดหมาย</h2><p id="cancel-description" className="mt-1 text-sm text-[#565e74]">ยืนยันการยกเลิกนัดหมายนี้หรือไม่</p><label className="mt-4 block text-xs font-bold text-[#565e74]">เหตุผลการยกเลิก<input aria-label="เหตุผลการยกเลิก" className="mt-1 w-full rounded-lg border border-[#c2c6d9] px-3 py-2 text-sm" placeholder="ระบุเหตุผล (ถ้ามี)" /></label><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCancelOpen(false)} className="rounded-lg border border-[#c2c6d9] px-4 py-2 text-sm">กลับ</button><button type="button" onClick={handleCancel} className="rounded-lg bg-[#ba1a1a] px-4 py-2 text-sm font-semibold text-white">ยืนยันการยกเลิก</button></div></section></div>}</AppShell>;
}
