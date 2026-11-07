import assert from "node:assert/strict";
import { test } from "node:test";
import { addProfile, emptyDevice, saveSession, type SavedSession } from "../src/lib/device-store.ts";
import { dateAxisTicks, formatTrendTime, shortDateLabel, stationTrend, timeAxisTicks } from "../src/lib/progress-trend.ts";
import { referenceMedianSeconds } from "../src/lib/benchmarks.ts";
import { officialSegments, validateSessionBody } from "../src/lib/validate.ts";

function session(division: "men_open" | "women_open", date: string, type: "full" | "partial" | "custom", patch?: (key: string) => { status: "timed" | "unrecorded" | "skipped"; time: string | null; performed?: { meters?: number; loadKg?: number | null } | null; target?: { meters?: number; loadKg?: number | null } } | undefined) {
  const parsed = validateSessionBody({
    sessionDate: date,
    division,
    sessionType: type,
    actualElapsed: type === "full" ? "80:00" : null,
    transitions: type === "full" ? "0:00" : null,
    penalties: type === "full" ? "0:00" : null,
    rpe: null,
    notes: "",
    segments: officialSegments((key) => {
      const extra = patch?.(key);
      if (extra) return extra;
      if (type === "partial") return key === "skierg" ? { status: "timed", time: "5:00" } : { status: "unrecorded", time: null };
      return { status: "timed", time: key === "skierg" ? "5:00" : "4:00" };
    }, division),
  });
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.fieldErrors));
  if (!parsed.ok) throw new Error("unreachable");
  return parsed.value;
}

function saved(division: "men_open" | "women_open", dates: string[]): SavedSession[] {
  let data = addProfile(emptyDevice(), "Example", division);
  const id = data.profiles[0].id;
  for (const date of dates) {
    data = saveSession(data, id, session(division, date, "full", (key) => (key === "skierg" ? { status: "timed", time: date.endsWith("01") ? "6:00" : "5:00" } : { status: "timed", time: "4:00" }))).data;
  }
  return data.profiles[0].sessions;
}

test("official station trend matches the division sample median and stays in date order", () => {
  const men = stationTrend(saved("men_open", ["2026-05-02", "2026-05-01"]), "men_open", "skierg");
  assert.deepEqual(men.points.map((point) => point.sessionDate), ["2026-05-01", "2026-05-02"]);
  assert.equal(men.points.every((point) => point.comparable && point.context === "race"), true);
  assert.equal(men.medianSeconds, referenceMedianSeconds("men_open", "skierg"));
  assert.equal(men.medianSeconds, 275);
  assert.equal(formatTrendTime(275), "4:35");
  assert.equal(men.series.filter((item) => item.comparable).length, 1);

  const women = stationTrend(saved("women_open", ["2026-06-01"]), "women_open", "skierg");
  assert.equal(women.medianSeconds, 318);
  assert.equal(women.points.length, 1);
  assert.equal(stationTrend(saved("men_open", ["2026-05-01"]), "women_open", "skierg").points.length, 0);
});

test("a full station inside a partial workout is charted and comparable, but custom or lighter work is not", () => {
  let data = addProfile(emptyDevice(), "Example", "men_open");
  const id = data.profiles[0].id;
  data = saveSession(data, id, session("men_open", "2026-07-01", "partial")).data;
  data = saveSession(data, id, session("men_open", "2026-07-02", "custom", (key) => (key === "skierg" ? { status: "timed", time: "4:00" } : { status: "timed", time: "4:00" }))).data;
  data = saveSession(data, id, session("men_open", "2026-07-03", "partial", (key) => (key === "sled_push" ? { status: "timed", time: "3:00", performed: { meters: 50, loadKg: 100 } } : { status: "unrecorded", time: null }))).data;
  data = saveSession(data, id, session("men_open", "2026-07-04", "partial", (key) => (key === "sled_push" ? { status: "timed", time: "3:10", target: { meters: 50, loadKg: null }, performed: null } : { status: "unrecorded", time: null }))).data;

  const ski = stationTrend(data.profiles[0].sessions, "men_open", "skierg");
  assert.equal(ski.points.length, 2);
  assert.equal(ski.points[0].comparable, true);
  assert.equal(ski.points[0].context, "isolated");
  assert.equal(ski.points[1].comparable, false);
  assert.equal(ski.points[1].seriesKey === ski.points[0].seriesKey, false);
  assert.equal(ski.medianSeconds, 275);

  const push = stationTrend(data.profiles[0].sessions, "men_open", "sled_push");
  assert.equal(push.points.length, 3);
  assert.equal(push.points.every((point) => point.comparable === false), true);
  assert.equal(push.medianSeconds, null);
  assert.equal(new Set(push.points.map((point) => point.seriesKey)).size, 3);
});

test("axis ticks stay sparse and readable", () => {
  assert.equal(shortDateLabel("2026-04-01"), "Apr1");
  assert.equal(shortDateLabel("2026-06-01"), "Jun1");
  const dates = dateAxisTicks(["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01"]);
  assert.deepEqual(dates.map(shortDateLabel), ["Apr1", "Jun1", "Jul1"]);
  const ticks = timeAxisTicks([210, 300, 318, 320, 360]);
  assert.ok(ticks.length >= 2 && ticks.length <= 4);
  assert.equal(ticks[0], 210);
  assert.equal(ticks[ticks.length - 1], 360);
  assert.equal(formatTrendTime(ticks[0]), "3:30");
});

test("runs have no sample median", () => {
  const trend = stationTrend(saved("men_open", ["2026-05-01", "2026-05-02"]), "men_open", "run_1");
  assert.equal(trend.points.length, 2);
  assert.equal(trend.medianSeconds, null);
  assert.equal(trend.medianLabel, null);
});
