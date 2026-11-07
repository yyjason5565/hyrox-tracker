"use client";

import { useState } from "react";
import { DIVISION_LABEL, type DivisionId } from "@/lib/divisions";
import { dateAxisTicks, formatTrendTime, shortDateLabel, timeAxisTicks, type StationTrend, type TrendPoint } from "@/lib/progress-trend";

export function TrainingChart({ trend, division }: { trend: StationTrend; division: DivisionId }) {
  const [selected, setSelected] = useState<string | null>(null);
  const point = trend.points.find((item) => item.id === selected) ?? null;
  if (trend.points.length === 0) return <p className="text-[17px]">No times yet.</p>;

  const width = 360;
  const height = 248;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const values = trend.points.map((item) => item.seconds);
  if (trend.medianSeconds != null) values.push(trend.medianSeconds);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 30);
  const low = min - span * 0.18;
  const high = max + span * 0.18;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const xAt = (index: number, count: number) => (count === 1 ? padLeft + plotWidth / 2 : padLeft + (index * plotWidth) / (count - 1));
  const yAt = (seconds: number) => padTop + ((seconds - low) / (high - low)) * plotHeight;
  const yTicks = timeAxisTicks(values);
  const xTicks = dateAxisTicks(trend.points.map((item) => item.sessionDate));
  const order = trend.points;
  const xOf = (item: { id: string }) => xAt(Math.max(0, order.findIndex((point) => point.id === item.id)), order.length);
  const comparable = trend.series.find((item) => item.comparable)?.points ?? [];

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted-foreground">Faster is up. {DIVISION_LABEL[division]}.</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Training times. Faster is up." className="h-60 w-full overflow-visible">
        {yTicks.map((tick) => (
          <g key={tick}>
            <text x={padLeft - 8} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" fill="currentColor" fontSize="11" className="text-muted-foreground">
              {formatTrendTime(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((date) => {
          const index = trend.points.findIndex((item) => item.sessionDate === date);
          const x = xAt(index, trend.points.length);
          const anchor = index <= 0 ? "start" : index >= trend.points.length - 1 ? "end" : "middle";
          return (
            <text key={date} x={x} y={height - 8} textAnchor={anchor} fill="currentColor" fontSize="11" className="text-muted-foreground">
              {shortDateLabel(date)}
            </text>
          );
        })}
        {trend.medianSeconds != null ? (
          <line x1={padLeft} x2={width - padRight} y1={yAt(trend.medianSeconds)} y2={yAt(trend.medianSeconds)} stroke="#f0b429" strokeDasharray="7 5" strokeWidth="2" />
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
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        {comparable.length > 0 ? <li className="text-primary">You</li> : null}
        {trend.medianSeconds != null ? <li className="text-[#f0b429]">Median {formatTrendTime(trend.medianSeconds)}</li> : null}
        {trend.series.some((item) => !item.comparable) ? <li>Other</li> : null}
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
