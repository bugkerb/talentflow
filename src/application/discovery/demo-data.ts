export type DemoDiscoveryResult = {
  source: "demo";
  externalId: string;
  profileUrl: string;
  fullName: string;
  role: string;
  company: string;
  location: string;
  education: string;
  expectedSalary: string;
  experience: string;
  skills: string[];
  score: number;
  evidence: string[];
  concerns: string[];
};

/** Deterministic, clearly-labelled fixture for HR demo/UAT; never used in production search. */
export const demoDiscoveryResults: DemoDiscoveryResult[] = [
  {
    source: "demo", externalId: "demo-narin-chaivapruk", profileUrl: "https://example.com/demo/narin-chaivapruk", fullName: "นรินทร์ ชัยวปราชญ์", role: "Senior Frontend Developer", company: "TechCraft Thailand", location: "กรุงเทพมหานคร", education: "วท.บ. วิทยาการคอมพิวเตอร์ มหาวิทยาลัยเกษตรศาสตร์", expectedSalary: "85,000–100,000 บาท", experience: "7 ปี · React 5 ปี · เคยเป็น Tech Lead 2 ปี", skills: ["React", "TypeScript", "Next.js", "System Design"], score: 94,
    evidence: ["นำทีมพัฒนาแพลตฟอร์ม React ที่มีผู้ใช้งานมากกว่า 1 ล้านคน", "ออกแบบ frontend architecture และ design system ให้หลายทีมใช้งานร่วมกัน", "มีประสบการณ์ดูแล production incident และวางมาตรฐาน code review"],
    concerns: ["เงินเดือนที่คาดหวังสูงกว่างบประมาณเริ่มต้น ควรยืนยันช่วงเงินเดือนก่อนนัดสัมภาษณ์"]
  },
  {
    source: "demo", externalId: "demo-pimchanok-wong", profileUrl: "https://example.com/demo/pimchanok-wong", fullName: "พิมพ์ชนก วงศ์สกุล", role: "Frontend Engineer", company: "BrightCommerce", location: "เชียงใหม่ / Remote", education: "วศ.บ. วิศวกรรมซอฟต์แวร์ มหาวิทยาลัยเชียงใหม่", expectedSalary: "65,000–75,000 บาท", experience: "4 ปี · React 4 ปี · ทำงานร่วมกับ Product และ UX อย่างใกล้ชิด", skills: ["React", "TypeScript", "Testing", "Accessibility"], score: 86,
    evidence: ["พัฒนา checkout flow ที่ลดอัตราการทำรายการไม่สำเร็จลง 18%", "เพิ่ม unit และ integration test ให้ frontend module สำคัญ", "มีผลงานปรับปรุง accessibility และ performance ของเว็บอีคอมเมิร์ซ"],
    concerns: ["ยังไม่มีหลักฐานการนำทีมขนาดใหญ่", "ควรถามประสบการณ์ด้าน system design ในรอบ technical interview"]
  },
  {
    source: "demo", externalId: "demo-thanawat-siri", profileUrl: "https://example.com/demo/thanawat-siri", fullName: "ธนวัฒน์ ศิริพงศ์", role: "Full-stack Developer", company: "Orbit Digital", location: "กรุงเทพมหานคร", education: "ปริญญาโท เทคโนโลยีสารสนเทศ มหาวิทยาลัยมหิดล", expectedSalary: "70,000–85,000 บาท", experience: "6 ปี · Node.js 5 ปี · React 3 ปี · ดูแลทีม 4 คน", skills: ["Node.js", "React", "PostgreSQL", "AWS"], score: 81,
    evidence: ["ดูแลระบบ API และงาน frontend ตั้งแต่ discovery จน deploy", "ออกแบบ PostgreSQL schema และปรับ query สำหรับระบบธุรกรรม", "มีประสบการณ์ mentoring นักพัฒนา junior ในทีม 4 คน"],
    concerns: ["ประสบการณ์ React เชิงลึกน้อยกว่าผู้สมัครรายอื่น", "ควรตรวจสอบความพร้อมทำงาน onsite ตามรูปแบบของตำแหน่ง"]
  }
];
