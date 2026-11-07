import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { FOLDED_SECTIONS } from "../src/components/fold.tsx";
import { DEVICE_NOTICE } from "../src/components/data-warning.tsx";
import { DEVICE_STORAGE_KEY } from "../src/lib/device-store.ts";
import { BACKUP_FORMAT } from "../src/lib/segments.ts";
import { TAB_ITEMS, showTabBar } from "../src/lib/navigation.ts";

test("tabs are Today, Log, Progress, and Profile, and forms hide the tab bar", () => {
  assert.deepEqual(TAB_ITEMS.map((tab) => tab.label), ["Today", "Log", "Progress", "Profile"]);
  assert.equal(showTabBar("/log"), true);
  assert.equal(showTabBar("/log/history/"), true);
  assert.equal(showTabBar("/log/new"), false);
  assert.equal(showTabBar("/log/edit/"), false);
});

test("extra sections stay named and closed until opened", () => {
  assert.deepEqual([...FOLDED_SECTIONS], ["Training tips", "Benchmarks", "Food & recovery"]);
  const source = readFileSync(new URL("../src/components/fold.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("<details"), true);
  assert.equal(source.includes("<details open"), false);
  assert.equal(source.includes("open="), false);
});

test("onboarding asks for a name and a race category", () => {
  const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const today = readFileSync(new URL("../src/app/log/page.tsx", import.meta.url), "utf8");
  assert.equal(page.includes("Input your name and select a race category"), true);
  assert.equal(page.includes("Name and category."), false);
  assert.equal(page.includes("text-[22px]"), true);
  assert.equal(today.includes("text-[22px]"), true);
  assert.equal(page.includes("text-[34px]"), true);
});

test("storage stays local and the old keys remain", () => {
  assert.equal(DEVICE_STORAGE_KEY, "lane-ledger.device.v1");
  assert.equal(BACKUP_FORMAT, "lane-ledger-backup");
  assert.match(DEVICE_NOTICE, /this device/i);
  assert.equal(/sign in|google|sync/i.test(DEVICE_NOTICE), false);
});
