"use client";

import { useEffect, useMemo } from "react";
import { guidanceFor } from "@/lib/advice";
import { BENCHMARK_CAVEATS, BENCHMARK_LABEL, BENCHMARK_SEASON, BENCHMARK_SOURCE_URL, sampleResults } from "@/lib/benchmarks";
import { DIVISION_LABEL, SPEC_SEASON, SPEC_SOURCE_NOTE, SPEC_SOURCE_URL, standardDetail, type DivisionId } from "@/lib/divisions";
import { NUTRITION_DISCLAIMER, NUTRITION_SOURCES, goalNote, proteinRangeGrams } from "@/lib/nutrition";
import { configurationFor } from "@/lib/quantities";
import type { Profile } from "@/lib/device-store";
import { formatDuration, todayInKualaLumpur } from "@/lib/time";
import { useDevice } from "@/components/device-context";

export function LogInsights({ profile }: { profile: Profile }) {
  const device = useDevice();
  const today = todayInKualaLumpur();
  const division = profile.division;
  const guidance = useMemo(() => {
    const sessions = profile.sessions.map((session) => ({
      id: session.id,
      division: session.input.division,
      sessionType: session.input.sessionType,
      sessionDate: session.input.sessionDate,
      raceEligible: configurationFor(session.input).raceEligible,
      segments: session.input.segments,
    }));
    return guidanceFor({
      division,
      training: profile.training,
      hold: profile.focusHold,
      today,
      sessions,
      recent: profile.sessions.map((session) => ({
        sessionDate: session.input.sessionDate,
        rpe: session.input.rpe,
        elapsedSec: session.input.actualElapsedSec,
      })),
    });
  }, [division, profile.focusHold, profile.sessions, profile.training, today]);

  useEffect(() => {
    if (!guidance.store) return;
    device.setFocus(guidance.store);
  }, [device, guidance.store]);

  const protein = proteinRangeGrams(profile.training.bodyMassKg);

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">Today</h2>
        <p className="mt-1 text-sm text-muted-foreground">{guidance.day.title}</p>
        <ul className="mt-2 grid gap-1 text-sm">
          {guidance.day.lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
        {guidance.day.stationLines.length > 0 ? (
          <ul className="mt-3 grid gap-1 text-sm">
            {guidance.day.stationLines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">No time gain is guaranteed. A suggestion does not add a hard session on top of the day you chose.</p>
      </section>
      {division ? <BenchmarkPanel division={division} rows={guidance.rows} /> : null}
      <section className="rounded-2xl bg-card p-4 text-sm ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">Fuel and recovery</h2>
        <p className="mt-2">{NUTRITION_DISCLAIMER}</p>
        <p className="mt-2">{goalNote(profile.training.goal)}</p>
        <ul className="mt-2 grid gap-1">
          <li>Drink to thirst and to your own sweat losses. In heat, drink earlier and more often, and do not overdrink.</li>
          <li>Sodium sweets are not a universal fix. A cramp does not prove you need sodium.</li>
          <li>For sessions that run past about 90 minutes, familiar carbohydrate during the session is the usual sports-nutrition range of about 30–60 g per hour. That is a published general range, not a personal prescription.</li>
          <li>Spread protein across the day, and use the rest of the day to replace carbohydrate after harder work.</li>
        </ul>
        {protein ? (
          <p className="mt-2">
            From the body mass stored on this profile ({profile.training.bodyMassKg} kg), the ISSN general range for exercising adults is about {protein.low}–{protein.high} g of protein a day. This is not a prescription and not a calorie target.
          </p>
        ) : (
          <p className="mt-2">No protein grams are shown until you optionally save a body mass. No calorie target is calculated.</p>
        )}
        <ul className="mt-3 grid gap-1">
          {NUTRITION_SOURCES.map((source) => (
            <li key={source.url}>
              <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BenchmarkPanel({
  division,
  rows,
}: {
  division: DivisionId;
  rows: ReturnType<typeof guidanceFor>["rows"];
}) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">{BENCHMARK_LABEL}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {DIVISION_LABEL[division]} only. Sample size reported by the publisher: {sampleResults(division).toLocaleString("en-US")} results. Season {BENCHMARK_SEASON}. Logging standards are season {SPEC_SEASON}. These are not compared with the other Singles Open category, and custom or shortened work is not converted into a race split.
      </p>
      <p className="mt-2 text-sm">
        <a className="underline" href={BENCHMARK_SOURCE_URL} target="_blank" rel="noreferrer">Station-time source</a>
        {" · "}
        <a className="underline" href={SPEC_SOURCE_URL} target="_blank" rel="noreferrer">2026/27 singles rulebook</a>
      </p>
      <ul className="mt-3 grid gap-2">
        {rows.map((row) => (
          <li key={row.key} className="rounded-lg px-3 py-2 text-sm ring-1 ring-foreground/10">
            <span className="font-medium">{row.name}</span>
            <span className="block text-muted-foreground">{standardDetail(division, row.key)}</span>
            <span className="block">Sample median {formatDuration(row.medianSeconds)}</span>
            {row.userMedianSeconds == null ? (
              <span className="block">No comparable full-session split in the last 90 days.</span>
            ) : (
              <span className="block">
                Your recent median {formatDuration(row.userMedianSeconds)} from {row.samples} split{row.samples === 1 ? "" : "s"}
                {row.confidence === "low" ? " (low confidence)" : ""}.
                {row.deficitSeconds === 0 ? " At or inside the sample median." : ` Gap ${formatDuration(row.deficitSeconds)}.` }
              </span>
            )}
            {row.indicativeCount > 0 ? (
              <span className="block text-muted-foreground">{row.indicativeCount} indicative split{row.indicativeCount === 1 ? "" : "s"} not used here.</span>
            ) : null}
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
        {BENCHMARK_CAVEATS.map((caveat) => <li key={caveat}>{caveat}</li>)}
        <li>{SPEC_SOURCE_NOTE}</li>
      </ul>
    </section>
  );
}
