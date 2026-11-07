"use client";

import { useState } from "react";
import { Fold } from "@/components/fold";
import { BenchmarkPanel, useGuidance } from "@/components/log-insights";
import { FinishChart } from "@/components/finish-chart";
import { TrainingChart } from "@/components/training-chart";
import { useDevice } from "@/components/device-context";
import { DIVISION_IDS, DIVISION_LABEL, type DivisionId } from "@/lib/divisions";
import { stationTrend } from "@/lib/progress-trend";
import { officialBests, officialFinishSeries } from "@/lib/quantities";
import { SEGMENT_BY_KEY, SEGMENT_KEYS, type SegmentKey } from "@/lib/segments";
import { formatDuration } from "@/lib/time";

export default function ProgressPage() {
  const device = useDevice();
  if (!device.active) return null;
  return <ProgressBody />;
}

function ProgressBody() {
  const device = useDevice();
  const profile = device.active!;
  const guidance = useGuidance(profile);
  const division = profile.division;
  const source = profile.sessions.map((session) => ({
    id: session.id,
    sessionDate: session.input.sessionDate,
    segments: session.input.segments,
    math: session.input,
  }));
  const [chartDivision, setChartDivision] = useState<DivisionId>(division ?? "men_open");
  const [station, setStation] = useState<SegmentKey>("skierg");
  const trend = stationTrend(profile.sessions, chartDivision, station);
  const bests = division ? officialBests(source, division) : null;
  const series = division ? officialFinishSeries(source, division) : [];
  const otherCount = division ? source.filter((session) => session.math.division !== division).length : 0;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-[34px] leading-tight font-bold">Progress</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{division ? DIVISION_LABEL[division] : "Set a category in Profile."}</p>
      </div>
      <section className="ios-group px-4 py-4">
        <div className="mb-3 flex gap-2">
          {DIVISION_IDS.map((item) => (
            <button key={item} type="button" aria-pressed={chartDivision === item} className={`min-h-11 flex-1 rounded-[10px] text-[15px] font-medium ${chartDivision === item ? "bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => setChartDivision(item)}>
              {item === "men_open" ? "Men" : "Women"}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-[13px] text-muted-foreground">
          Station
          <select className="h-11 min-h-11 w-full rounded-[10px] bg-input px-3 text-[16px] text-foreground" value={station} onChange={(event) => setStation(event.target.value as SegmentKey)}>
            {SEGMENT_KEYS.map((key) => (
              <option key={key} value={key}>{SEGMENT_BY_KEY[key].name}</option>
            ))}
          </select>
        </label>
        <div className="mt-3">
          <TrainingChart trend={trend} division={chartDivision} />
        </div>
      </section>
      <section className="ios-group px-4 py-4">
        <h2 className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">Full-race best</h2>
        {bests?.finish ? (
          <p className="mt-1 font-mono text-[34px] leading-tight font-semibold">{formatDuration(bests.finish.seconds)}</p>
        ) : (
          <p className="mt-2 text-[17px]">None yet.</p>
        )}
        <p className="mt-1 text-[13px] text-muted-foreground">{bests?.eligibleCount ?? 0} comparable full race{(bests?.eligibleCount ?? 0) === 1 ? "" : "s"}.</p>
      </section>
      <section className="ios-group px-4 py-4">
        <h2 className="mb-2 text-[17px] font-semibold">Finish times</h2>
        <FinishChart points={series} />
      </section>
      {bests && bests.eligibleCount > 0 ? (
        <ul className="ios-group">
          {SEGMENT_KEYS.map((key) => {
            const segment = SEGMENT_BY_KEY[key];
            const mark = bests.segments[segment.key];
            if (!mark) return null;
            return (
              <li key={segment.key} className="ios-row justify-between">
                <span className="text-[17px]">{segment.name}</span>
                <span className="font-mono text-[17px]">{formatDuration(mark.seconds)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {otherCount > 0 ? <p className="text-[13px] text-muted-foreground">{otherCount} workout{otherCount === 1 ? "" : "s"} in the other category {otherCount === 1 ? "is" : "are"} listed in Log and left out of these bests.</p> : null}
      {division ? (
        <Fold title="Benchmarks">
          <BenchmarkPanel division={division} rows={guidance.rows} />
        </Fold>
      ) : null}
    </div>
  );
}
