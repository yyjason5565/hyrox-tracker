import { SEGMENT_BY_KEY, type OfficialWorkload, type SegmentKey } from "./segments";

/** Visible product name. Persistence keys and backup format stay lane-ledger. */
export const APP_NAME = "RaceForge";

export const APP_TAGLINE = "Train 99 or go home 💪";

/** Parent-approved product definition. RaceForge is the name; this is the scope. */
export const APP_DEFINITION = "HYROX training tracker for Men\u2019s and Women\u2019s Singles Open";

export const DIVISION_IDS = ["men_open", "women_open"] as const;
export type DivisionId = (typeof DIVISION_IDS)[number];

export const DIVISION_LABEL: Record<DivisionId, string> = {
  men_open: "Men\u2019s Singles Open",
  women_open: "Women\u2019s Singles Open",
};

export const SPEC_SEASON = "2026/27";
export const SPEC_SOURCE_URL = "https://maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf";
export const SPEC_SOURCE_NOTE =
  "Official singles workloads for season 2026/27 (rulebook workload table and wall-ball targets). This tracker includes only Men\u2019s Singles Open and Women\u2019s Singles Open. Pro, doubles, relay, mixed, and age-group categories are not implemented.";

interface DivisionLoads {
  sledPushGrams: number;
  sledPullGrams: number;
  carryGrams: number;
  lungeGrams: number;
  wallGrams: number;
  wallHeightCm: number;
}

const LOADS: Record<DivisionId, DivisionLoads> = {
  men_open: {
    sledPushGrams: 152_000,
    sledPullGrams: 103_000,
    carryGrams: 24_000,
    lungeGrams: 20_000,
    wallGrams: 6_000,
    wallHeightCm: 300,
  },
  women_open: {
    sledPushGrams: 102_000,
    sledPullGrams: 78_000,
    carryGrams: 16_000,
    lungeGrams: 10_000,
    wallGrams: 4_000,
    wallHeightCm: 270,
  },
};

export function isDivisionId(value: unknown): value is DivisionId {
  return value === "men_open" || value === "women_open";
}

export function officialWorkload(division: DivisionId, key: SegmentKey): OfficialWorkload {
  const loads = LOADS[division];
  switch (key) {
    case "run_1":
    case "run_2":
    case "run_3":
    case "run_4":
    case "run_5":
    case "run_6":
    case "run_7":
    case "run_8":
      return { meters: 1000 };
    case "skierg":
    case "row":
      return { meters: 1000 };
    case "burpee_broad_jump":
      return { meters: 80 };
    case "sled_push":
      return { meters: 50, loadGrams: loads.sledPushGrams };
    case "sled_pull":
      return { meters: 50, loadGrams: loads.sledPullGrams };
    case "farmer_carry":
      return { meters: 200, implementAGrams: loads.carryGrams, implementBGrams: loads.carryGrams };
    case "sandbag_lunge":
      return { meters: 100, loadGrams: loads.lungeGrams };
    case "wall_balls":
      return { reps: 100, loadGrams: loads.wallGrams, heightCm: loads.wallHeightCm };
    default: {
      const unreachable: never = key;
      return unreachable;
    }
  }
}

function kg(grams: number): string {
  const value = grams / 1000;
  return Number.isInteger(value) ? String(value) : String(value);
}

export function standardDetail(division: DivisionId, key: SegmentKey): string {
  const loads = LOADS[division];
  switch (key) {
    case "run_1":
    case "run_2":
    case "run_3":
    case "run_4":
    case "run_5":
    case "run_6":
    case "run_7":
    case "run_8":
      return "1 km";
    case "skierg":
    case "row":
      return "1000 m";
    case "burpee_broad_jump":
      return "80 m";
    case "sled_push":
      return `50 m \u00b7 ${kg(loads.sledPushGrams)} kg including sled`;
    case "sled_pull":
      return `50 m \u00b7 ${kg(loads.sledPullGrams)} kg including sled`;
    case "farmer_carry":
      return `200 m \u00b7 two implements \u00b7 ${kg(loads.carryGrams)} kg each`;
    case "sandbag_lunge":
      return `100 m \u00b7 ${kg(loads.lungeGrams)} kg`;
    case "wall_balls":
      return `100 reps \u00b7 ${kg(loads.wallGrams)} kg \u00b7 ${loads.wallHeightCm / 100} m target`;
    default: {
      const unreachable: never = key;
      return unreachable;
    }
  }
}

export function segmentName(key: SegmentKey): string {
  return SEGMENT_BY_KEY[key].name;
}

/** Stations whose 2026/27 Open Singles load or target differs by category. */
export const LOAD_STATION_KEYS = [
  "sled_push",
  "sled_pull",
  "farmer_carry",
  "sandbag_lunge",
  "wall_balls",
] as const satisfies readonly SegmentKey[];
