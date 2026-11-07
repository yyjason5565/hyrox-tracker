"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionForm, draftFromSession } from "@/components/session-form";
import { useDevice, useSessionSaver } from "@/components/device-context";
import { viewSession } from "@/lib/present";

export default function EditSessionPage() {
  const device = useDevice();
  const save = useSessionSaver();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("id"));
  }, []);

  const saved = device.active?.sessions.find((session) => session.id === id) ?? null;
  if (!id) return <p className="p-4">Loading…</p>;
  if (!saved) {
    return (
      <div className="grid gap-3 p-4">
        <p>Not in this athlete.</p>
        <Link href="/log/history" className="inline-flex min-h-11 items-center text-primary">Log</Link>
      </div>
    );
  }
  const session = viewSession(saved);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-2 pt-[env(safe-area-inset-top)]">
        <Link href="/log/history" className="inline-flex min-h-11 items-center px-2 text-[17px] text-primary">Cancel</Link>
        <h1 className="text-[17px] font-semibold">Edit</h1>
        <button form="workout-form" type="submit" className="inline-flex min-h-11 items-center px-2 text-[17px] font-semibold text-primary">Save</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <SessionForm
          initial={draftFromSession(session)}
          sessionId={session.id}
          onSave={save}
          onDelete={(sessionId) => device.removeSession(sessionId)}
        />
      </div>
    </div>
  );
}
