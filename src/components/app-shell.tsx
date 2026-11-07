"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDevice } from "@/components/device-context";
import { DIVISION_LABEL } from "@/lib/divisions";

const LINKS = [
  { href: "/log", label: "Log" },
  { href: "/log/new", label: "New" },
  { href: "/log/history", label: "History" },
  { href: "/log/backup", label: "Backup" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const device = useDevice();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!device.ready) return;
    if (!device.active || !device.unlocked) router.replace("/");
  }, [device.ready, device.active, device.unlocked, router]);

  if (!device.ready || !device.active || !device.unlocked) return <main className="mx-auto max-w-5xl px-4 py-8">Loading this browser…</main>;

  return (
    <div className="min-h-full">
      <header className="border-b border-primary/50 bg-background/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/log" className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-tight sm:text-base">Lane Ledger</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-44 truncate text-muted-foreground">{device.active.name}{device.active.division ? ` · ${DIVISION_LABEL[device.active.division]}` : ""}</span>
            <Link href="/log/account" className="underline-offset-4 hover:underline">Profile</Link>
            <button type="button" className="underline-offset-4 hover:underline" onClick={() => { device.lockScreen(); router.push("/"); }}>
              {device.active.lock ? "Lock" : "Profiles"}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-primary/40 bg-background/95">
        <ul className="mx-auto grid max-w-5xl grid-cols-4">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={`block py-3 text-center text-sm ${pathname === link.href ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
