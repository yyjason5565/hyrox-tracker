"use client";

import Link from "next/link";
import { useState } from "react";
import { useDevice } from "@/components/device-context";
import { viewSession } from "@/lib/present";
import { formatDuration } from "@/lib/time";

export default function HistoryPage() {
  const device = useDevice();
  const [filter, setFilter] = useState<"all" | "official" | "modified">("all");
  const rows = (device.active?.sessions ?? []).map(viewSession).filter((row) => {
    if (filter === "official") return row.configuration.raceEligible;
    if (filter === "modified") return row.configuration.modified;
    return true;
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>
      <p className="text-sm text-muted-foreground">Official full races and modified workouts are listed separately. Modified results are not race bests.</p>
      <div className="flex flex-wrap gap-2">
        {(["all", "official", "modified"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} className={`h-10 rounded-full px-4 text-sm ${filter === value ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10"}`} onClick={() => setFilter(value)}>
            {value === "all" ? "All" : value === "official" ? "Official full races" : "Modified"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No sessions in this view.</p> : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/log/edit/?id=${row.id}`} className="block rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
                <span className="flex items-center justify-between gap-3">
                  <span>{row.sessionDate} · {row.divisionLabel} · {row.sessionType}{row.configuration.raceEligible ? " · official" : ""}{row.configuration.modified ? " · modified" : ""}</span>
                  <span className="text-right">
                    <span className="block font-mono">{row.totals.totalSeconds != null ? formatDuration(row.totals.totalSeconds) : "—"}</span>
                    <span className="block text-xs text-muted-foreground">{row.totals.totalLabel}</span>
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Runs {row.totals.runs.timedSeconds != null ? formatDuration(row.totals.runs.timedSeconds) : "—"}
                  {row.totals.runs.distanceMeters != null ? ` / ${row.totals.runs.distanceMeters.toLocaleString("en-US")} m` : ""}
                  {" · "}Stations {row.totals.stations.timedSeconds != null ? formatDuration(row.totals.stations.timedSeconds) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
