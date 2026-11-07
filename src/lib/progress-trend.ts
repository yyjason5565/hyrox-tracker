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
    const seriesKey = comparable ? "official" : signature == null ? `unknown:${session.id}` : `${session.input.sessionType}:${signature}`;
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
