import { ActionItem, AppShell, Header, Metric, Sidebar } from "../components/talentflow";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { readDashboard, type DashboardReadModel } from "@/server/dashboard-read-model";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireActiveHr();
  let dashboard: DashboardReadModel | null = null;
  let errorMessage = "";
  try { dashboard = await readDashboard(await createSupabaseServerClient()); } catch { errorMessage = "ยังโหลดข้อมูลจากระบบไม่ได้ กรุณาลองใหม่ภายหลัง"; }
  return <AppShell><Sidebar /><Header /><main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:ml-[260px] md:px-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-[#004cca]">ศูนย์ควบคุมการสรรหา</p><h2 className="mt-2 font-serif text-4xl">วันนี้ต้องจัดการอะไรบ้าง</h2><p className="mt-2 text-[#565e74]">เริ่มจากรายการที่ต้องตัดสินใจก่อน แล้วติดตามภาพรวมของงานสรรหา</p></div>
    {errorMessage ? <section role="alert" className="rounded-xl border border-[#ba1a1a]/30 bg-[#fff7f5] p-5 text-[#93000a]"><h3 className="font-semibold">โหลดข้อมูลไม่สำเร็จ</h3><p className="mt-2 text-sm">{errorMessage}</p></section> : dashboard && <><section aria-labelledby="action-heading" className="rounded-xl border border-[#e0e3e5] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h3 id="action-heading" className="text-lg font-semibold">รายการที่ต้องทำ</h3><p className="mt-1 text-sm text-[#565e74]">จัดการรายการเร่งด่วนก่อน เพื่อไม่ให้ผู้สมัครค้างในกระบวนการ</p></div><span className="rounded-full bg-[#ffdad6] px-2 py-1 text-xs font-bold text-[#93000a]">{dashboard.actions.pendingScreenings + dashboard.actions.interviewsToday + dashboard.actions.newApplications} รายการ</span></div><div className="mt-4 space-y-3"><ActionItem step="1 · ต้องทำก่อน" title="ตรวจเรซูเม่ที่รอการตัดสินใจ" detail={`มี ${dashboard.actions.pendingScreenings} รายการที่ยังค้างอยู่`} href="/screening" icon="priority_high" primary /><ActionItem step="2 · วันนี้" title="เตรียมสัมภาษณ์วันนี้" detail={`มีนัดหมาย ${dashboard.actions.interviewsToday} รายการ`} href="/interviews" icon="event" /><ActionItem step="3 · ถัดไป" title="คัดกรองผู้สมัครใหม่" detail={`มีผู้สมัครใหม่ ${dashboard.actions.newApplications} รายการ`} href="/applications" icon="group" /></div></section><div className="w-full"><section className="w-full"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">ภาพรวมการสรรหา</h3><span className="text-sm text-[#565e74]">อัปเดต {new Date(dashboard.updatedAt).toLocaleString("th-TH")}</span></div><div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4"><Metric label="ตำแหน่งเปิดอยู่" value={String(dashboard.metrics.openJobs)} href="/jobs" /><Metric label="ผู้สมัครใหม่" value={String(dashboard.metrics.newCandidates)} href="/applications" /><Metric label="อยู่ระหว่างสัมภาษณ์" value={String(dashboard.metrics.interviewing)} href="/interviews" /><Metric label="นัดสัปดาห์นี้" value={String(dashboard.metrics.interviewsThisWeek)} href="/interviews" /></div></section></div></>}
  </main></AppShell>;
}
