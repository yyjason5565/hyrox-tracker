import { BENCHMARK_LABEL, isBenchmarkStation, referenceMedianSeconds } from "./benchmarks";
import { standardDetail, type DivisionId } from "./divisions";
import { configurationFor, segmentMatchesOfficial, type StoredSegment } from "./quantities";
import { SEGMENT_BY_KEY, type SegmentKey, type SessionType } from "./segments";
import type { SavedSession } from "./device-store";
import { formatDuration } from "./time";

export interface TrendPoint {
  id: string;
  sessionId: string;
  sessionDate: string;
  seconds: number;
  division: DivisionId;
  sessionType: SessionType;
  label: string;
  comparable: boolean;
  context: "race" | "isolated" | "other";
  seriesKey: string;
  detail: string;
}

export interface TrendSeries {
  key: string;
  comparable: boolean;
  points: TrendPoint[];
}

export interface StationTrend {
  points: TrendPoint[];
  series: TrendSeries[];
  medianSeconds: number | null;
  medianLabel: string | null;
}

function workloadSignature(segment: StoredSegment): string | null {
  const kind = SEGMENT_BY_KEY[segment.key].kind;
  const meters = segment.performedMeters ?? segment.targetMeters;
  const reps = segment.performedReps ?? segment.targetReps;
  const load = segment.performedLoadGrams ?? segment.targetLoadGrams;
  const a = segment.performedImplementAGrams ?? segment.targetImplementAGrams;
  const b = segment.performedImplementBGrams ?? segment.targetImplementBGrams;
  const height = segment.performedHeightCm ?? segment.targetHeightCm;
  if (kind === "run" || kind === "distance") {
    if (meters == null) return null;
    return `m${meters}`;
  }
  if (kind === "loaded") {
    if (meters == null || load == null) return null;
    return `m${meters}-l${load}`;
  }
  if (kind === "carry") {
    if (meters == null || a == null || b == null) return null;
    return `m${meters}-a${a}-b${b}`;
  }
  if (reps == null || load == null || height == null) return null;
  return `r${reps}-l${load}-h${height}`;
}

export function stationTrend(sessions: SavedSession[], division: DivisionId, key: SegmentKey): StationTrend {
  const name = SEGMENT_BY_KEY[key].name;
  const raw: TrendPoint[] = [];
  for (const session of sessions) {
    if (session.input.division !== division) continue;
    const segment = session.input.segments.find((item) => item.key === key);
    if (!segment || segment.status !== "timed" || segment.seconds == null) continue;
    const official = segmentMatchesOfficial(segment, division);
    const comparable = official && session.input.sessionType !== "custom";
    const race = comparable && configurationFor(session.input).raceEligible;
    const signature = workloadSignature(segment);
    const seriesKey = comparable
      ? race
        ? "official:race"
        : "official:isolated"
      : signature == null
        ? `unknown:${session.id}`
        : `${session.input.sessionType}:${signature}`;
    const context = comparable ? (race ? "race" : "isolated") : "other";
    const detail = comparable
      ? race
        ? `${standardDetail(division, key)}. Full race.`
        : `${standardDetail(division, key)}. This station only, not a full-race split.`
      : signature == null
        ? "Load or distance was not recorded, so this is not compared."
        : "Not the race workload, so it is not compared.";
    raw.push({
      id: `${session.id}:${key}`,
      sessionId: session.id,
      sessionDate: session.input.sessionDate,
      seconds: segment.seconds,
      division,
      sessionType: session.input.sessionType,
      label: name,
      comparable,
      context,
      seriesKey,
      detail,
    });
  }
  raw.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.sessionId.localeCompare(b.sessionId));
  const grouped = new Map<string, TrendPoint[]>();
  for (const point of raw) {
    const list = grouped.get(point.seriesKey) ?? [];
    list.push(point);
    grouped.set(point.seriesKey, list);
  }
  const series = [...grouped.entries()].map(([key, points]) => ({
    key,
    comparable: points[0]?.comparable === true,
    points,
  }));
  const hasComparable = series.some((item) => item.comparable);
  const medianSeconds = hasComparable && isBenchmarkStation(key) ? referenceMedianSeconds(division, key) : null;
  return {
    points: raw,
    series,
    medianSeconds,
    medianLabel: medianSeconds == null ? null : BENCHMARK_LABEL,
  };
}

export interface PersonalComparison {
  group: string;
  count: number;
  versusPrevious: "faster" | "slower" | "same" | "none";
  deltaSeconds: number | null;
  percent: number | null;
  versusBest: "best" | "tied" | "slower" | "none";
  lines: string[];
}

function gapLabel(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  if (abs < 60) return `${abs}s`;
  return formatDuration(abs);
}

/** Positive percent means the latest time is faster. Null when the earlier time is zero. */
export function fasterPercent(previousSeconds: number, latestSeconds: number): number | null {
  if (!Number.isFinite(previousSeconds) || !Number.isFinite(latestSeconds) || previousSeconds <= 0) return null;
  return Math.round(((previousSeconds - latestSeconds) / previousSeconds) * 100);
}

/** Chronological points already limited to one like-for-like group. */
export function compareChronological(points: Array<{ seconds: number }>, group: string, comparable = true): PersonalComparison | null {
  const latest = points[points.length - 1];
  if (!latest || !Number.isFinite(latest.seconds)) return null;
  const count = points.length;
  const bestSeconds = Math.min(...points.map((item) => item.seconds));
  const bestCount = points.filter((item) => item.seconds === bestSeconds).length;
  const previous = count >= 2 ? points[count - 2] : null;
  let versusPrevious: PersonalComparison["versusPrevious"] = "none";
  let deltaSeconds: number | null = null;
  let percent: number | null = null;
  const lines = [group];
  if (!previous || !comparable || !Number.isFinite(previous.seconds)) {
    lines.push("First time in this group.");
  } else {
    deltaSeconds = Math.abs(previous.seconds - latest.seconds);
    percent = fasterPercent(previous.seconds, latest.seconds);
    if (latest.seconds < previous.seconds) versusPrevious = "faster";
    else if (latest.seconds > previous.seconds) versusPrevious = "slower";
    else versusPrevious = "same";
    const change = versusPrevious === "same"
      ? "Same as last time."
      : `${gapLabel(deltaSeconds)} ${versusPrevious} than last time${percent == null || percent === 0 ? "" : ` · ${Math.abs(percent)}%`}.`;
    lines.push(change);
  }
  let versusBest: PersonalComparison["versusBest"] = "none";
  if (count >= 2 && comparable && Number.isFinite(bestSeconds)) {
    if (latest.seconds === bestSeconds && bestCount === 1) {
      versusBest = "best";
      lines.push("Best so far.");
    } else if (latest.seconds === bestSeconds) {
      versusBest = "tied";
      lines.push("Tied your best.");
    } else {
      versusBest = "slower";
      lines.push(`${gapLabel(latest.seconds - bestSeconds)} slower than your best.`);
    }
  }
  return { group, count, versusPrevious, deltaSeconds, percent, versusBest, lines };
}

export function personalComparison(trend: StationTrend): PersonalComparison | null {
  const latest = trend.points[trend.points.length - 1];
  if (!latest) return null;
  const groupPoints = trend.series.find((item) => item.key === latest.seriesKey)?.points ?? [latest];
  const group = latest.context === "race"
    ? "Full-race splits"
    : latest.context === "isolated"
      ? "Station-only splits"
      : latest.seriesKey.startsWith("unknown:")
        ? "Unmatched effort"
        : latest.sessionType === "custom"
          ? "Same custom load"
          : "Same load";
  const summary = compareChronological(groupPoints, group, !latest.seriesKey.startsWith("unknown:"));
  if (!summary) return null;
  if (trend.series.length > 1) summary.lines.push("Other efforts stay separate.");
  return summary;
}

export function formatTrendTime(seconds: number): string {
  return formatDuration(seconds);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDateLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1]}${Number(day)}`;
}

/** Two to four readable times, always including the ends. */
export function timeAxisTicks(seconds: number[]): number[] {
  const unique = [...new Set(seconds.map((value) => Math.round(value)))].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  if (unique.length === 1) return unique;
  const min = unique[0];
  const max = unique[unique.length - 1];
  if (max - min < 20) return [min, max];
  const middle = unique.length <= 4 ? unique.slice(1, -1) : [unique[Math.round((unique.length - 1) / 2)]];
  const ticks = [min, ...middle.filter((value) => value - min >= 20 && max - value >= 20), max];
  return [...new Set(ticks)].slice(0, 4);
}

/** First, middle, and last date when there are many, so labels do not collide. */
export function dateAxisTicks(dates: string[]): string[] {
  const unique = [...new Set(dates)].sort();
  if (unique.length <= 3) return unique;
  const middle = unique[Math.round((unique.length - 1) / 2)];
  return [unique[0], middle, unique[unique.length - 1]].filter((date, index, list) => list.indexOf(date) === index);
}
