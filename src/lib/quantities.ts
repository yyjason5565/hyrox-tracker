import { officialWorkload, standardDetail, type DivisionId } from "./divisions";
import {
  SEGMENT_BY_KEY,
  SEGMENTS,
  type SegmentKey,
  type SegmentKind,
  type SegmentStatus,
  type SessionType,
} from "./segments";
import { formatClock, formatDuration, formatHeight, formatKg, formatMeters } from "./time";

export interface StoredSegment {
  key: SegmentKey;
  status: SegmentStatus;
  seconds: number | null;
  targetMeters: number | null;
  performedMeters: number | null;
  targetReps: number | null;
  performedReps: number | null;
  targetLoadGrams: number | null;
  performedLoadGrams: number | null;
  targetImplementAGrams: number | null;
  targetImplementBGrams: number | null;
  performedImplementAGrams: number | null;
  performedImplementBGrams: number | null;
  targetHeightCm: number | null;
  performedHeightCm: number | null;
}

export interface SessionMath {
  sessionType: SessionType;
  division: DivisionId;
  actualElapsedSec: number | null;
  transitionsSec: number | null;
  penaltiesSec: number | null;
  segments: StoredSegment[];
}

export interface WireQuantity {
  meters?: number | null;
  reps?: number | null;
  loadKg?: number | null;
  implementsKg?: [number | null, number | null] | null;
  heightM?: number | null;
}

export interface RunTotals {
  timedCount: number;
  timedSeconds: number | null;
  distanceMeters: number | null;
  averagePaceSecPerKm: number | null;
  missingDistanceCount: number;
}

export interface StationTotals {
  timedCount: number;
  timedSeconds: number | null;
}

export type TotalKind = "full" | "splits-only" | "partial" | "partial-session" | "custom" | "empty";

export interface SessionTotals {
  runs: RunTotals;
  stations: StationTotals;
  timedSegmentCount: number;
  skippedCount: number;
  unrecordedCount: number;
  timedSplitSeconds: number | null;
  splitSumSeconds: number | null;
  fullElapsedSeconds: number | null;
  splitsOnlySeconds: number | null;
  partialSubtotalSeconds: number | null;
  completedSeconds: number | null;
  accountedSeconds: number | null;
  totalKind: TotalKind;
  totalLabel: string;
  totalSeconds: number | null;
  finishSeconds: number | null;
  finishSource: "full" | null;
  stopwatchSeconds: number | null;
  stopwatchDifferenceSeconds: number | null;
  unaccountedSeconds: number | null;
}

export interface Configuration {
  raceEligible: boolean;
  modified: boolean;
  reasons: string[];
}

export interface DecoratedSegment {
  key: SegmentKey;
  name: string;
  kind: SegmentKind;
  detail: string;
  status: SegmentStatus;
  time: string | null;
  seconds: number | null;
  target: WireQuantity;
  performed: WireQuantity | null;
  effective: WireQuantity;
  paceSeconds: number | null;
  paceUnit: string | null;
  planNote: string | null;
}

export interface Mark {
  seconds: number;
  sessionId: string;
  sessionDate: string;
}

function pick(performed: number | null, target: number | null): number | null {
  return performed !== null ? performed : target;
}

export function effectiveMeters(segment: StoredSegment): number | null {
  return pick(segment.performedMeters, segment.targetMeters);
}

export function effectiveReps(segment: StoredSegment): number | null {
  return pick(segment.performedReps, segment.targetReps);
}

export function effectiveLoadGrams(segment: StoredSegment): number | null {
  return pick(segment.performedLoadGrams, segment.targetLoadGrams);
}

export function effectiveImplementA(segment: StoredSegment): number | null {
  return pick(segment.performedImplementAGrams, segment.targetImplementAGrams);
}

export function effectiveImplementB(segment: StoredSegment): number | null {
  return pick(segment.performedImplementBGrams, segment.targetImplementBGrams);
}

export function effectiveHeightCm(segment: StoredSegment): number | null {
  return pick(segment.performedHeightCm, segment.targetHeightCm);
}

function gramsToKg(grams: number | null): number | null {
  if (grams === null) return null;
  return grams / 1000;
}

function cmToM(cm: number | null): number | null {
  if (cm === null) return null;
  return cm / 100;
}

export function toWireQuantity(segment: StoredSegment, source: "target" | "performed" | "effective"): WireQuantity {
  const def = SEGMENT_BY_KEY[segment.key];
  const meters =
    source === "target"
      ? segment.targetMeters
      : source === "performed"
        ? segment.performedMeters
        : effectiveMeters(segment);
  const reps =
    source === "target"
      ? segment.targetReps
      : source === "performed"
        ? segment.performedReps
        : effectiveReps(segment);
  const load =
    source === "target"
      ? segment.targetLoadGrams
      : source === "performed"
        ? segment.performedLoadGrams
        : effectiveLoadGrams(segment);
  const implementA =
    source === "target"
      ? segment.targetImplementAGrams
      : source === "performed"
        ? segment.performedImplementAGrams
        : effectiveImplementA(segment);
  const implementB =
    source === "target"
      ? segment.targetImplementBGrams
      : source === "performed"
        ? segment.performedImplementBGrams
        : effectiveImplementB(segment);
  const height =
    source === "target"
      ? segment.targetHeightCm
      : source === "performed"
        ? segment.performedHeightCm
        : effectiveHeightCm(segment);

  const quantity: WireQuantity = {};
  if (def.kind === "run" || def.kind === "distance" || def.kind === "loaded" || def.kind === "carry") {
    quantity.meters = meters;
  }
  if (def.kind === "loaded" || def.kind === "wall") quantity.loadKg = gramsToKg(load);
  if (def.kind === "carry") {
    quantity.implementsKg = [gramsToKg(implementA), gramsToKg(implementB)];
  }
  if (def.kind === "wall") {
    quantity.reps = reps;
    quantity.heightM = cmToM(height);
  }
  return quantity;
}

function quantityHasValue(quantity: WireQuantity): boolean {
  if (quantity.meters != null) return true;
  if (quantity.reps != null) return true;
  if (quantity.loadKg != null) return true;
  if (quantity.heightM != null) return true;
  if (quantity.implementsKg && quantity.implementsKg.some((value) => value != null)) return true;
  return false;
}

export function segmentPace(segment: StoredSegment): { seconds: number; unit: string } | null {
  if (segment.status !== "timed" || segment.seconds === null) return null;
  const def = SEGMENT_BY_KEY[segment.key];
  if (def.kind === "run") {
    const meters = effectiveMeters(segment);
    if (meters === null || meters <= 0) return null;
    return { seconds: segment.seconds / (meters / 1000), unit: "/km" };
  }
  if (segment.key === "skierg" || segment.key === "row") {
    const meters = effectiveMeters(segment);
    if (meters === null || meters <= 0) return null;
    return { seconds: segment.seconds / (meters / 500), unit: "/500 m" };
  }
  if (def.kind === "wall") {
    const reps = effectiveReps(segment);
    if (reps === null || reps <= 0) return null;
    return { seconds: segment.seconds / reps, unit: "/rep" };
  }
  return null;
}

function planNote(segment: StoredSegment): string | null {
  const def = SEGMENT_BY_KEY[segment.key];
  const parts: string[] = [];
  const compare = (label: string, performed: number | null, target: number | null, text: (value: number) => string) => {
    if (performed === null || target === null || performed === target) return;
    parts.push(`${label} planned ${text(target)}, performed ${text(performed)}`);
  };
  if (def.kind !== "wall") {
    compare("Distance", segment.performedMeters, segment.targetMeters, formatMeters);
  }
  if (def.kind === "loaded" || def.kind === "wall") {
    compare("Load", segment.performedLoadGrams, segment.targetLoadGrams, formatKg);
  }
  if (def.kind === "carry") {
    compare("Implement A", segment.performedImplementAGrams, segment.targetImplementAGrams, formatKg);
    compare("Implement B", segment.performedImplementBGrams, segment.targetImplementBGrams, formatKg);
  }
  if (def.kind === "wall") {
    compare("Reps", segment.performedReps, segment.targetReps, (value) => `${value} reps`);
    compare("Target height", segment.performedHeightCm, segment.targetHeightCm, formatHeight);
  }
  if (parts.length === 0) return null;
  return `${parts.join(". ")}.`;
}

function workloadMismatches(segment: StoredSegment, division: DivisionId): string[] {
  const def = SEGMENT_BY_KEY[segment.key];
  const reasons: string[] = [];
  const official = officialWorkload(division, segment.key);
  if (official.meters !== undefined) {
    const meters = effectiveMeters(segment);
    if (meters === null) reasons.push(`${def.name} has no distance recorded.`);
    else if (meters !== official.meters) {
      reasons.push(`${def.name} distance was ${meters} m, not ${official.meters} m.`);
    }
  }
  if (official.reps !== undefined) {
    const reps = effectiveReps(segment);
    if (reps === null) reasons.push(`${def.name} has no reps recorded.`);
    else if (reps !== official.reps) {
      reasons.push(`${def.name} was ${reps} reps, not ${official.reps} reps.`);
    }
  }
  if (official.loadGrams !== undefined) {
    const load = effectiveLoadGrams(segment);
    if (load === null) reasons.push(`${def.name} has no load recorded.`);
    else if (load !== official.loadGrams) {
      reasons.push(`${def.name} load was ${formatKg(load)}, not ${formatKg(official.loadGrams)}.`);
    }
  }
  if (official.implementAGrams !== undefined && official.implementBGrams !== undefined) {
    const first = effectiveImplementA(segment);
    const second = effectiveImplementB(segment);
    if (first === null || second === null) {
      reasons.push(`${def.name} needs both implement weights.`);
    } else if (first !== official.implementAGrams || second !== official.implementBGrams) {
      reasons.push(
        `${def.name} implements were ${formatKg(first)} and ${formatKg(second)}, not ${formatKg(official.implementAGrams)} and ${formatKg(official.implementBGrams)}.`,
      );
    }
  }
  if (official.heightCm !== undefined) {
    const height = effectiveHeightCm(segment);
    if (height === null) reasons.push(`${def.name} has no target height recorded.`);
    else if (height !== official.heightCm) {
      reasons.push(
        `${def.name} target height was ${formatHeight(height)}, not ${formatHeight(official.heightCm)}.`,
      );
    }
  }
  return reasons;
}

export function segmentMatchesOfficial(segment: StoredSegment, division: DivisionId): boolean {
  return workloadMismatches(segment, division).length === 0;
}

export function summarize(session: SessionMath): SessionTotals {
  let runTimedCount = 0;
  let runTimedSeconds = 0;
  let pacedSeconds = 0;
  let pacedMeters = 0;
  let pacedCount = 0;
  let missingDistanceCount = 0;
  let stationTimedCount = 0;
  let stationTimedSeconds = 0;
  let timedSegmentCount = 0;
  let skippedCount = 0;
  let unrecordedCount = 0;
  let timedSplit = 0;

  for (const segment of session.segments) {
    const def = SEGMENT_BY_KEY[segment.key];
    if (segment.status === "skipped") {
      skippedCount += 1;
      continue;
    }
    if (segment.status !== "timed" || segment.seconds === null) {
      unrecordedCount += 1;
      continue;
    }
    timedSegmentCount += 1;
    timedSplit += segment.seconds;
    if (def.kind === "run") {
      runTimedCount += 1;
      runTimedSeconds += segment.seconds;
      const meters = effectiveMeters(segment);
      if (meters === null) {
        missingDistanceCount += 1;
        continue;
      }
      pacedCount += 1;
      pacedSeconds += segment.seconds;
      pacedMeters += meters;
    } else {
      stationTimedCount += 1;
      stationTimedSeconds += segment.seconds;
    }
  }

  const allTimed = timedSegmentCount === session.segments.length && session.segments.length > 0;
  const extrasRecorded = session.transitionsSec !== null && session.penaltiesSec !== null;
  const timedSplitSeconds = timedSegmentCount > 0 ? timedSplit : null;
  const splitSumSeconds = allTimed ? timedSplit : null;
  const fullElapsedSeconds =
    allTimed && extrasRecorded ? timedSplit + (session.transitionsSec ?? 0) + (session.penaltiesSec ?? 0) : null;
  const splitsOnlySeconds = allTimed && !extrasRecorded ? timedSplit : null;

  let totalKind: TotalKind = "empty";
  let totalLabel = "No timed splits yet";
  let totalSeconds: number | null = null;
  let partialSubtotalSeconds: number | null = null;
  let completedSeconds: number | null = null;

  if (session.sessionType === "custom" || session.sessionType === "partial") {
    if (timedSplitSeconds !== null) {
      totalKind = session.sessionType === "custom" ? "custom" : "partial-session";
      totalLabel = session.sessionType === "custom" ? "Completed custom total" : "Completed partial total";
      totalSeconds = timedSplitSeconds;
      completedSeconds = timedSplitSeconds;
    }
  } else if (fullElapsedSeconds !== null) {
    totalKind = "full";
    totalLabel = "Full elapsed, including Roxzone/transitions and penalties";
    totalSeconds = fullElapsedSeconds;
  } else if (splitsOnlySeconds !== null) {
    totalKind = "splits-only";
    totalLabel = "Splits-only total; transitions/penalties not recorded";
    totalSeconds = splitsOnlySeconds;
  } else if (timedSplitSeconds !== null) {
    totalKind = "partial";
    totalLabel = "Partial subtotal, not a full finish";
    totalSeconds = timedSplitSeconds;
    partialSubtotalSeconds = timedSplitSeconds;
  }

  const stopwatchSeconds = session.actualElapsedSec;
  const stopwatchDifferenceSeconds =
    stopwatchSeconds !== null && totalSeconds !== null ? stopwatchSeconds - totalSeconds : null;
  const finishSeconds = session.sessionType === "full" ? fullElapsedSeconds : null;

  return {
    runs: {
      timedCount: runTimedCount,
      timedSeconds: runTimedCount > 0 ? runTimedSeconds : null,
      distanceMeters: pacedCount > 0 ? pacedMeters : null,
      averagePaceSecPerKm: pacedMeters > 0 ? pacedSeconds / (pacedMeters / 1000) : null,
      missingDistanceCount,
    },
    stations: {
      timedCount: stationTimedCount,
      timedSeconds: stationTimedCount > 0 ? stationTimedSeconds : null,
    },
    timedSegmentCount,
    skippedCount,
    unrecordedCount,
    timedSplitSeconds,
    splitSumSeconds,
    fullElapsedSeconds,
    splitsOnlySeconds,
    partialSubtotalSeconds,
    completedSeconds,
    accountedSeconds: fullElapsedSeconds,
    totalKind,
    totalLabel,
    totalSeconds,
    finishSeconds,
    finishSource: finishSeconds !== null ? "full" : null,
    stopwatchSeconds,
    stopwatchDifferenceSeconds,
    unaccountedSeconds: fullElapsedSeconds !== null && stopwatchSeconds !== null ? stopwatchSeconds - fullElapsedSeconds : null,
  };
}

export function configurationFor(session: SessionMath): Configuration {
  const reasons: string[] = [];
  if (session.sessionType === "partial") {
    reasons.push("Marked partial, so it is not a full-race result.");
  }
  if (session.sessionType === "custom") {
    reasons.push("Marked custom, so it is not a full-race result.");
  }

  let modified = false;
  let allTimed = true;
  for (const def of SEGMENTS) {
    const segment = session.segments.find((item) => item.key === def.key);
    if (!segment || segment.status === "unrecorded") {
      allTimed = false;
      reasons.push(`${def.name} was not recorded.`);
      continue;
    }
    if (segment.status === "skipped") {
      allTimed = false;
      reasons.push(`${def.name} was skipped.`);
      continue;
    }
    if (segment.status !== "timed" || segment.seconds === null) {
      allTimed = false;
      reasons.push(`${def.name} was not recorded.`);
      continue;
    }
    const mismatches = workloadMismatches(segment, session.division);
    if (mismatches.length > 0) {
      modified = true;
      reasons.push(...mismatches);
    }
  }

  const totals = summarize(session);
  if (session.sessionType === "full" && allTimed && !modified && totals.finishSeconds === null) {
    reasons.push(
      "Enter Roxzone/transitions and penalties to complete the full elapsed time. Use 0:00 when there were none. Blank is not recorded, not zero. A stopwatch time is optional and is not the full elapsed time.",
    );
  }

  return { raceEligible: reasons.length === 0, modified, reasons };
}

export function decorateSegment(segment: StoredSegment, division?: DivisionId): DecoratedSegment {
  const def = SEGMENT_BY_KEY[segment.key];
  const pace = segmentPace(segment);
  const performed = toWireQuantity(segment, "performed");
  return {
    key: segment.key,
    name: def.name,
    kind: def.kind,
    detail: division ? standardDetail(division, segment.key) : def.detail,
    status: segment.status,
    time: formatClock(segment.seconds),
    seconds: segment.seconds,
    target: toWireQuantity(segment, "target"),
    performed: quantityHasValue(performed) ? performed : null,
    effective: toWireQuantity(segment, "effective"),
    paceSeconds: pace?.seconds ?? null,
    paceUnit: pace?.unit ?? null,
    planNote: planNote(segment),
  };
}

export function emptySegmentRecord(key: SegmentKey): StoredSegment {
  return {
    key,
    status: "unrecorded",
    seconds: null,
    targetMeters: null,
    performedMeters: null,
    targetReps: null,
    performedReps: null,
    targetLoadGrams: null,
    performedLoadGrams: null,
    targetImplementAGrams: null,
    targetImplementBGrams: null,
    performedImplementAGrams: null,
    performedImplementBGrams: null,
    targetHeightCm: null,
    performedHeightCm: null,
  };
}

export function officialBests(
  sessions: Array<{ id: string; sessionDate: string; segments: StoredSegment[]; math: SessionMath }>,
  division: DivisionId,
): { eligibleCount: number; finish: Mark | null; segments: Record<SegmentKey, Mark | null> } {
  const segmentMarks = Object.fromEntries(SEGMENTS.map((segment) => [segment.key, null])) as Record<
    SegmentKey,
    Mark | null
  >;
  let finish: Mark | null = null;
  let eligibleCount = 0;

  const better = (candidate: Mark, current: Mark | null) => {
    if (!current) return true;
    if (candidate.seconds !== current.seconds) return candidate.seconds < current.seconds;
    if (candidate.sessionDate !== current.sessionDate) return candidate.sessionDate < current.sessionDate;
    return candidate.sessionId < current.sessionId;
  };

  for (const session of sessions) {
    const configuration = configurationFor(session.math);
    if (session.math.division !== division || !configuration.raceEligible) continue;
    eligibleCount += 1;
    const totals = summarize(session.math);
    if (totals.finishSeconds !== null) {
      const mark = { seconds: totals.finishSeconds, sessionId: session.id, sessionDate: session.sessionDate };
      if (better(mark, finish)) finish = mark;
    }
    for (const segment of session.segments) {
      if (segment.status !== "timed" || segment.seconds === null) continue;
      const mark = { seconds: segment.seconds, sessionId: session.id, sessionDate: session.sessionDate };
      if (better(mark, segmentMarks[segment.key])) segmentMarks[segment.key] = mark;
    }
  }

  return { eligibleCount, finish, segments: segmentMarks };
}

export function officialFinishSeries(
  sessions: Array<{ id: string; sessionDate: string; math: SessionMath }>,
  division: DivisionId,
): Array<{ id: string; sessionDate: string; seconds: number }> {
  const points: Array<{ id: string; sessionDate: string; seconds: number }> = [];
  for (const session of sessions) {
    if (session.math.division !== division || !configurationFor(session.math).raceEligible) continue;
    const finish = summarize(session.math).finishSeconds;
    if (finish === null) continue;
    points.push({ id: session.id, sessionDate: session.sessionDate, seconds: finish });
  }
  points.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.id.localeCompare(b.id));
  return points;
}

export function formatPace(seconds: number | null, unit: string | null): string {
  if (seconds === null || unit === null) return "—";
  return `${formatDuration(seconds)} ${unit}`;
}
