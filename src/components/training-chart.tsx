"use client";

import { useState } from "react";
import { DIVISION_LABEL, type DivisionId } from "@/lib/divisions";
import { formatTrendTime, type StationTrend, type TrendPoint } from "@/lib/progress-trend";

export function TrainingChart({ trend, division }: { trend: StationTrend; division: DivisionId }) {
  const [selected, setSelected] = useState<string | null>(null);
  const point = trend.points.find((item) => item.id === selected) ?? null;
  if (trend.points.length === 0) return <p className="text-[17px]">No times yet.</p>;

  const width = 360;
  const height = 220;
  const pad = 28;
  const values = trend.points.map((item) => item.seconds);
  if (trend.medianSeconds != null) values.push(trend.medianSeconds);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 30);
  const low = min - span * 0.2;
  const high = max + span * 0.2;
  const xAt = (index: number, count: number) => (count === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (count - 1));
  const yAt = (seconds: number) => pad + ((seconds - low) / (high - low)) * (height - pad * 2);
  const order = trend.points;
  const xOf = (item: { id: string }) => xAt(Math.max(0, order.findIndex((point) => point.id === item.id)), order.length);
  const comparable = trend.series.find((item) => item.comparable)?.points ?? [];

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted-foreground">Faster is up. {DIVISION_LABEL[division]}.</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Training times. Faster is up." className="h-52 w-full">
        {trend.medianSeconds != null ? (
          <line x1={pad} x2={width - pad} y1={yAt(trend.medianSeconds)} y2={yAt(trend.medianSeconds)} className="stroke-primary" strokeDasharray="4 4" strokeWidth="1.5" />
        ) : null}
        {trend.series.map((series) =>
          series.points.length > 1 ? (
            <polyline
              key={series.key}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={series.comparable ? "text-primary" : "text-muted-foreground"}
              points={series.points.map((item) => `${xOf(item)},${yAt(item.seconds)}`).join(" ")}
            />
          ) : null,
        )}
        {trend.series.map((series) =>
          series.points.map((item) => (
            <circle key={item.id} cx={xOf(item)} cy={yAt(item.seconds)} r="5" className={series.comparable ? "fill-primary" : "fill-muted-foreground"} />
          )),
        )}
      </svg>
      <ul className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
        {comparable.length > 0 ? <li className="text-primary">Race load</li> : null}
        {trend.medianSeconds != null ? <li>Sample median {formatTrendTime(trend.medianSeconds)}</li> : null}
        {trend.series.some((item) => !item.comparable) ? <li>Other loads</li> : null}
      </ul>
      <div className="grid gap-2">
        {trend.points.map((item) => (
          <PointButton key={item.id} point={item} pressed={item.id === selected} onPress={() => setSelected(item.id === selected ? null : item.id)} />
        ))}
      </div>
      {point ? (
        <div className="ios-group px-4 py-3 text-[15px]">
          <p className="font-semibold">{point.sessionDate} · {formatTrendTime(point.seconds)}</p>
          <p>{DIVISION_LABEL[point.division]} · {point.sessionType}</p>
          <p className="text-muted-foreground">{point.detail}</p>
        </div>
      ) : null}
    </div>
  );
}

function PointButton({ point, pressed, onPress }: { point: TrendPoint; pressed: boolean; onPress: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} className="ios-row w-full justify-between text-left" onClick={onPress}>
      <span>{point.sessionDate}</span>
      <span className="font-mono">{formatTrendTime(point.seconds)}</span>
    </button>
  );
}
