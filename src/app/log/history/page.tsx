"use client";

import Link from "next/link";
import { useState } from "react";
import { useDevice } from "@/components/device-context";
import { buttonVariants } from "@/components/ui/button";
import { viewSession } from "@/lib/present";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

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
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[34px] leading-tight font-bold">Log</h1>
        <Link href="/log/new" className={cn(buttonVariants(), "h-11")}>New</Link>
      </div>
      <div className="ios-group grid grid-cols-3 p-1" role="tablist" aria-label="Filter workouts">
        {(["all", "official", "modified"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`min-h-11 rounded-[10px] text-[13px] font-medium ${filter === value ? "bg-primary text-primary-foreground" : "text-foreground"}`}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : value === "official" ? "Official" : "Modified"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="ios-group px-4 py-6 text-center">
          <p className="text-[17px] font-semibold">Nothing here</p>
          <Link href="/log/new" className={cn(buttonVariants(), "mt-4 h-11")}>Log a workout</Link>
        </div>
      ) : (
        <ul className="ios-group">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/log/edit/?id=${row.id}`} className="ios-row items-start">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px]">{row.sessionDate}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {row.divisionLabel} · {row.sessionType}
                    {row.configuration.raceEligible ? " · official" : ""}
                    {row.configuration.modified ? " · modified" : ""}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{row.totals.totalLabel}</span>
                </span>
                <span className="pt-1 font-mono text-[17px]">{row.totals.totalSeconds != null ? formatDuration(row.totals.totalSeconds) : "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
