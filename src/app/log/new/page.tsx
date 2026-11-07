"use client";

import { SessionForm, emptyDraft } from "@/components/session-form";
import { useSessionSaver } from "@/components/device-context";
import { todayInKualaLumpur } from "@/lib/time";

export default function NewSessionPage() {
  const save = useSessionSaver();
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Log a session</h1>
      <SessionForm initial={emptyDraft(todayInKualaLumpur())} onSave={save} />
    </div>
  );
}
