import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "../src/lib/quantities.ts";
import { officialSegments, validateSessionBody } from "../src/lib/validate.ts";

function build(body: Record<string, unknown>) {
  const parsed = validateSessionBody({
    sessionDate: "2026-06-01",
    division: "men_open",
    sessionType: "full",
    rpe: null,
    notes: "",
    transitions: null,
    penalties: null,
    actualElapsed: null,
    ...body,
  });
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.fieldErrors));
  if (!parsed.ok) throw new Error("unreachable");
  return parsed.value;
}

test("full 16 splits plus recorded extras are the full elapsed, without a stopwatch", () => {
  const value = build({
    transitions: "1:00",
    penalties: "0:30",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  const totals = summarize(value);
  assert.equal(totals.fullElapsedSeconds, 16 * 240 + 60 + 30);
  assert.equal(totals.finishSeconds, totals.fullElapsedSeconds);
  assert.equal(totals.finishSource, "full");
  assert.equal(totals.totalKind, "full");
  assert.equal(totals.stopwatchSeconds, null);
  assert.match(totals.totalLabel, /Full elapsed/);
});

test("explicit 0:00 extras are measured none and still complete the full elapsed", () => {
  const value = build({
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  const totals = summarize(value);
  assert.equal(totals.finishSeconds, 16 * 240);
  assert.equal(value.transitionsSec, 0);
  assert.equal(value.penaltiesSec, 0);
});

test("blank extras stay unknown and the 16 splits are only a splits-only total", () => {
  const value = build({
    transitions: null,
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  const totals = summarize(value);
  assert.equal(totals.finishSeconds, null);
  assert.equal(totals.splitsOnlySeconds, 16 * 240);
  assert.equal(totals.totalLabel, "Splits-only total; transitions/penalties not recorded");
  assert.equal(totals.totalKind, "splits-only");
});

test("a missing split is a partial subtotal, not a full finish", () => {
  const value = build({
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments((key) =>
      key === "run_8" ? { status: "unrecorded", time: null } : { status: "timed", time: "4:00" },
    ),
  });
  const totals = summarize(value);
  assert.equal(totals.finishSeconds, null);
  assert.equal(totals.partialSubtotalSeconds, 15 * 240);
  assert.equal(totals.totalKind, "partial");
  assert.equal(totals.unrecordedCount, 1);
  assert.match(totals.totalLabel, /not a full finish/);
});

test("stopwatch is separate and does not replace the calculated total", () => {
  const value = build({
    actualElapsed: "80:00",
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  const totals = summarize(value);
  assert.equal(totals.finishSeconds, 16 * 240);
  assert.equal(totals.stopwatchSeconds, 80 * 60);
  assert.equal(totals.stopwatchDifferenceSeconds, 80 * 60 - 16 * 240);
  assert.notEqual(totals.totalLabel.toLowerCase().includes("stopwatch"), true);
});

test("editing one split recomputes the full elapsed", () => {
  const first = build({
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  const edited = build({
    transitions: "0:00",
    penalties: "0:00",
    segments: officialSegments((key) => ({ status: "timed", time: key === "skierg" ? "5:00" : "4:00" })),
  });
  assert.equal(summarize(edited).finishSeconds, summarize(first).finishSeconds! + 60);
});

test("custom and partial sessions sum timed pieces and stay out of the full finish", () => {
  const custom = build({
    sessionType: "custom",
    segments: officialSegments((key) =>
      key === "run_1" || key === "skierg" ? { status: "timed", time: "3:00" } : { status: "skipped", time: null },
    ),
  });
  const customTotals = summarize(custom);
  assert.equal(customTotals.totalKind, "custom");
  assert.equal(customTotals.totalLabel, "Completed custom total");
  assert.equal(customTotals.completedSeconds, 2 * 180);
  assert.equal(customTotals.finishSeconds, null);
  assert.equal(customTotals.skippedCount, 14);

  const partial = build({
    sessionType: "partial",
    transitions: "1:00",
    segments: officialSegments((key) => (key === "row" ? { status: "timed", time: "4:30" } : { status: "unrecorded", time: null })),
  });
  const partialTotals = summarize(partial);
  assert.equal(partialTotals.totalKind, "partial-session");
  assert.equal(partialTotals.totalLabel, "Completed partial total");
  assert.equal(partialTotals.completedSeconds, 270);
  assert.equal(partialTotals.finishSeconds, null);
  assert.equal(partialTotals.unrecordedCount, 15);
  assert.equal(partial.transitionsSec, 60);
  assert.equal(partialTotals.completedSeconds, 270);
});

test("a blank transition is valid and zero is not invented for it", () => {
  const blank = validateSessionBody({
    sessionDate: "2026-06-01",
    division: "women_open",
    sessionType: "full",
    actualElapsed: null,
    transitions: null,
    penalties: null,
    rpe: null,
    notes: "",
    segments: officialSegments(() => ({ status: "unrecorded", time: null }), "women_open"),
  });
  assert.equal(blank.ok, true);
  if (!blank.ok) return;
  assert.equal(blank.value.transitionsSec, null);
  assert.equal(blank.value.penaltiesSec, null);
  assert.equal(summarize(blank.value).finishSeconds, null);
});
