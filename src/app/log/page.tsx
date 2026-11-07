"use client";

import Link from "next/link";
import { FinishChart } from "@/components/finish-chart";
import { DataWarning } from "@/components/data-warning";
import { useDevice } from "@/components/device-context";
import { buttonVariants } from "@/components/ui/button";
import { viewSession } from "@/lib/present";
import { officialBests, officialFinishSeries } from "@/lib/quantities";
import { SEGMENTS } from "@/lib/segments";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

export default function LogHomePage() {
  const device = useDevice();
  const sessions = (device.active?.sessions ?? []).map(viewSession);
  const source = (device.active?.sessions ?? []).map((session) => ({
    id: session.id,
    sessionDate: session.input.sessionDate,
    segments: session.input.segments,
    math: session.input,
  }));
  const bests = officialBests(source);
  const series = officialFinishSeries(source);

  return (
    <div className="grid gap-6">
      <DataWarning />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{device.active?.name ?? "Log"}</h1>
          <p className="text-sm text-muted-foreground">Official bests use only complete sessions on the open distances, reps, and loads.</p>
        </div>
        <Link href="/log/new" className={cn(buttonVariants(), "h-11")}>Log a session</Link>
      </div>
      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="text-lg font-semibold">No sessions yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Nothing is stored until you save a workout on this device.</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-lg font-semibold">Official full-race best</h2>
            {bests.finish ? <p className="mt-2 font-mono text-3xl">{formatDuration(bests.finish.seconds)}</p> : <p className="mt-2 text-sm text-muted-foreground">No official best yet. Modified and partial sessions stay in the history and are not counted here.</p>}
            <p className="mt-1 text-sm text-muted-foreground">{bests.eligibleCount} comparable full race{bests.eligibleCount === 1 ? "" : "s"}.</p>
          </section>
          <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="mb-2 text-lg font-semibold">Finish chart</h2>
            <FinishChart points={series} />
          </section>
          {bests.eligibleCount > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {SEGMENTS.map((segment) => {
                const mark = bests.segments[segment.key];
                if (!mark) return null;
                return (
                  <li key={segment.key} className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
                    <span className="text-sm text-muted-foreground">{segment.name}</span>
                    <span className="block font-mono">{formatDuration(mark.seconds)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <ul className="grid gap-2">
            {sessions.slice(0, 8).map((session) => (
              <li key={session.id}>
                <Link href={`/log/edit/?id=${session.id}`} className="flex items-center justify-between rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
                  <span>
                    {session.sessionDate}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {session.sessionType}
                      {session.configuration.modified ? " · modified" : ""}
                      {session.configuration.raceEligible ? " · official" : ""}
                    </span>
                  </span>
                  <span className="font-mono text-sm">{session.totals.finishSeconds != null ? formatDuration(session.totals.finishSeconds) : "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
