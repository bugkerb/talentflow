(() => {
  const thai = {
    "Current stage": "สถานะปัจจุบัน",
    "Change status": "เปลี่ยนสถานะ",
    "Schedule Interview": "นัดหมายสัมภาษณ์",
    "Primary Skills": "ทักษะหลัก",
    "Application detail": "รายละเอียดใบสมัคร"
  };

  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });

  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.textContent.includes("สร้างตำแหน่งงานใหม่")) {
        button.textContent = "สร้างตำแหน่งงานใหม่แล้ว";
        setTimeout(() => { button.textContent = "สร้างตำแหน่งงานใหม่"; }, 1400);
      }
    });
  });

  document.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      select.classList.add("ring-2", "ring-primary-container");
      setTimeout(() => select.classList.remove("ring-2", "ring-primary-container"), 500);
    });
  });

  window.TalentFlowStitch = { thai };
})();
