"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDevice } from "@/components/device-context";
import { DIVISION_LABEL } from "@/lib/divisions";
import { TAB_ITEMS, activeTab, normalizePath, showTabBar } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const device = useDevice();
  const pathname = usePathname();
  const router = useRouter();
  const path = normalizePath(pathname);
  const tabs = showTabBar(path);
  const current = activeTab(path);

  useEffect(() => {
    if (!device.ready) return;
    if (!device.active || !device.unlocked) router.replace("/");
  }, [device.ready, device.active, device.unlocked, router]);

  if (!device.ready || !device.active || !device.unlocked) {
    return <main className="mx-auto max-w-3xl px-4 py-10">Loading this browser…</main>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      {tabs ? (
        <header className="shrink-0 border-b border-white/10 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[15px]">
              <span className="font-semibold">{device.active.name}</span>
              {device.active.division ? <span className="text-muted-foreground"> · {DIVISION_LABEL[device.active.division]}</span> : null}
            </p>
            <Link href="/" className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary">Switch</Link>
          </div>
        </header>
      ) : null}
      <div className={tabs ? "min-h-0 flex-1 overflow-y-auto overscroll-y-contain" : "min-h-0 flex-1 overflow-hidden"}>
        {tabs ? <div className="mx-auto w-full max-w-3xl px-4 py-4">{children}</div> : children}
      </div>
      {tabs ? (
        <nav aria-label="Sections" className="shrink-0 border-t border-white/10 bg-card pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto grid max-w-3xl grid-cols-4">
            {TAB_ITEMS.map((tab) => {
              const selected = current === tab.href;
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={selected ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-center px-1 text-[12px] font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
