"use client";

import Link from "next/link";
import { SessionForm, emptyDraft } from "@/components/session-form";
import { useDevice, useSessionSaver } from "@/components/device-context";
import { todayInKualaLumpur } from "@/lib/time";

export default function NewSessionPage() {
  const device = useDevice();
  const save = useSessionSaver();
  const division = device.active?.division;
  if (!division) {
    return (
      <div className="grid gap-3 p-4">
        <p>Pick a category in Profile.</p>
        <Link href="/log/account" className="inline-flex min-h-11 items-center text-primary">Profile</Link>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-2 pt-[env(safe-area-inset-top)]">
        <Link href="/log" className="inline-flex min-h-11 items-center px-2 text-[17px] text-primary">Cancel</Link>
        <h1 className="text-[17px] font-semibold">Log</h1>
        <button form="workout-form" type="submit" className="inline-flex min-h-11 items-center px-2 text-[17px] font-semibold text-primary">Save</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <SessionForm initial={emptyDraft(todayInKualaLumpur(), division)} onSave={save} />
      </div>
    </div>
  );
}
