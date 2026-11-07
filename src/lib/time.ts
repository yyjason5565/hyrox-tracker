import { TIME_ZONE } from "./segments";

const SPLIT_MAX_SECONDS = 3 * 60 * 60;
const CLOCK_MAX_SECONDS = 8 * 60 * 60;

export function splitMaxSeconds(): number {
  return SPLIT_MAX_SECONDS;
}

export function clockMaxSeconds(): number {
  return CLOCK_MAX_SECONDS;
}

export type TimeParse =
  | { ok: true; seconds: number | null }
  | { ok: false; error: string };

export function parseTimeInput(
  value: unknown,
  options: { allowZero: boolean; maxSeconds: number },
): TimeParse {
  if (value === null || value === undefined) return { ok: true, seconds: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Enter a time as mm:ss, or leave it blank." };
  }
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, seconds: null };

  const clock = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(trimmed);
  const minutes = /^(\d{1,4}):([0-5]\d)$/.exec(trimmed);
  let total: number | null = null;
  if (clock) {
    total = Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  } else if (minutes) {
    total = Number(minutes[1]) * 60 + Number(minutes[2]);
  } else {
    return {
      ok: false,
      error: "Use mm:ss with seconds under 60. Minutes may pass 59, or use h:mm:ss.",
    };
  }

  if (!options.allowZero && total === 0) {
    return {
      ok: false,
      error: "0:00 is not a recorded time. Leave the field blank when it was not recorded.",
    };
  }
  if (total > options.maxSeconds) {
    return { ok: false, error: "That time is longer than this field allows." };
  }
  return { ok: true, seconds: total };
}

export function formatDuration(total: number | null): string {
  if (total === null || Number.isNaN(total)) return "";
  const negative = total < 0;
  const abs = Math.abs(Math.round(total));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const body =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function formatClock(seconds: number | null): string | null {
  if (seconds === null) return null;
  return formatDuration(seconds);
}

export function todayInKualaLumpur(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function formatKg(grams: number): string {
  const kg = grams / 1000;
  const text = Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 1000) / 1000);
  return `${text} kg`;
}

export function formatHeight(cm: number): string {
  const meters = cm / 100;
  const text = Number.isInteger(meters) ? String(meters) : String(Math.round(meters * 100) / 100);
  return `${text} m`;
}

export function formatMeters(meters: number): string {
  return `${meters.toLocaleString("en-US")} m`;
}
