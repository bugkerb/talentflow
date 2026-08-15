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
    const target = event.target.closest("button");
    if (!target) return;
    if (target.matches("[data-close]")) { target.closest("[role=dialog], .fixed")?.remove(); return; }
    if (target.matches("[data-save]")) { const dialog = target.closest("[role=dialog]"); const fields = [...dialog.querySelectorAll("input, textarea")]; if (fields.every((field) => field.value.trim())) { dialog.innerHTML = '<div class="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800"><strong>บันทึกฉบับร่างแล้ว</strong><button data-close class="mt-4 rounded-lg border border-green-300 px-4 py-2">ปิด</button></div>'; } return; }
    if (target.matches("[data-provider-fail]")) { target.closest("[role=dialog]").innerHTML = '<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"><strong>ผู้ให้บริการไม่พร้อมใช้งาน</strong><p class="mt-2">DISCOVERY_PROVIDER_UNAVAILABLE</p><button data-retry class="mt-4 rounded-lg border border-red-300 px-4 py-2">ลองใหม่</button></div>'; return; }
    if (target.matches("[data-retry]")) { target.closest("[role=dialog]").innerHTML = '<div class="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800"><strong>ค้นหาใหม่สำเร็จ</strong><p class="mt-2">พบผลลัพธ์รอ HR อนุมัติ</p><button data-close class="mt-4 rounded-lg border border-green-300 px-4 py-2">ปิด</button></div>'; return; }
    if (target.matches("[data-schedule]")) { const dialog = target.closest("[role=dialog]"); const input = dialog.querySelector("input"); if (!input?.value) return; dialog.innerHTML = '<div class="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800"><strong>สร้างนัดหมายแล้ว</strong><p class="mt-2">ตรวจสอบ idempotency key แล้ว ไม่สร้างนัดซ้ำ</p><button data-close class="mt-4 rounded-lg border border-green-300 px-4 py-2">ปิด</button></div>'; return; }
    const label = target.textContent.trim();
    if (label.includes("อนุมัติ")) { modal("ยืนยันการอนุมัติ", '<div class="rounded-lg bg-green-50 p-4 text-green-800">สร้างใบสมัครและเพิ่มเข้าสู่ Pipeline แล้ว</div>'); return; }
    if (label === "ปฏิเสธ") { modal("เหตุผลที่ปฏิเสธ", '<textarea required class="h-28 w-full rounded-lg border border-slate-300 p-3" placeholder="ระบุเหตุผล..."></textarea>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button><button data-close class="rounded-lg bg-red-600 px-4 py-2 text-white">บันทึกเหตุผล</button>'); return; }
    if (label.includes("รันโมเดล")) { modal("ผลการค้นหา", '<div class="rounded-lg bg-blue-50 p-4">ผลลัพธ์ผ่าน validation แล้ว ต้องให้ HR ตรวจสอบก่อนดำเนินการต่อ</div>'); return; }
    if (label.includes("เริ่มการวิเคราะห์ AI")) { modal("ผลลัพธ์ AI", '<div class="rounded-lg border border-blue-300 bg-blue-50 p-4"><strong>ผลลัพธ์ผ่านการตรวจสอบ</strong><p class="mt-2">คะแนนและเหตุผลพร้อมให้ HR ตรวจสอบ</p></div>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ส่งให้ HR ตรวจสอบ</button><button data-invalid class="rounded-lg bg-red-600 px-4 py-2 text-white">จำลองผลลัพธ์ไม่ถูกต้อง</button>'); return; }
    if (target.matches("[data-invalid]")) { target.closest("[role=dialog]").innerHTML = '<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"><strong>AI_OUTPUT_INVALID</strong><p class="mt-2">Schema validation ไม่ผ่าน และยังไม่บันทึกคะแนน</p><button data-retry class="mt-4 rounded-lg border border-red-300 px-4 py-2">ลองใหม่</button></div>'; return; }
    if (label.includes("บันทึกข้อความ")) { const field = document.querySelector("textarea"); if (!field?.value.trim()) return; modal("บันทึกการแก้ไข", '<div class="rounded-lg bg-green-50 p-4 text-green-800">แก้ไขผล AI พร้อมเหตุผลแล้ว ต้องเก็บประวัติการตัดสินใจของ HR</div>'); return; }
    if (label.includes("เปลี่ยนสถานะ")) { modal("ย้ายขั้นตอน", '<label class="block text-sm font-bold">ขั้นตอนใหม่<select class="mt-2 w-full rounded-lg border border-slate-300 p-3"><option>คัดกรองเบื้องต้น</option><option>สัมภาษณ์</option><option>เสนอข้อเสนอ</option><option>รับเข้าทำงาน</option></select></label>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button><button data-close class="rounded-lg bg-gradient-to-r from-[#0062FF] to-[#38BDF8] px-4 py-2 text-white">บันทึกขั้นตอน</button>'); return; }
    if (label.includes("เลื่อนเวลา")) { modal("เลื่อนนัดหมาย", '<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">เวลาที่เลือกชนกับนัดหมายเดิม กรุณาเลือกเวลาใหม่</div>', '<button data-close class="rounded-lg border border-slate-300 px-4 py-2">ปิด</button>'); return; }
    if (label.includes("ดูรายละเอียด")) { modal("รายละเอียดการสัมภาษณ์", '<div class="space-y-2"><p><strong>ผู้สมัคร:</strong> Narin Chaiyapruk</p><p><strong>สถานะ:</strong> ยืนยันแล้ว</p><p><strong>เวลา:</strong> Thu 14 Aug · 10:00–10:30</p></div>'); return; }
    if (target.querySelector("[data-icon=close]") || label === "close") { target.closest("aside")?.remove(); return; }
  });
  document.querySelectorAll("form").forEach((form) => form.addEventListener("submit", (event) => { event.preventDefault(); if (form.reportValidity()) modal("บันทึกสำเร็จ", '<div class="rounded-lg bg-green-50 p-4 text-green-800">ข้อมูลถูกตรวจสอบและบันทึกแล้ว</div>'); }));
  document.querySelectorAll("select").forEach((select) => select.addEventListener("change", () => { select.classList.add("ring-2", "ring-primary"); setTimeout(() => select.classList.remove("ring-2", "ring-primary"), 500); }));
})();
