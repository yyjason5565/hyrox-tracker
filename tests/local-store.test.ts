import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addProfile,
  emptyDevice,
  exportProfile,
  importBackup,
  saveSession,
  sessionsFor,
} from "../src/lib/device-store.ts";
import { createLocalLock, localLockMatches } from "../src/lib/local-lock.ts";
import { configurationFor } from "../src/lib/quantities.ts";
import { officialSegments, validateSessionBody } from "../src/lib/validate.ts";

const passphrase = "local-screen-lock";

function fullBody(actual = "80:00", distance?: number) {
  return {
    sessionDate: "2026-04-02",
    division: "men_open" as const,
    sessionType: "full" as const,
    actualElapsed: actual,
    transitions: "0:00",
    penalties: "0:00",
    rpe: 6,
    notes: "device only",
    segments: officialSegments((key) => ({
      status: "timed" as const,
      time: "4:00",
      performed: distance && key === "run_1" ? { meters: distance } : null,
    })),
  };
}

test("profiles on one device do not share sessions", () => {
  let data = addProfile(emptyDevice(), "Ada", "men_open");
  const ada = data.profiles[0].id;
  data = addProfile(data, "Bea", "women_open");
  const bea = data.profiles[1].id;
  const parsed = validateSessionBody(fullBody());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  data = saveSession(data, ada, parsed.value).data;
  assert.equal(sessionsFor(data, ada).length, 1);
  assert.equal(sessionsFor(data, bea).length, 0);
});

test("local lock stores a salted digest and not the passphrase", async () => {
  const first = await createLocalLock(passphrase);
  const second = await createLocalLock(passphrase);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.digest, passphrase);
  assert.equal(JSON.stringify(first).includes(passphrase), false);
  assert.equal(await localLockMatches(first, passphrase), true);
  assert.equal(await localLockMatches(first, "other-phrase"), false);
});

test("backup has no passphrase and import stays on the chosen profile", () => {
  let data = addProfile(emptyDevice(), "Ada", "men_open");
  const ada = data.activeProfileId as string;
  const official = validateSessionBody(fullBody());
  const custom = validateSessionBody(fullBody("50:00", 400));
  assert.equal(official.ok && custom.ok, true);
  if (!official.ok || !custom.ok) return;
  data = saveSession(data, ada, official.value).data;
  data = saveSession(data, ada, custom.value).data;
  const exported = exportProfile(data.profiles[0]);
  assert.equal(JSON.stringify(exported).includes(passphrase), false);
  assert.equal("password" in exported, false);
  const rejected = importBackup(data, { ...exported, password: passphrase }, { profileId: ada });
  assert.equal(rejected.ok, false);

  let other = addProfile(emptyDevice(), "Bea", "women_open");
  const bea = other.profiles[0].id;
  const imported = importBackup(other, exported, { profileId: bea });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  assert.equal(sessionsFor(imported.data, bea).length, 2);
  assert.equal(sessionsFor(imported.data, ada).length, 0);
  const saved = sessionsFor(imported.data, bea).map((session) => session.input);
  const eligible = saved.filter((session) => configurationFor(session).raceEligible);
  assert.equal(eligible.length, 1);
  assert.equal(configurationFor(saved.find((session) => session.actualElapsedSec === 50 * 60)!).modified, true);
});
