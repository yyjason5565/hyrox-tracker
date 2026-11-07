export const SEGMENT_KEYS = [
  "run_1",
  "skierg",
  "run_2",
  "sled_push",
  "run_3",
  "sled_pull",
  "run_4",
  "burpee_broad_jump",
  "run_5",
  "row",
  "run_6",
  "farmer_carry",
  "run_7",
  "sandbag_lunge",
  "run_8",
  "wall_balls",
] as const;

export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export type SegmentKind = "run" | "distance" | "loaded" | "carry" | "wall";

export type SegmentStatus = "timed" | "unrecorded" | "skipped";

export interface OfficialWorkload {
  meters?: number;
  reps?: number;
  loadGrams?: number;
  implementAGrams?: number;
  implementBGrams?: number;
  heightCm?: number;
}

export interface SegmentDef {
  key: SegmentKey;
  kind: SegmentKind;
  name: string;
  /** Distance or reps shared by both Singles Open categories. Loads live with the category. */
  detail: string;
  order: number;
}

export const SEGMENTS: SegmentDef[] = [
  { key: "run_1", kind: "run", name: "Run 1", detail: "1 km", order: 1 },
  { key: "skierg", kind: "distance", name: "SkiErg", detail: "1000 m", order: 2 },
  { key: "run_2", kind: "run", name: "Run 2", detail: "1 km", order: 3 },
  { key: "sled_push", kind: "loaded", name: "Sled push", detail: "50 m", order: 4 },
  { key: "run_3", kind: "run", name: "Run 3", detail: "1 km", order: 5 },
  { key: "sled_pull", kind: "loaded", name: "Sled pull", detail: "50 m", order: 6 },
  { key: "run_4", kind: "run", name: "Run 4", detail: "1 km", order: 7 },
  { key: "burpee_broad_jump", kind: "distance", name: "Burpee broad jump", detail: "80 m", order: 8 },
  { key: "run_5", kind: "run", name: "Run 5", detail: "1 km", order: 9 },
  { key: "row", kind: "distance", name: "Row", detail: "1000 m", order: 10 },
  { key: "run_6", kind: "run", name: "Run 6", detail: "1 km", order: 11 },
  { key: "farmer_carry", kind: "carry", name: "Farmer carry", detail: "200 m · two implements", order: 12 },
  { key: "run_7", kind: "run", name: "Run 7", detail: "1 km", order: 13 },
  { key: "sandbag_lunge", kind: "loaded", name: "Sandbag lunge", detail: "100 m", order: 14 },
  { key: "run_8", kind: "run", name: "Run 8", detail: "1 km", order: 15 },
  { key: "wall_balls", kind: "wall", name: "Wall balls", detail: "100 reps", order: 16 },
];

export const SEGMENT_BY_KEY: Record<SegmentKey, SegmentDef> = Object.fromEntries(
  SEGMENTS.map((segment) => [segment.key, segment]),
) as Record<SegmentKey, SegmentDef>;

export function isSegmentKey(value: unknown): value is SegmentKey {
  return typeof value === "string" && value in SEGMENT_BY_KEY;
}

export const QUANTITY_FIELDS = {
  run: ["meters"],
  distance: ["meters"],
  loaded: ["meters", "loadKg"],
  carry: ["meters", "implementsKg"],
  wall: ["reps", "loadKg", "heightM"],
} as const;

export type SessionType = "full" | "partial" | "custom";

export const SESSION_TYPES: SessionType[] = ["full", "partial", "custom"];

export const TIME_ZONE = "Asia/Kuala_Lumpur";

export const BACKUP_FORMAT = "lane-ledger-backup";
export const BACKUP_VERSION = 1;
export const MAX_SESSIONS_PER_USER = 2000;
export const MAX_IMPORT_SESSIONS = 200;
