import type { DivisionId } from "./divisions";
import { segmentMatchesOfficial, type StoredSegment } from "./quantities";
import { SEGMENT_BY_KEY, type SegmentKey, type SessionType } from "./segments";
import { addDays } from "./time";

/**
 * Independent published sample. Not an official HYROX world average.
 * Men Open 174,215 results and Women Open 98,478 results.
 * Source checked 7 November 2026: https://userivo.app/guides/hyrox-station-times
 * Published 3 October 2026, data loaded 2 September 2026, season 2025/26.
 * Publisher reports 702,095 public results from 98 venues across divisions.
 * Included results have all 16 splits and a finish from 40 to 300 minutes.
 * Counts are race results, not unique athletes. Global completeness is unverified.
 * Do not blend with other publishers. Do not sum station medians into a race time.
 */
export const BENCHMARK_LABEL = "Published multi-venue sample median (2025/26)";
export const BENCHMARK_SOURCE_URL = "https://userivo.app/guides/hyrox-station-times";
export const BENCHMARK_SEASON = "2025/26";
export const BENCHMARK_CHECKED = "2026-11-07";

export const BENCHMARK_CAVEATS = [
  "This is a published multi-venue sample median, not an official world average and not a worldwide mean.",
  "Global completeness is unverified. The counts are race results, not unique athletes.",
  "The sample is season 2025/26. Official loads shown for logging are season 2026/27. They are related, not proof that every rule matched.",
  "Station medians cannot be added together to produce a median race time.",
  "Age-group tables, including 50\u201354, are not shown because no verified table is included here.",
  "Sled splits also depend on surface, carpet, sled, and friction.",
  "A shortened or custom station is not converted into a full-race equivalent.",
] as const;

const MEDIANS: Record<DivisionId, Record<BenchmarkStation, { seconds: number; results: number }>> = {
  men_open: {
    skierg: { seconds: 275, results: 174215 },
    sled_push: { seconds: 187, results: 174215 },
    sled_pull: { seconds: 299, results: 174215 },
    burpee_broad_jump: { seconds: 336, results: 174215 },
    row: { seconds: 293, results: 174215 },
    farmer_carry: { seconds: 131, results: 174215 },
    sandbag_lunge: { seconds: 320, results: 174215 },
    wall_balls: { seconds: 431, results: 174215 },
  },
  women_open: {
    skierg: { seconds: 318, results: 98478 },
    sled_push: { seconds: 176, results: 98478 },
    sled_pull: { seconds: 348, results: 98478 },
    burpee_broad_jump: { seconds: 405, results: 98478 },
    row: { seconds: 332, results: 98478 },
    farmer_carry: { seconds: 139, results: 98478 },
    sandbag_lunge: { seconds: 313, results: 98478 },
    wall_balls: { seconds: 411, results: 98478 },
  },
};

export const BENCHMARK_STATIONS = [
  "skierg",
  "sled_push",
  "sled_pull",
  "burpee_broad_jump",
  "row",
  "farmer_carry",
  "sandbag_lunge",
  "wall_balls",
] as const;

export type BenchmarkStation = (typeof BENCHMARK_STATIONS)[number];

export function isBenchmarkStation(key: SegmentKey): key is BenchmarkStation {
  return (BENCHMARK_STATIONS as readonly SegmentKey[]).includes(key);
}

export function sampleResults(division: DivisionId): number {
  return division === "men_open" ? 174215 : 98478;
}

export function referenceMedianSeconds(division: DivisionId, key: BenchmarkStation): number {
  return MEDIANS[division][key].seconds;
}

export interface ComparableSplit {
  key: BenchmarkStation;
  seconds: number;
  sessionDate: string;
  sessionId: string;
}

export interface BenchmarkSession {
  id: string;
  division: DivisionId;
  sessionType: SessionType;
  sessionDate: string;
  raceEligible: boolean;
  segments: StoredSegment[];
}

export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function comparableSplits(sessions: BenchmarkSession[], division: DivisionId): ComparableSplit[] {
  const splits: ComparableSplit[] = [];
  for (const session of sessions) {
    if (session.division !== division) continue;
    if (session.sessionType === "custom") continue;
    if (!session.raceEligible) continue;
    for (const segment of session.segments) {
      if (!isBenchmarkStation(segment.key)) continue;
      if (segment.status !== "timed" || segment.seconds === null) continue;
      if (!segmentMatchesOfficial(segment, division)) continue;
      splits.push({
        key: segment.key,
        seconds: segment.seconds,
        sessionDate: session.sessionDate,
        sessionId: session.id,
      });
    }
  }
  return splits;
}

/** Full official station inside a non-comparable session. Never used as the benchmark median. */
export function indicativeCount(sessions: BenchmarkSession[], division: DivisionId, key: BenchmarkStation): number {
  let count = 0;
  for (const session of sessions) {
    if (session.division !== division || session.sessionType === "custom" || session.raceEligible) continue;
    const segment = session.segments.find((item) => item.key === key);
    if (!segment || segment.status !== "timed" || segment.seconds === null) continue;
    if (segmentMatchesOfficial(segment, division)) count += 1;
  }
  return count;
}

export interface StationBenchmark {
  key: BenchmarkStation;
  name: string;
  medianSeconds: number;
  userMedianSeconds: number | null;
  samples: number;
  confidence: "none" | "low" | "comparable";
  deficitSeconds: number | null;
  deficitRatio: number | null;
  indicativeCount: number;
}

export function stationBenchmarks(
  sessions: BenchmarkSession[],
  division: DivisionId,
  today: string,
): StationBenchmark[] {
  const splits = comparableSplits(sessions, division);
  const windowStart = addDays(today, -90);
  return BENCHMARK_STATIONS.map((key) => {
    const recent = splits
      .filter((split) => split.key === key && split.sessionDate >= windowStart && split.sessionDate <= today)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.sessionId.localeCompare(a.sessionId))
      .slice(0, 3);
    const userMedianSeconds = medianOf(recent.map((split) => split.seconds));
    const reference = referenceMedianSeconds(division, key);
    const samples = recent.length;
    const confidence = samples === 0 ? "none" : samples === 1 ? "low" : "comparable";
    const deficitSeconds = userMedianSeconds === null ? null : Math.max(0, userMedianSeconds - reference);
    const deficitRatio = userMedianSeconds === null ? null : Math.max(0, userMedianSeconds / reference - 1);
    return {
      key,
      name: SEGMENT_BY_KEY[key].name,
      medianSeconds: reference,
      userMedianSeconds,
      samples,
      confidence,
      deficitSeconds,
      deficitRatio,
      indicativeCount: indicativeCount(sessions, division, key),
    };
  });
}

