"use client";

import { formatDuration } from "@/lib/time";

export function FinishChart({ points }: { points: Array<{ id: string; sessionDate: string; seconds: number }> }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The chart plots finish times from complete official-distance sessions only. Nothing to plot yet.
      </p>
    );
  }
  const width = 640;
  const height = 220;
  const pad = 28;
  const min = Math.min(...points.map((point) => point.seconds));
  const max = Math.max(...points.map((point) => point.seconds));
  const span = Math.max(max - min, 30);
  const low = min - span * 0.15;
  const high = max + span * 0.15;
  const xAt = (index: number) =>
    points.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (points.length - 1);
  const yAt = (seconds: number) => pad + ((high - seconds) / (high - low)) * (height - pad * 2);
  const line = points.map((point, index) => `${xAt(index)},${yAt(point.seconds)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-52 w-full">
        <title>Official full-race finish times</title>
        <line x1={pad} x2={width - pad} y1={pad} y2={pad} className="stroke-border" strokeWidth="1" />
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} className="stroke-border" strokeWidth="1" />
        {points.length > 1 ? <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={line} className="text-primary" /> : null}
        {points.map((point, index) => (
          <g key={point.id}>
            <circle cx={xAt(index)} cy={yAt(point.seconds)} r="5" className="fill-primary" />
            <text x={xAt(index)} y={yAt(point.seconds) - 10} textAnchor="middle" className="fill-foreground text-[12px]">
              {formatDuration(point.seconds)}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point.id}>
            {point.sessionDate}: {formatDuration(point.seconds)}
          </li>
        ))}
      </ul>
    </div>
  );
}
