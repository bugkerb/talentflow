"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>;
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, initialState);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="next" value={next} />
    <label className="block text-sm font-semibold">อีเมล<input required autoComplete="email" name="email" type="email" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-3" /></label>
    <label className="block text-sm font-semibold">รหัสผ่าน<input required autoComplete="current-password" name="password" type="password" className="mt-2 block w-full rounded-lg border border-[#c2c6d9] px-3 py-3" /></label>
    {state.error && <p role="alert" className="rounded-lg bg-[#ffdad6] p-3 text-sm text-[#93000a]">{state.error}</p>}
    <SubmitButton />
  </form>;
}
