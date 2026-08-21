"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

const navItems = [
  ["dashboard", "แดชบอร์ด", "/"],
  ["work", "ตำแหน่งงาน", "/jobs"],
  ["person_search", "ค้นหาผู้สมัคร", "/discovery"],
  ["description", "คัดกรองเรซูเม่", "/screening"],
  ["group", "ระบบติดตามผู้สมัคร", "/applications"],
  ["calendar_today", "ตารางนัดสัมภาษณ์", "/interviews"],
] as const;

type NavigationLinksProps = { activePath: string; onNavigate?: () => void };

function isActivePath(href: string, activePath: string): boolean {
  return href === "/" ? activePath === "/" : activePath === href || activePath.startsWith(`${href}/`);
}

function NavigationLinks({ activePath, onNavigate }: NavigationLinksProps) {
  return <>{navItems.map(([icon, label, href]) => {
    const active = isActivePath(href, activePath);
    return <a key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] ${active ? "bg-[#0062ff] text-white" : "text-[#bec6e0] hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="material-symbols-outlined">{icon}</span>{label}</a>;
  })}</>;
}

export function AppShell({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">{children}</div>; }

async function submitLogout(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  window.location.assign("/login");
}

export function Sidebar({ activePath = "/" }: { activePath?: string }) {
  return <aside aria-label="เมนูหลัก" className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col border-r border-white/10 bg-[#020617] px-4 py-6 shadow-xl md:flex"><div className="mb-8 flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] text-white"><span aria-hidden="true" className="material-symbols-outlined">bolt</span></div><div><h1 className="font-serif text-2xl font-bold text-white">TalentFlow</h1><p className="text-sm text-[#bec6e0]">Executive Precision</p></div></div><nav aria-label="เมนูหลัก" className="flex-1 space-y-2"><NavigationLinks activePath={activePath} /></nav><div className="space-y-2 border-t border-white/10 pt-6"><a href="/settings" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#bec6e0] hover:bg-white/5 hover:text-white"><span aria-hidden="true" className="material-symbols-outlined">settings</span>ตั้งค่า</a><form onSubmit={submitLogout}><button type="submit" className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#bec6e0] hover:bg-white/5 hover:text-white"><span aria-hidden="true" className="material-symbols-outlined">logout</span>ออกจากระบบ</button></form></div></aside>;
}

type HeaderProps = { activePath?: string; showCreateJob?: boolean; showSearch?: boolean; searchValue?: string; onSearch?: (value: string) => void };

function MobileNavigation({ activePath, onClose, closeButtonRef, menuRef }: { activePath: string; onClose: () => void; closeButtonRef: { current: HTMLButtonElement | null }; menuRef: { current: HTMLDivElement | null } }) {
  return <div ref={menuRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="เมนูนำทาง" className="fixed inset-0 top-16 z-50 md:hidden"><button type="button" aria-label="ปิดเมนูนำทาง" onClick={onClose} className="absolute inset-0 bg-[#020617]/50" /><nav aria-label="เมนูหลักบนมือถือ" className="relative flex h-full w-[86vw] max-w-[320px] flex-col gap-6 overflow-y-auto bg-[#020617] px-4 py-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#38bdf8]">TalentFlow</p><h2 className="mt-1 font-serif text-xl font-bold text-white">เมนูหลัก</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="ปิดเมนูนำทาง" className="rounded-full p-2 text-[#bec6e0] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38bdf8]"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div><div className="space-y-2"><NavigationLinks activePath={activePath} onNavigate={onClose} /></div><div className="space-y-2 border-t border-white/10 pt-6"><a href="/settings" onClick={onClose} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#bec6e0] hover:bg-white/5 hover:text-white"><span aria-hidden="true" className="material-symbols-outlined">settings</span>ตั้งค่า</a><form onSubmit={submitLogout}><button type="submit" className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#bec6e0] hover:bg-white/5 hover:text-white"><span aria-hidden="true" className="material-symbols-outlined">logout</span>ออกจากระบบ</button></form></div></nav></div>;
}

export function Header({ activePath, showCreateJob = true, showSearch = false, searchValue = "", onSearch }: HeaderProps = {}) {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname ?? "/";
  const canCreateJob = showCreateJob && currentPath !== "/jobs";
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab" || !menuRef.current) return;
      const controls = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [menuOpen]);

  return <><header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#e0e3e5] bg-white px-4 md:ml-[260px] md:gap-4 md:px-6"><button type="button" aria-label={menuOpen ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-[#565e74] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] md:hidden"><span aria-hidden="true" className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span></button><div className={showSearch ? "relative min-w-0 flex-1 md:block md:w-full md:max-w-md" : "hidden"}><span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#7c8292]">search</span><label htmlFor="global-search" className="sr-only">ค้นหาผู้สมัครหรือตำแหน่ง</label><input id="global-search" type="search" value={searchValue} onChange={(event) => onSearch?.(event.target.value)} className="w-full rounded-full border border-[#bec5d8] bg-[#fbfcff] py-2 pl-10 pr-4 text-sm" placeholder="ค้นหาผู้สมัคร, ตำแหน่ง..." /></div><div className="ml-auto flex shrink-0 items-center justify-end gap-2 md:gap-4"><a href="/help" aria-label="เปิดศูนย์ช่วยเหลือ" className="rounded-full p-2 text-[#565e74] hover:bg-[#f2f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff]"><span aria-hidden="true" className="material-symbols-outlined">help_outline</span></a>{canCreateJob && <a href="/jobs" className="hidden rounded-lg bg-gradient-to-r from-[#0062ff] to-[#38bdf8] px-4 py-2 text-sm font-bold text-white shadow-sm hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff] sm:inline-flex">สร้างตำแหน่งงาน</a>}<a href="/settings" aria-label="เปิดการตั้งค่าบัญชี" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c2c6d9] bg-[#dae2fd] text-[#163b92] hover:ring-2 hover:ring-[#0062ff]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0062ff]"><span aria-hidden="true" className="material-symbols-outlined text-[18px]">person</span></a></div></header>{menuOpen && <MobileNavigation activePath={currentPath} onClose={() => setMenuOpen(false)} closeButtonRef={closeButtonRef} menuRef={menuRef} />}</>;
}

export function ActionItem({ step, title, detail, href, icon, primary = false }: { step: string; title: string; detail: string; href: string; icon: string; primary?: boolean }) { return <a href={href} className={`group flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${primary ? "border-2 border-[#004cca] bg-[#dbe1ff]/50 hover:bg-[#dbe1ff]" : "border-[#e0e3e5] bg-white hover:border-[#004cca] hover:bg-[#dbe1ff]/30"}`}><span className="flex items-center gap-3"><span aria-hidden="true" className={`material-symbols-outlined rounded-lg p-2 ${primary ? "bg-[#004cca] text-white" : "bg-[#dae2fd] text-[#004cca]"}`}>{icon}</span><span><span className="block text-xs font-bold uppercase tracking-wide text-[#004cca]">{step}</span><strong className="mt-1 block text-sm">{title}</strong><span className="block text-sm text-[#565e74]">{detail}</span></span></span><span aria-hidden="true" className="material-symbols-outlined text-[#004cca] transition-transform group-hover:translate-x-1">arrow_forward</span></a>; }

export function Metric({ label, value, href }: { label: string; value: string; href: string }) { return <a href={href} className="rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="text-sm text-[#565e74]">{label}</span><strong className="mt-2 block font-serif text-3xl">{value}</strong></a>; }
