"use client";

import Link from "next/link";
import { FinishChart } from "@/components/finish-chart";
import { LogInsights } from "@/components/log-insights";
import { DataWarning } from "@/components/data-warning";
import { useDevice } from "@/components/device-context";
import { buttonVariants } from "@/components/ui/button";
import { APP_DEFINITION, DIVISION_LABEL } from "@/lib/divisions";
import { viewSession } from "@/lib/present";
import { officialBests, officialFinishSeries } from "@/lib/quantities";
import { SEGMENTS } from "@/lib/segments";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

export default function LogHomePage() {
  const device = useDevice();
  const profile = device.active;
  const division = profile?.division ?? null;
  const sessions = (profile?.sessions ?? []).map(viewSession);
  const source = (profile?.sessions ?? []).map((session) => ({
    id: session.id,
    sessionDate: session.input.sessionDate,
    segments: session.input.segments,
    math: session.input,
  }));
  const bests = division ? officialBests(source, division) : null;
  const series = division ? officialFinishSeries(source, division) : [];
  const otherCount = division ? source.filter((session) => session.math.division !== division).length : 0;

  return (
    <div className="grid gap-6">
      <DataWarning />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{profile?.name ?? "Log"}</h1>
          <p className="text-sm text-muted-foreground">{APP_DEFINITION}</p>
          <p className="text-sm text-muted-foreground">
            {division
              ? `${DIVISION_LABEL[division]} bests use only complete sessions in that category, with every split plus recorded Roxzone/transitions and penalties.`
              : "Choose a Singles Open category on the profile. Saved sessions stay on this device."}
          </p>
        </div>
        <Link href="/log/new" className={cn(buttonVariants(), "h-11")}>Log a session</Link>
      </div>
      {profile ? <LogInsights profile={profile} /> : null}
      {otherCount > 0 ? (
        <p className="text-sm text-muted-foreground">{otherCount} session{otherCount === 1 ? "" : "s"} in the other Singles Open category {otherCount === 1 ? "is" : "are"} not included in these bests.</p>
      ) : null}
      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="text-lg font-semibold">No sessions yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Nothing is stored until you save a workout on this device.</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-lg font-semibold">{division ? `${DIVISION_LABEL[division]} full-race best` : "Full-race best"}</h2>
            {bests?.finish ? <p className="mt-2 font-mono text-3xl">{formatDuration(bests.finish.seconds)}</p> : <p className="mt-2 text-sm text-muted-foreground">No official best yet. Splits-only totals, modified work, and the other category are not counted here.</p>}
            <p className="mt-1 text-sm text-muted-foreground">{bests?.eligibleCount ?? 0} comparable full race{(bests?.eligibleCount ?? 0) === 1 ? "" : "s"}.</p>
          </section>
          <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="mb-2 text-lg font-semibold">Finish chart</h2>
            <FinishChart points={series} />
          </section>
          {bests && bests.eligibleCount > 0 ? (
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
                <Link href={`/log/edit/?id=${session.id}`} className="block rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      {session.sessionDate}
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {session.divisionLabel} · {session.sessionType}
                        {session.configuration.modified ? " · modified" : ""}
                        {session.configuration.raceEligible ? " · official" : ""}
                      </span>
                    </span>
                    <span className="text-right text-sm">
                      <span className="block font-mono">{session.totals.totalSeconds != null ? formatDuration(session.totals.totalSeconds) : "—"}</span>
                      <span className="block text-muted-foreground">{session.totals.totalLabel}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
