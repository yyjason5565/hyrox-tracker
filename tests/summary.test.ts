import assert from "node:assert/strict";
import { test } from "node:test";
import { configurationFor, officialBests, summarize } from "../src/lib/quantities.ts";
import { todayInKualaLumpur } from "../src/lib/time.ts";
import { officialSegments, validateSessionBody } from "../src/lib/validate.ts";

const today = todayInKualaLumpur(new Date("2026-11-06T16:30:00.000Z"));

function session(body: Record<string, unknown>) {
  const parsed = validateSessionBody({ sessionDate: "2026-03-01", rpe: null, notes: "", transitions: null, penalties: null, actualElapsed: null, ...body });
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.fieldErrors));
  if (!parsed.ok) throw new Error("unreachable");
  return parsed.value;
}

test("Kuala Lumpur date rolls at UTC+8", () => {
  assert.equal(today, "2026-11-07");
  assert.equal(todayInKualaLumpur(new Date("2026-11-06T15:30:00.000Z")), "2026-11-06");
});

test("run pace uses the recorded distance, not 1 km or 8 km", () => {
  const value = session({
    sessionType: "partial",
    segments: officialSegments((key) => {
      if (key === "run_1") return { status: "timed", time: "2:00", performed: { meters: 400 } };
      if (key === "run_2") return { status: "timed", time: "8:00", performed: { meters: 1600 } };
      return { status: "unrecorded", time: null };
    }),
  });
  const totals = summarize(value);
  assert.equal(totals.runs.distanceMeters, 2000);
  assert.equal(totals.runs.timedSeconds, 600);
  assert.equal(totals.runs.averagePaceSecPerKm, 300);
  assert.equal(totals.runs.timedCount, 2);
  assert.notEqual(totals.runs.distanceMeters, 8000);
  const run = value.segments.find((segment) => segment.key === "run_1");
  assert.ok(run);
  assert.equal(run.seconds, 120);
  assert.equal(run.performedMeters, 400);
});

test("blank and skipped splits are not zeros and block an official best", () => {
  const partial = session({
    sessionType: "partial",
    segments: officialSegments((key) =>
      key === "run_1" ? { status: "timed", time: "5:00" } : { status: "unrecorded", time: null },
    ),
  });
  const totals = summarize(partial);
  assert.equal(totals.runs.timedSeconds, 300);
  assert.equal(totals.runs.distanceMeters, 1000);
  assert.equal(partial.segments.filter((segment) => segment.seconds === 0).length, 0);
  assert.equal(partial.segments.filter((segment) => segment.status === "unrecorded" && segment.seconds === null).length, 15);
  assert.equal(configurationFor(partial).raceEligible, false);

  const skipped = session({
    sessionType: "full",
    actualElapsed: "70:00",
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments((key) =>
      key === "sled_push" ? { status: "skipped", time: null } : { status: "timed", time: "4:00" },
    ),
  });
  assert.equal(summarize(skipped).stations.timedCount, 7);
  assert.equal(skipped.segments.find((segment) => segment.key === "sled_push")?.seconds, null);
  const reasons = configurationFor(skipped).reasons.join(" ");
  assert.match(reasons, /Sled push was skipped/);
  assert.equal(configurationFor(skipped).raceEligible, false);
});

test("official full race is eligible and a faster modified session is not the best", () => {
  const official = session({
    sessionType: "full",
    actualElapsed: "80:00",
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  assert.equal(configurationFor(official).raceEligible, true);
  assert.equal(configurationFor(official).modified, false);

  const modified = session({
    sessionType: "full",
    actualElapsed: "50:00",
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments((key) => ({
      status: "timed",
      time: "2:00",
      performed: key === "run_1" ? { meters: 400 } : null,
    })),
  });
  assert.equal(configurationFor(modified).raceEligible, false);
  assert.equal(configurationFor(modified).modified, true);
  assert.match(configurationFor(modified).reasons.join(" "), /Run 1 distance was 400 m/);

  const flagged = validateSessionBody({
    sessionDate: "2026-03-01",
    sessionType: "full",
    standardLoads: true,
    actualElapsed: "40:00",
    transitions: "0:00",
    penalties: "0:00",
    rpe: null,
    notes: "",
    segments: officialSegments(() => ({ status: "timed", time: "3:00" })),
  });
  assert.equal(flagged.ok, false);

  const bests = officialBests([
    { id: "official", sessionDate: "2026-03-01", segments: official.segments, math: official },
    { id: "modified", sessionDate: "2026-03-02", segments: modified.segments, math: modified },
  ]);
  assert.equal(bests.eligibleCount, 1);
  assert.equal(bests.finish?.sessionId, "official");
  assert.equal(bests.finish?.seconds, 80 * 60);
  assert.equal(bests.segments.run_1?.sessionId, "official");
  assert.notEqual(bests.segments.run_1?.seconds, 120);
});

test("custom type is excluded even when every quantity matches", () => {
  const custom = session({
    sessionType: "custom",
    actualElapsed: "75:00",
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  assert.equal(configurationFor(custom).raceEligible, false);
  assert.match(configurationFor(custom).reasons.join(" "), /Marked custom/);
});

test("invalid split time is rejected and zero is not stored", () => {
  const invalid = validateSessionBody({
    sessionDate: "2026-03-01",
    sessionType: "partial",
    actualElapsed: null,
    transitions: null,
    penalties: null,
    rpe: null,
    notes: "",
    segments: officialSegments((key) =>
      key === "run_1" ? { status: "timed", time: "0:00" } : { status: "unrecorded", time: null },
    ),
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.fieldErrors["segments.run_1.time"] ?? "", /blank/i);
  const badClock = validateSessionBody({
    sessionDate: "2026-03-01",
    sessionType: "partial",
    actualElapsed: null,
    transitions: null,
    penalties: null,
    rpe: null,
    notes: "",
    segments: officialSegments((key) =>
      key === "wall_balls" ? { status: "timed", time: "12:60" } : { status: "unrecorded", time: null },
    ),
  });
  assert.equal(badClock.ok, false);
});
