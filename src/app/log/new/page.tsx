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
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Log a session</h1>
        <p>Choose Men’s Singles Open or Women’s Singles Open on the profile before logging. Nothing is assumed.</p>
        <Link href="/log/account" className="text-sm underline">Open profile</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Log a session</h1>
      <SessionForm initial={emptyDraft(todayInKualaLumpur(), division)} onSave={save} />
    </div>
  );
}
