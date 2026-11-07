import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseFocus, dailyPlan, emptyTraining, SAMPLE_WEEK, sanitizeTraining } from "../src/lib/advice.ts";
import { BENCHMARK_LABEL, referenceMedianSeconds, sampleResults, stationBenchmarks } from "../src/lib/benchmarks.ts";
import { APP_DEFINITION, APP_NAME, officialWorkload, standardDetail } from "../src/lib/divisions.ts";
import { DEVICE_STORAGE_KEY } from "../src/lib/device-store.ts";
import { BACKUP_FORMAT } from "../src/lib/segments.ts";
import { addProfile, emptyDevice, exportProfile, importBackup, saveSession } from "../src/lib/device-store.ts";
import { configurationFor, officialBests } from "../src/lib/quantities.ts";
import { proteinRangeGrams } from "../src/lib/nutrition.ts";
import { officialSegments, validateSessionBody } from "../src/lib/validate.ts";

function race(division: "men_open" | "women_open", date: string, ski = "4:00") {
  const parsed = validateSessionBody({
    sessionDate: date,
    division,
    sessionType: "full",
    actualElapsed: null,
    transitions: "0:00",
    penalties: "0:00",
    rpe: 6,
    notes: "",
    segments: officialSegments((key) => ({ status: "timed", time: key === "skierg" ? ski : "2:00" }), division),
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("unreachable");
  return parsed.value;
}

test("product definition names both Singles Open categories and not every HYROX division", () => {
  assert.equal(APP_NAME, "RaceForge");
  assert.equal(DEVICE_STORAGE_KEY, "lane-ledger.device.v1");
  assert.equal(BACKUP_FORMAT, "lane-ledger-backup");
  assert.equal(APP_DEFINITION, "HYROX training tracker for Men\u2019s and Women\u2019s Singles Open");
  assert.equal(APP_DEFINITION.toLowerCase().includes("pro"), false);
});

test("women open loads differ from men and a matching women session is its own official result", () => {
  assert.equal(officialWorkload("women_open", "sled_push").loadGrams, 102_000);
  assert.equal(officialWorkload("women_open", "sled_pull").loadGrams, 78_000);
  assert.equal(officialWorkload("women_open", "farmer_carry").implementAGrams, 16_000);
  assert.equal(officialWorkload("women_open", "sandbag_lunge").loadGrams, 10_000);
  assert.equal(officialWorkload("women_open", "wall_balls").loadGrams, 4_000);
  assert.equal(officialWorkload("women_open", "wall_balls").heightCm, 270);
  assert.match(standardDetail("women_open", "wall_balls"), /4 kg/);
  assert.match(standardDetail("men_open", "sled_push"), /152 kg/);

  const women = race("women_open", "2026-08-01");
  const menLoadsOnWomen = validateSessionBody({
    sessionDate: "2026-08-01",
    division: "women_open",
    sessionType: "full",
    actualElapsed: null,
    transitions: "0:00",
    penalties: "0:00",
    rpe: null,
    notes: "",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" }), "men_open"),
  });
  assert.equal(menLoadsOnWomen.ok, true);
  if (!menLoadsOnWomen.ok) return;
  assert.equal(configurationFor(women).raceEligible, true);
  assert.equal(configurationFor(menLoadsOnWomen.value).raceEligible, false);

  const bests = officialBests(
    [
      { id: "w", sessionDate: women.sessionDate, segments: women.segments, math: women },
      { id: "m", sessionDate: "2026-08-02", segments: menLoadsOnWomen.value.segments, math: { ...menLoadsOnWomen.value, division: "men_open" } },
    ],
    "women_open",
  );
  assert.equal(bests.eligibleCount, 1);
  assert.equal(bests.finish?.sessionId, "w");
});

test("sample medians are the published 2025/26 figures and custom work is excluded", () => {
  assert.equal(BENCHMARK_LABEL, "Published multi-venue sample median (2025/26)");
  assert.equal(BENCHMARK_LABEL.toLowerCase().includes("world average"), false);
  assert.equal(sampleResults("men_open"), 174215);
  assert.equal(sampleResults("women_open"), 98478);
  assert.deepEqual(
    ["skierg", "sled_push", "sled_pull", "burpee_broad_jump", "row", "farmer_carry", "sandbag_lunge", "wall_balls"].map((key) =>
      referenceMedianSeconds("men_open", key as "skierg"),
    ),
    [275, 187, 299, 336, 293, 131, 320, 431],
  );
  assert.deepEqual(
    ["skierg", "sled_push", "sled_pull", "burpee_broad_jump", "row", "farmer_carry", "sandbag_lunge", "wall_balls"].map((key) =>
      referenceMedianSeconds("women_open", key as "skierg"),
    ),
    [318, 176, 348, 405, 332, 139, 313, 411],
  );

  const custom = validateSessionBody({
    sessionDate: "2026-08-01",
    division: "men_open",
    sessionType: "custom",
    actualElapsed: null,
    transitions: "0:00",
    penalties: "0:00",
    rpe: null,
    notes: "",
    segments: officialSegments(() => ({ status: "timed", time: "4:00" })),
  });
  assert.equal(custom.ok, true);
  if (!custom.ok) return;
  const rows = stationBenchmarks(
    [
      {
        id: "c",
        division: "men_open",
        sessionType: "custom",
        sessionDate: "2026-08-01",
        raceEligible: false,
        segments: custom.value.segments,
      },
    ],
    "men_open",
    "2026-08-02",
  );
  assert.equal(rows.every((row) => row.samples === 0), true);
});

test("new profiles start with an empty week, and a focus is held instead of changing daily", () => {
  const data = addProfile(emptyDevice(), "Ada", "women_open");
  assert.deepEqual(data.profiles[0].training, emptyTraining());
  assert.notDeepEqual(data.profiles[0].training.days, SAMPLE_WEEK);
  assert.equal(data.profiles[0].training.bodyMassKg, null);

  const rows = stationBenchmarks(
    [1, 2, 3].map((index) => {
      const session = race("men_open", `2026-08-0${index}`, index === 1 ? "6:00" : "5:00");
      return {
        id: String(index),
        division: "men_open" as const,
        sessionType: session.sessionType,
        sessionDate: session.sessionDate,
        raceEligible: true,
        segments: session.segments,
      };
    }),
    "men_open",
    "2026-08-04",
  );
  const ski = rows.find((row) => row.key === "skierg");
  assert.ok(ski);
  assert.equal(ski.samples, 3);
  assert.ok((ski.deficitSeconds ?? 0) > 0);

  const first = chooseFocus(rows, null, "2026-08-04");
  assert.equal(first.choice.stationKey, "skierg");
  const held = chooseFocus(
    rows.map((row) => (row.key === "skierg" ? { ...row, deficitSeconds: 0 } : row)),
    first.store,
    "2026-08-10",
  );
  assert.equal(held.choice.usingHold, true);
  assert.equal(held.choice.stationKey, "skierg");
  assert.equal(held.store, null);

  const recovery = dailyPlan({
    division: "men_open",
    training: { ...emptyTraining(), days: { ...emptyTraining().days, fri: "recovery" } },
    focus: first.choice,
    today: "2026-08-07",
    sessions: [],
  });
  assert.equal(recovery.stationKey, null);
  assert.equal(recovery.hardAdded, false);
  assert.match(recovery.lines.join(" "), /No station workout/);
});

test("backup keeps each session category and does not invent a body mass", () => {
  let data = addProfile(emptyDevice(), "Ada", "women_open");
  const id = data.profiles[0].id;
  const session = race("women_open", "2026-08-01");
  data = saveSession(data, id, session).data;
  const exported = exportProfile(data.profiles[0]);
  assert.equal(exported.division, "women_open");
  assert.equal(exported.sessions[0].division, "women_open");
  assert.equal(exported.training.bodyMassKg, null);
  const imported = importBackup(emptyDevice(), exported, { newProfile: true });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  assert.equal(imported.data.profiles[0].division, "women_open");
  assert.equal(imported.data.profiles[0].sessions[0].input.division, "women_open");
  assert.equal(imported.data.profiles[0].training.bodyMassKg, null);

  const legacy = {
    format: "lane-ledger-backup",
    version: 1,
    profileName: "Old",
    sessions: exported.sessions.map(({ division: _division, ...session }) => session),
  };
  const legacyImport = importBackup(emptyDevice(), legacy, { newProfile: true });
  assert.equal(legacyImport.ok, true);
  if (!legacyImport.ok) return;
  assert.equal(legacyImport.imported, 1);
  assert.equal(legacyImport.data.profiles[0].division, "men_open");
  assert.equal(legacyImport.data.profiles[0].sessions[0].input.division, "men_open");
  assert.deepEqual(legacyImport.data.profiles[0].training.days, emptyTraining().days);
});

test("protein range is labelled from body mass and absent without it", () => {
  assert.equal(proteinRangeGrams(null), null);
  assert.deepEqual(proteinRangeGrams(70), { low: 98, high: 140 });
  assert.equal(sanitizeTraining({ bodyMassKg: 84, goal: "gradual_change", days: SAMPLE_WEEK }).bodyMassKg, 84);
  assert.equal(sanitizeTraining(undefined).bodyMassKg, null);
});
