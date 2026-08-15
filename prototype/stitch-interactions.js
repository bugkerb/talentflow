(() => {
  const routes = {
    "แดชบอร์ด": "dashboard.html",
    "ตำแหน่งงาน": "jobs.html",
    "ค้นหาผู้สมัคร": "discovery.html",
    "คัดกรองเรซูเม่": "screening.html",
    "ระบบติดตามผู้สมัคร": "applications.html",
    "ตารางนัดสัมภาษณ์": "interviews.html"
  };
  const root = location.pathname.includes("/stitch-pages/") ? "" : "stitch-pages/";
  const go = (page) => { location.href = `${root}${page}`; };
  const modal = (title, body, actions = "") => {
    const backdrop = document.createElement("div");
    backdrop.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4";
    backdrop.innerHTML = `<section role="dialog" aria-modal="true" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div class="flex items-start justify-between gap-4"><h2 class="font-headline-md text-2xl">${title}</h2><button data-close class="text-2xl text-slate-500" aria-label="ปิด">×</button></div><div class="mt-5">${body}</div><div class="mt-6 flex justify-end gap-2">${actions || '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ปิด</button>'}</div></section>`;
    document.body.append(backdrop);
    backdrop.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => backdrop.remove()));
    return backdrop;
  };
  document.querySelectorAll('a[href="#"]').forEach((link) => {
    const label = link.textContent.trim();
    if (routes[label]) { link.href = `${root}${routes[label]}`; }
    else link.addEventListener("click", (event) => event.preventDefault());
  });
  document.querySelectorAll("button").forEach((button) => {
    const label = button.textContent.trim();
    if (label.includes("สร้างตำแหน่งงาน")) button.addEventListener("click", () => modal("สร้างตำแหน่งงาน", '<label class="block text-sm font-bold">ชื่อตำแหน่ง<input required class="mt-2 w-full rounded-lg border border-slate-300 p-3" placeholder="เช่น Senior Developer"></label><label class="mt-4 block text-sm font-bold">รายละเอียดงาน<textarea required class="mt-2 h-28 w-full rounded-lg border border-slate-300 p-3"></textarea></label>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button><button data-save class="rounded-lg bg-gradient-to-r from-[#0062FF] to-[#38BDF8] px-4 py-2 font-bold text-white">บันทึกฉบับร่าง</button>'));
    if (label.includes("ค้นหา") || label.includes("Discovery")) button.addEventListener("click", () => modal("ค้นหาผู้สมัคร", '<div class="rounded-lg bg-blue-50 p-4">ระบบจะแสดงผลลัพธ์พร้อมหลักฐานให้ HR ตรวจสอบก่อนเพิ่มเข้าสู่ Pipeline</div>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button><button data-provider-fail class="rounded-lg bg-gradient-to-r from-[#0062FF] to-[#38BDF8] px-4 py-2 font-bold text-white">เริ่มค้นหา</button>'));
    if (label.includes("นัดหมายสัมภาษณ์")) button.addEventListener("click", () => modal("นัดหมายสัมภาษณ์", '<label class="block text-sm font-bold">วันเวลา<input type="datetime-local" required class="mt-2 w-full rounded-lg border border-slate-300 p-3"></label><div class="mt-4 rounded-lg bg-amber-50 p-3">ระบบจะตรวจสอบเวลาชนก่อนสร้างนัด</div>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button><button data-schedule class="rounded-lg bg-gradient-to-r from-[#0062FF] to-[#38BDF8] px-4 py-2 font-bold text-white">ตรวจสอบและสร้างนัด</button>'));
  });
  document.addEventListener("click", (event) => {
    if (event.target.matches("[data-save]")) { const form = event.target.closest("section"); if (form.querySelectorAll("input, textarea")[0]?.value.trim()) { event.target.closest("[role=dialog]").remove(); alert("สร้างฉบับร่างแล้ว"); } }
    if (event.target.matches("[data-provider-fail]")) { event.target.closest("[role=dialog]").innerHTML = '<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"><strong>ผู้ให้บริการไม่พร้อมใช้งาน</strong><p class="mt-2">DISCOVERY_PROVIDER_UNAVAILABLE</p><button data-close class="mt-4 rounded-lg border border-red-300 px-4 py-2">ลองใหม่</button></div>'; }
    if (event.target.matches("[data-schedule]")) { event.target.closest("[role=dialog]").innerHTML = '<div class="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800"><strong>สร้างนัดหมายแล้ว</strong><p class="mt-2">ตรวจสอบ idempotency key แล้ว ไม่สร้างนัดซ้ำ</p><button data-close class="mt-4 rounded-lg border border-green-300 px-4 py-2">ปิด</button></div>'; }
  });
})();
