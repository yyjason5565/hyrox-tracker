import {
  QUANTITY_FIELDS,
  SEGMENT_BY_KEY,
  SEGMENTS,
  SESSION_TYPES,
  type SegmentKey,
  type SegmentStatus,
  type SessionType,
} from "./segments";
import type { StoredSegment, WireQuantity } from "./quantities";
import { emptySegmentRecord } from "./quantities";
import {
  addDays,
  clockMaxSeconds,
  isValidDateString,
  parseTimeInput,
  splitMaxSeconds,
  todayInKualaLumpur,
} from "./time";

export interface SessionInput {
  sessionDate: string;
  sessionType: SessionType;
  actualElapsedSec: number | null;
  transitionsSec: number | null;
  penaltiesSec: number | null;
  rpe: number | null;
  notes: string;
  segments: StoredSegment[];
}

export interface FieldFailure {
  error: string;
  fieldErrors: Record<string, string>;
}

const SESSION_FIELDS = new Set([
  "sessionDate",
  "sessionType",
  "actualElapsed",
  "transitions",
  "penalties",
  "rpe",
  "notes",
  "segments",
]);

const STATUSES = new Set<SegmentStatus>(["timed", "unrecorded", "skipped"]);

function fail(fieldErrors: Record<string, string>): FieldFailure {
  return { error: "Check the highlighted fields.", fieldErrors };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMeters(value: unknown, field: string, errors: Record<string, string>): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors[field] = "Enter distance in whole meters, or leave it blank.";
    return undefined;
  }
  if (value < 1 || value > 20_000) {
    errors[field] = "Distance must be between 1 and 20,000 meters.";
    return undefined;
  }
  return value;
}

function parseReps(value: unknown, field: string, errors: Record<string, string>): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors[field] = "Enter reps as a whole number, or leave them blank.";
    return undefined;
  }
  if (value < 1 || value > 2_000) {
    errors[field] = "Reps must be between 1 and 2,000.";
    return undefined;
  }
  return value;
}

function parseKgToGrams(value: unknown, field: string, errors: Record<string, string>): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors[field] = "Enter load in kilograms, or leave it blank.";
    return undefined;
  }
  if (!/^\d+(\.\d{1,3})?$/.test(String(value))) {
    errors[field] = "Use at most 3 decimal places for kilograms.";
    return undefined;
  }
  const grams = Math.round(value * 1000);
  if (grams < 100 || grams > 500_000) {
    errors[field] = "Load must be between 0.1 and 500 kg.";
    return undefined;
  }
  return grams;
}

function parseHeightCm(value: unknown, field: string, errors: Record<string, string>): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors[field] = "Enter target height in meters, or leave it blank.";
    return undefined;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
    errors[field] = "Use at most 2 decimal places for target height.";
    return undefined;
  }
  const cm = Math.round(value * 100);
  if (cm < 50 || cm > 600) {
    errors[field] = "Target height must be between 0.5 and 6 meters.";
    return undefined;
  }
  return cm;
}

interface ParsedQuantity {
  meters: number | null;
  reps: number | null;
  loadGrams: number | null;
  implementAGrams: number | null;
  implementBGrams: number | null;
  heightCm: number | null;
}

function emptyQuantity(): ParsedQuantity {
  return {
    meters: null,
    reps: null,
    loadGrams: null,
    implementAGrams: null,
    implementBGrams: null,
    heightCm: null,
  };
}

function readQuantity(
  value: unknown,
  key: SegmentKey,
  label: string,
  errors: Record<string, string>,
): ParsedQuantity | null {
  const empty = emptyQuantity();
  if (value === null || value === undefined) return empty;
  if (!isPlainObject(value)) {
    errors[`${label}`] = "Quantities must be an object.";
    return null;
  }
  const allowed = new Set<string>(QUANTITY_FIELDS[SEGMENT_BY_KEY[key].kind]);
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      errors[`${label}.${field}`] = "This quantity does not apply to this segment.";
    }
  }
  if (Object.keys(errors).some((item) => item.startsWith(`${label}.`) || item === label)) return null;

  const result: ParsedQuantity = { ...empty };
  if (allowed.has("meters")) {
    const meters = parseMeters(value.meters ?? null, `${label}.meters`, errors);
    if (meters === undefined) return null;
    result.meters = meters;
  }
  if (allowed.has("reps")) {
    const reps = parseReps(value.reps ?? null, `${label}.reps`, errors);
    if (reps === undefined) return null;
    result.reps = reps;
  }
  if (allowed.has("loadKg")) {
    const grams = parseKgToGrams(value.loadKg ?? null, `${label}.loadKg`, errors);
    if (grams === undefined) return null;
    result.loadGrams = grams;
  }
  if (allowed.has("heightM")) {
    const height = parseHeightCm(value.heightM ?? null, `${label}.heightM`, errors);
    if (height === undefined) return null;
    result.heightCm = height;
  }
  if (allowed.has("implementsKg")) {
    const raw = value.implementsKg ?? null;
    if (raw === null) {
      result.implementAGrams = null;
      result.implementBGrams = null;
    } else if (!Array.isArray(raw) || raw.length !== 2) {
      errors[`${label}.implementsKg`] = "Enter exactly two implement weights.";
      return null;
    } else {
      const first = parseKgToGrams(raw[0], `${label}.implementsKg.0`, errors);
      const second = parseKgToGrams(raw[1], `${label}.implementsKg.1`, errors);
      if (first === undefined || second === undefined) return null;
      result.implementAGrams = first;
      result.implementBGrams = second;
    }
  }
  return result;
}

function applyQuantity(segment: StoredSegment, source: "target" | "performed", quantity: NonNullable<ReturnType<typeof readQuantity>>) {
  if (source === "target") {
    segment.targetMeters = quantity.meters;
    segment.targetReps = quantity.reps;
    segment.targetLoadGrams = quantity.loadGrams;
    segment.targetImplementAGrams = quantity.implementAGrams;
    segment.targetImplementBGrams = quantity.implementBGrams;
    segment.targetHeightCm = quantity.heightCm;
  } else {
    segment.performedMeters = quantity.meters;
    segment.performedReps = quantity.reps;
    segment.performedLoadGrams = quantity.loadGrams;
    segment.performedImplementAGrams = quantity.implementAGrams;
    segment.performedImplementBGrams = quantity.implementBGrams;
    segment.performedHeightCm = quantity.heightCm;
  }
}

export function validateSessionBody(body: unknown, now = new Date()): { ok: true; value: SessionInput } | ({ ok: false } & FieldFailure) {
  if (!isPlainObject(body)) {
    return { ok: false, ...fail({ body: "Session must be a JSON object." }) };
  }
  const errors: Record<string, string> = {};
  for (const key of Object.keys(body)) {
    if (!SESSION_FIELDS.has(key)) {
      errors[key] = "This field is not accepted. Workload is stored on each segment, and ownership cannot be set here.";
    }
  }

  const sessionDate = body.sessionDate;
  if (typeof sessionDate !== "string" || !isValidDateString(sessionDate)) {
    errors.sessionDate = "Use a real date as YYYY-MM-DD.";
  } else if (sessionDate < "2000-01-01" || sessionDate > addDays(todayInKualaLumpur(now), 1)) {
    errors.sessionDate = "Use a date from 2000 through tomorrow in Asia/Kuala_Lumpur.";
  }

  const sessionType = body.sessionType;
  if (typeof sessionType !== "string" || !SESSION_TYPES.includes(sessionType as SessionType)) {
    errors.sessionType = "Choose full, partial, or custom.";
  }

  const actual = parseTimeInput(body.actualElapsed ?? null, { allowZero: false, maxSeconds: clockMaxSeconds() });
  if (!actual.ok) errors.actualElapsed = actual.error;
  const transitions = parseTimeInput(body.transitions ?? null, { allowZero: true, maxSeconds: clockMaxSeconds() });
  if (!transitions.ok) errors.transitions = transitions.error;
  const penalties = parseTimeInput(body.penalties ?? null, { allowZero: true, maxSeconds: clockMaxSeconds() });
  if (!penalties.ok) errors.penalties = penalties.error;

  let rpe: number | null = null;
  if (body.rpe === null || body.rpe === undefined || body.rpe === "") rpe = null;
  else if (typeof body.rpe !== "number" || !Number.isInteger(body.rpe) || body.rpe < 1 || body.rpe > 10) {
    errors.rpe = "RPE must be a whole number from 1 to 10, or blank.";
  } else rpe = body.rpe;

  let notes = "";
  if (body.notes === null || body.notes === undefined) notes = "";
  else if (typeof body.notes !== "string") errors.notes = "Notes must be text.";
  else if (body.notes.length > 2000) errors.notes = "Notes must be 2,000 characters or fewer.";
  else if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body.notes)) errors.notes = "Notes contain unsupported characters.";
  else notes = body.notes;

  const segments: StoredSegment[] = [];
  if (!Array.isArray(body.segments) || body.segments.length !== SEGMENTS.length) {
    errors.segments = "Include all 16 segments in race order. Unrecorded and skipped pieces stay in the list.";
  } else {
    body.segments.forEach((raw, index) => {
      const expected = SEGMENTS[index];
      const prefix = `segments.${expected.key}`;
      if (!isPlainObject(raw)) {
        errors[prefix] = "Each segment must be an object.";
        return;
      }
      for (const key of Object.keys(raw)) {
        if (!["key", "status", "time", "target", "performed"].includes(key)) {
          errors[`${prefix}.${key}`] = "This field is not accepted.";
        }
      }
      if (raw.key !== expected.key) {
        errors[`${prefix}.key`] = `Position ${index + 1} must be ${expected.key}.`;
        return;
      }
      const status = raw.status;
      if (typeof status !== "string" || !STATUSES.has(status as SegmentStatus)) {
        errors[`${prefix}.status`] = "Status must be timed, unrecorded, or skipped.";
        return;
      }
      const time = parseTimeInput(raw.time ?? null, { allowZero: false, maxSeconds: splitMaxSeconds() });
      if (!time.ok) {
        errors[`${prefix}.time`] = time.error;
        return;
      }
      if (status === "timed" && time.seconds === null) {
        errors[`${prefix}.time`] = "A timed segment needs a time. Blank means unrecorded, not zero.";
        return;
      }
      if (status !== "timed" && time.seconds !== null) {
        errors[`${prefix}.time`] = "Skipped and unrecorded segments cannot also have a time.";
        return;
      }
      const target = readQuantity(raw.target, expected.key, `${prefix}.target`, errors);
      const performed = readQuantity(raw.performed ?? null, expected.key, `${prefix}.performed`, errors);
      if (!target || !performed) return;
      const segment = emptySegmentRecord(expected.key);
      segment.status = status as SegmentStatus;
      segment.seconds = status === "timed" ? time.seconds : null;
      applyQuantity(segment, "target", target);
      applyQuantity(segment, "performed", performed);
      segments.push(segment);
    });
  }

  if (Object.keys(errors).length > 0 || segments.length !== SEGMENTS.length) {
    return { ok: false, ...fail(errors) };
  }

  return {
    ok: true,
    value: {
      sessionDate: sessionDate as string,
      sessionType: sessionType as SessionType,
      actualElapsedSec: actual.ok ? actual.seconds : null,
      transitionsSec: transitions.ok ? transitions.seconds : null,
      penaltiesSec: penalties.ok ? penalties.seconds : null,
      rpe,
      notes,
      segments,
    },
  };
}

export function officialTarget(key: SegmentKey): WireQuantity {
  const official = SEGMENT_BY_KEY[key].official;
  const quantity: WireQuantity = {};
  if (official.meters !== undefined) quantity.meters = official.meters;
  if (official.reps !== undefined) quantity.reps = official.reps;
  if (official.loadGrams !== undefined) quantity.loadKg = official.loadGrams / 1000;
  if (official.implementAGrams !== undefined && official.implementBGrams !== undefined) {
    quantity.implementsKg = [official.implementAGrams / 1000, official.implementBGrams / 1000];
  }
  if (official.heightCm !== undefined) quantity.heightM = official.heightCm / 100;
  return quantity;
}

export interface WireSegmentInput {
  key: SegmentKey;
  status: SegmentStatus;
  time: string | null;
  target: WireQuantity;
  performed: WireQuantity | null;
}

export function officialSegments(
  resolve: (key: SegmentKey) => { status: SegmentStatus; time: string | null; performed?: WireQuantity | null; target?: WireQuantity },
): WireSegmentInput[] {
  return SEGMENTS.map((segment) => {
    const choice = resolve(segment.key);
    return {
      key: segment.key,
      status: choice.status,
      time: choice.time,
      target: choice.target ?? officialTarget(segment.key),
      performed: choice.performed ?? null,
    };
  });
}
