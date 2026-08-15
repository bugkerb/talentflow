const stages = ["คัดกรอง", "โทรคุยเบื้องต้น", "สัมภาษณ์", "ข้อเสนอ", "รับเข้าทำงาน"];

export default function DashboardPage() {
  return <main style={{ maxWidth: 1180, margin: "0 auto", padding: 40 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><p style={{ color: "#315efb", fontWeight: 700 }}>TALENTFLOW</p><h1>ภาพรวมการสรรหา</h1><p>จัดการงาน ผู้สมัคร และขั้นตอนการคัดเลือกในที่เดียว</p></div>
      <button style={{ background: "#315efb", color: "white", border: 0, borderRadius: 8, padding: "12px 18px" }}>สร้างตำแหน่งงาน</button>
    </header>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, margin: "28px 0" }}>
      {["ตำแหน่งที่เปิด", "ผู้สมัครทั้งหมด", "รอคัดกรอง", "สัมภาษณ์สัปดาห์นี้"].map((label, index) => <article key={label} style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e5e7ef" }}><small>{label}</small><h2>{[3, 48, 12, 5][index]}</h2></article>)}
    </section>
    <section style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e5e7ef" }}><h2>สถานะผู้สมัคร: Tech Lead / Senior Developer</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>{stages.map((stage, index) => <div key={stage} style={{ minHeight: 140, background: "#f7f8fb", borderRadius: 8, padding: 12 }}><strong>{stage}</strong><p>{index === 0 ? "Narin Chaiyapruk" : "ยังไม่มีผู้สมัคร"}</p></div>)}</div></section>
  </main>;
}
