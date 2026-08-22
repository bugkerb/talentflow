import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

const scoreFromAccessibleName = async (locator: Locator): Promise<number> => {
  const accessibleName = await locator.getAttribute("aria-label");
  const match = accessibleName?.match(/([0-9]+(?:\.[0-9]+)?) จาก 10$/);
  if (!match) throw new Error(`Score card has no deterministic score: ${accessibleName ?? "missing aria-label"}`);
  return Number(match[1]);
};

test("HR receives a complete OpenRouter scorecard and the result is persisted", async ({ page }) => {
  test.setTimeout(120_000);
  const uniqueJobTitle = `E2E Tech Lead ${Date.now()}`;

  await loginAsDemoHr(page);
  await page.goto("/jobs");

  const createForm = page.locator("#create-job-form");
  await createForm.getByRole("textbox", { name: "ชื่อตำแหน่ง" }).fill(uniqueJobTitle);
  await createForm.getByText("เปิดรับสมัคร", { exact: true }).click();
  await expect(createForm.getByRole("radio", { name: "เปิดรับสมัคร" })).toBeChecked();
  await createForm.getByRole("textbox", { name: "รายละเอียดงาน" }).fill(
    "นำทีมพัฒนา TypeScript และ React ออกแบบ distributed systems ดูแล production และสื่อสารกับทีมผลิตภัณฑ์"
  );
  await createForm.getByRole("button", { name: "บันทึกข้อมูล" }).click();
  await expect(page.getByRole("heading", { name: uniqueJobTitle })).toBeVisible({ timeout: 30_000 });

  await page.goto("/screening");
  await page.getByRole("button", { name: "วางข้อความ" }).click();
  await page.getByRole("textbox", { name: "ข้อความเรซูเม่" }).fill(
    "ผู้สมัครมีประสบการณ์ 8 ปีด้าน TypeScript และ React เคยเป็น Tech Lead 3 ปี ออกแบบระบบ event-driven รองรับผู้ใช้จำนวนมาก ทำ incident review และสื่อสารกับ product และ engineering เป็นประจำ"
  );
  await page.getByRole("combobox", { name: "ตำแหน่งงานที่ต้องการประเมิน" }).selectOption({ label: uniqueJobTitle });
  await page.getByRole("button", { name: "เริ่มการวิเคราะห์ AI" }).click();

  await expect(page.getByRole("status")).toContainText("เพิ่มผู้สมัครและวิเคราะห์เรซูเม่เรียบร้อยแล้ว", { timeout: 90_000 });

  const overallCard = page.getByRole("article", { name: /ความเหมาะสมโดยรวม .* จาก 10/ });
  const skillsCard = page.getByRole("article", { name: /ทักษะที่ตรงกัน .* จาก 10/ });
  const experienceCard = page.getByRole("article", { name: /ประสบการณ์การทำงาน .* จาก 10/ });
  const communicationCard = page.getByRole("article", { name: /การสื่อสารและวัฒนธรรม .* จาก 10/ });
  await expect(overallCard).toBeVisible();
  await expect(skillsCard).toBeVisible();
  await expect(experienceCard).toBeVisible();
  await expect(communicationCard).toBeVisible();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase verification credentials are missing");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: job, error: jobError } = await supabase.from("jobs").select("id").eq("title", uniqueJobTitle).single();
  expect(jobError).toBeNull();
  if (!job) throw new Error("The job created by this test was not found");
  const { data: application, error: applicationError } = await supabase.from("applications").select("id").eq("job_id", job.id).single();
  expect(applicationError).toBeNull();
  if (!application) throw new Error("The application created by this test was not found");
  const { data: screening, error } = await supabase
    .from("screenings")
    .select("application_id,resume_id,status,skills_score,experience_score,culture_score,raw_output,model,prompt_version")
    .eq("application_id", application.id)
    .single();

  expect(error).toBeNull();
  if (!screening) throw new Error("Persisted screening row was not found");
  expect(screening.status).toBe("completed");
  expect(screening.application_id).toBeTruthy();
  expect(screening.resume_id).toBeTruthy();
  expect(screening.model).toBe(process.env.AI_MODEL);
  expect(screening.prompt_version).toMatch(/^ai-screening-v\d+$/);

  const result = screening.raw_output as {
    score: number;
    summary: string;
    evidence: string[];
    riskFlags: string[];
    scores: { skills: number; experience: number; cultureCommunication: number };
    reasoning: { skills: string; experience: string; cultureCommunication: string };
    strengths: string[];
    prescreenQuestions: string[];
    teamInterviewReport: { summary: string; focusAreas: string[]; recommendation: string };
  };

  expect(await scoreFromAccessibleName(overallCard)).toBe(result.score);
  expect(await scoreFromAccessibleName(skillsCard)).toBe(result.scores.skills);
  expect(await scoreFromAccessibleName(experienceCard)).toBe(result.scores.experience);
  expect(await scoreFromAccessibleName(communicationCard)).toBe(result.scores.cultureCommunication);
  expect(screening.skills_score).toBe(result.scores.skills);
  expect(screening.experience_score).toBe(result.scores.experience);
  expect(screening.culture_score).toBe(result.scores.cultureCommunication);

  await expect(page.getByText(result.summary, { exact: true })).toBeVisible();
  for (const item of result.evidence) await expect(page.getByText(item, { exact: true })).toBeVisible();
  for (const item of result.strengths) await expect(page.getByText(item, { exact: true })).toBeVisible();
  for (const item of result.riskFlags.length ? result.riskFlags : ["ไม่พบความเสี่ยง"]) await expect(page.getByText(item, { exact: true })).toBeVisible();
  for (const item of result.prescreenQuestions) await expect(page.getByText(item, { exact: true })).toBeVisible();
  await expect(page.getByText(`ทักษะ: ${result.reasoning.skills}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`ประสบการณ์: ${result.reasoning.experience}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`การสื่อสาร: ${result.reasoning.cultureCommunication}`, { exact: true })).toBeVisible();
  await expect(page.getByText(result.teamInterviewReport.summary, { exact: true })).toBeVisible();
  await expect(page.getByText(`จุดที่ควรเจาะลึก: ${result.teamInterviewReport.focusAreas.join(", ")}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`คำแนะนำ: ${result.teamInterviewReport.recommendation}`, { exact: true })).toBeVisible();
});
