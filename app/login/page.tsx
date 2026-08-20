import { AuthorizationService } from "@/application/authorization-service";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = new AuthorizationService().safeReturnPath(searchParams?.next);
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fb] px-4">
    <section className="w-full max-w-md rounded-2xl border border-[#e0e3e5] bg-white p-8 shadow-xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#0062ff] to-[#38bdf8] text-white"><span className="material-symbols-outlined">bolt</span></div>
        <div><h1 className="font-serif text-3xl">TalentFlow</h1><p className="text-sm text-[#565e74]">เข้าสู่ระบบสำหรับทีม HR</p></div>
      </div>
      <LoginForm next={next} />
    </section>
  </main>;
}
