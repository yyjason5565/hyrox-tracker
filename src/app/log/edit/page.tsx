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
  if (!id) return <p>Loading session…</p>;
  if (!saved) {
    return (
      <div>
        <p>That session is not in this profile.</p>
        <Link href="/log" className="mt-3 inline-block text-sm underline">Back to this log</Link>
      </div>
    );
  }
  const session = viewSession(saved);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit session</h1>
        <p className="text-sm text-muted-foreground">{session.sessionDate}</p>
        {session.configuration.raceEligible ? (
          <p className="mt-2 text-sm text-primary">This session counts as an official full race.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {session.configuration.reasons.slice(0, 6).map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
      </div>
      <SessionForm
        initial={draftFromSession(session)}
        sessionId={session.id}
        onSave={save}
        onDelete={(sessionId) => device.removeSession(sessionId)}
      />
    </div>
  );
}
