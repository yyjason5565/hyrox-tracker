import {
  BENCHMARK_LABEL,
  BENCHMARK_STATIONS,
  isBenchmarkStation,
  stationBenchmarks,
  type BenchmarkSession,
  type BenchmarkStation,
  type StationBenchmark,
} from "./benchmarks";
import { DIVISION_LABEL, segmentName, standardDetail, type DivisionId } from "./divisions";
import type { SegmentKey } from "./segments";
import { addDays, isValidDateString } from "./time";
import { isNutritionGoal, type NutritionGoal } from "./nutrition";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const DAY_KINDS = ["unset", "off", "easy", "class", "strength", "recovery"] as const;
export type DayKind = (typeof DAY_KINDS)[number];
export const EXPERIENCE_LEVELS = ["new", "some", "regular"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  unset: "Not chosen",
  off: "Off",
  easy: "Easy run or run-walk",
  class: "HYROX class",
  strength: "Controlled strength",
  recovery: "Recovery",
};

/** A sample week someone may copy. It is never the default. */
export const SAMPLE_WEEK: Record<Weekday, DayKind> = {
  mon: "easy",
  tue: "class",
  wed: "strength",
  thu: "class",
  fri: "recovery",
  sat: "class",
  sun: "easy",
};

export interface TrainingSettings {
  days: Record<Weekday, DayKind>;
  experience: ExperienceLevel | null;
  limitationNote: string;
  bodyMassKg: number | null;
  goal: NutritionGoal | null;
}

export interface FocusHold {
  stationKey: BenchmarkStation | null;
  startedOn: string;
  reviewOn: string;
}

export function emptyTraining(): TrainingSettings {
  return {
    days: { mon: "unset", tue: "unset", wed: "unset", thu: "unset", fri: "unset", sat: "unset", sun: "unset" },
    experience: null,
    limitationNote: "",
    bodyMassKg: null,
    goal: null,
  };
}

export function isDayKind(value: unknown): value is DayKind {
  return typeof value === "string" && (DAY_KINDS as readonly string[]).includes(value);
}

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);
}

export function weekdayFromDate(date: string): Weekday {
  const [year, month, day] = date.split("-").map(Number);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAYS[index === 0 ? 6 : index - 1];
}

const BLOCKS: Record<BenchmarkStation, string[]> = {
  skierg: [
    "4 \u00d7 250 m at about RPE 5\u20136, with 60\u201390 seconds easy rest.",
    "Relaxed rhythm and a steady pace.",
  ],
  sled_push: [
    "4 \u00d7 12.5 m with a manageable sled at about RPE 6, and about 90 seconds rest.",
    "Stable posture and continuous steps. Write down the surface and the load you used.",
    "Official race load is a destination, not the compulsory training load.",
    "Sled comparison is provisional because floor, carpet, and sled friction change the time.",
  ],
  sled_pull: [
    "4 \u00d7 12.5 m with a manageable sled at about RPE 6, and about 90 seconds rest.",
    "Technique first, with controlled rope handling.",
    "Sled comparison is provisional because floor, carpet, and sled friction change the time.",
  ],
  burpee_broad_jump: [
    "4 \u00d7 10 m at about RPE 5\u20136, with 60\u201390 seconds rest.",
    "Repeatable legal reps and modest jumps, not maximum distance.",
  ],
  row: [
    "4 \u00d7 250 m at about RPE 5\u20136, with 60\u201390 seconds easy rest.",
    "Legs, body, then arms, and a controlled return.",
  ],
  farmer_carry: [
    "4 \u00d7 40 m at about RPE 6, with 60\u201390 seconds rest.",
    "Choose a load that keeps posture and grip without failure.",
  ],
  sandbag_lunge: [
    "Start with 3 \u00d7 10 m light or bodyweight at about RPE 5\u20136, and about 90 seconds rest.",
    "Controlled knee contact and a legal shoulder carry.",
    "Only in a later week, if that felt fine, one option is 2 rounds of 10 m lunge plus 200 m easy jog, with 2 minutes rest. Keep the run the priority.",
  ],
  wall_balls: [
    "6 \u00d7 5 valid reps with 30\u201345 seconds rest, at about RPE 5\u20136.",
    "Use an appropriate ball and target. Stop before form fails.",
    "After two clean practices with good recovery, add one set or one rep per set, not both. Do not jump from sets of five to large unbroken sets.",
  ],
};

export interface DayPlan {
  weekday: Weekday;
  kind: DayKind;
  title: string;
  lines: string[];
  stationKey: BenchmarkStation | null;
  stationLines: string[];
  hardAdded: false;
}

export interface FocusChoice {
  stationKey: BenchmarkStation | null;
  reason: string;
  heldUntil: string | null;
  usingHold: boolean;
}

function topGap(rows: StationBenchmark[]): StationBenchmark | null {
  const ranked = rows
    .filter((row) => row.samples > 0 && row.deficitSeconds !== null && row.deficitSeconds > 0)
    .sort((a, b) => {
      const gap = (b.deficitSeconds ?? 0) - (a.deficitSeconds ?? 0);
      if (gap !== 0) return gap;
      const ratio = (b.deficitRatio ?? 0) - (a.deficitRatio ?? 0);
      if (ratio !== 0) return ratio;
      return BENCHMARK_STATIONS.indexOf(a.key) - BENCHMARK_STATIONS.indexOf(b.key);
    });
  return ranked[0] ?? null;
}

export function chooseFocus(
  rows: StationBenchmark[],
  hold: FocusHold | null,
  today: string,
): { choice: FocusChoice; store: FocusHold | null } {
  const held = Boolean(hold && today < hold.reviewOn);
  if (held && hold) {
    return {
      choice: {
        stationKey: hold.stationKey,
        reason: hold.stationKey
          ? `Held through ${hold.reviewOn}. The station stays put for this block instead of changing every day. The gap is the largest recorded time above the sample median, not seconds you are promised to gain.`
          : `Held through ${hold.reviewOn}. No station is singled out yet, so the suggestion does not jump to a new one each day.`,
        heldUntil: hold.reviewOn,
        usingHold: true,
      },
      store: null,
    };
  }
  const gap = topGap(rows);
  const anySamples = rows.some((row) => row.samples > 0);
  const stationKey = gap?.key ?? null;
  const reason = !anySamples
    ? "No comparable full-station split in the last 90 days. Log a complete official session before a station is singled out. Shortened work is not turned into a race split."
    : gap
      ? `${segmentName(gap.key)} has the largest recorded time gap versus the ${BENCHMARK_LABEL.toLowerCase()} (${gap.deficitSeconds} seconds). One result is low confidence. This is not a promised time save.`
      : "Recorded comparable stations are at or inside the sample median. That is not a reason to add harder work.";
  const store: FocusHold = { stationKey, startedOn: today, reviewOn: addDays(today, 21) };
  return {
    choice: { stationKey, reason, heldUntil: store.reviewOn, usingHold: false },
    store,
  };
}

function classFocusWeekday(days: Record<Weekday, DayKind>): Weekday | null {
  return WEEKDAYS.find((day) => days[day] === "class") ?? null;
}

function recentFatigue(sessions: Array<{ sessionDate: string; rpe: number | null; elapsedSec: number | null }>, today: string): boolean {
  const start = addDays(today, -2);
  return sessions.some((session) => {
    if (session.sessionDate < start || session.sessionDate > today) return false;
    if (session.rpe !== null && session.rpe >= 8) return true;
    return session.elapsedSec !== null && session.elapsedSec >= 150 * 60;
  });
}

export function dailyPlan(input: {
  division: DivisionId | null;
  training: TrainingSettings;
  focus: FocusChoice;
  today: string;
  sessions: Array<{ sessionDate: string; rpe: number | null; elapsedSec: number | null }>;
}): DayPlan {
  const weekday = weekdayFromDate(input.today);
  const kind = input.training.days[weekday];
  const base: DayPlan = { weekday, kind, title: DAY_KIND_LABEL[kind], lines: [], stationKey: null, stationLines: [], hardAdded: false };
  if (!input.division) {
    return { ...base, title: "Choose a category", lines: ["Set Men\u2019s Singles Open or Women\u2019s Singles Open on the profile. No workout is assumed before that."] };
  }
  if (input.training.limitationNote.trim()) {
    return {
      ...base,
      title: "Your note comes first",
      lines: [
        "The limitation note on this profile overrides station ranking. No hard extra is suggested.",
        "Chest pain or feeling faint needs urgent care. Ongoing calf pain, cramp that keeps returning, weakness, or a change in how you walk means stop loading that tissue and get a qualified assessment.",
        "Easy walking can be enough today. This is not a diagnosis.",
      ],
    };
  }
  if (recentFatigue(input.sessions, input.today)) {
    return {
      ...base,
      title: "Recovery after a hard session",
      lines: [
        "A very hard or long session is still inside the last three days. Use easy movement, not benchmark chasing.",
        "Do not add a station workout on top of that fatigue. No time gain is guaranteed by training through it.",
      ],
    };
  }
  if (kind === "unset") {
    return {
      ...base,
      lines: ["This day has no choice yet. Pick off, easy, class, strength, or recovery for yourself. A sample week is available on the profile and is not applied until you save it."],
    };
  }
  if (kind === "off" || kind === "recovery") {
    return {
      ...base,
      title: kind === "off" ? "Off" : "Recovery",
      lines: ["No station workout today. A daily suggestion is not a daily hard session. Walk or do gentle movement if you want, and stop if something hurts."],
    };
  }
  if (kind === "easy") {
    return {
      ...base,
      title: "Easy run or run-walk",
      lines: [
        "20\u201330 minutes at about RPE 3\u20134, conversational. Walk breaks are part of the session, not a failure.",
        "Do not turn race-split math into a pace target. Add no station block on top.",
      ],
    };
  }
  if (kind === "strength") {
    const neighborsHard = neighborClass(input.training.days, weekday);
    return {
      ...base,
      title: "Controlled strength",
      lines: [
        neighborsHard
          ? "This strength day sits beside class days. Reduce the volume. Do not also perform the station block."
          : "Controlled strength only. The station block is not added on top.",
        "Stop a set before form fails. Pain that changes your gait is a reason to stop, not a cue to add load.",
      ],
    };
  }
  const focusDay = classFocusWeekday(input.training.days);
  if (weekday !== focusDay) {
    return {
      ...base,
      title: "Technical class",
      lines: [
        "Another day this week is the station-focus class. Keep this one technical or easy.",
        "Do not repeat the hard station block, and do not make every class day hard.",
      ],
    };
  }
  if (!input.focus.stationKey) {
    return {
      ...base,
      title: `${DIVISION_LABEL[input.division]} class`,
      lines: [
        input.focus.reason,
        "If you still practice a station, use the easy block for a station you choose, as technique work. It replaces the hard part of class. It is not extra work, and it is not based on a shortened split.",
        input.training.experience === "new" ? "You marked this profile as new to the work. Stay at the easy end." : "Start lighter than race load where you need to. Race load is a destination.",
        "Warm up for 5\u201310 minutes. After two comfortable practices with no next-day flare, change only one thing.",
      ],
    };
  }
  const key = input.focus.stationKey;
  return {
    ...base,
    title: `${segmentName(key)} replaces one class block`,
    stationKey: key,
    stationLines: BLOCKS[key],
    lines: [
      input.focus.reason,
      `${DIVISION_LABEL[input.division]} standard for this station: ${standardDetail(input.division, key)}.`,
      "Do this instead of the hard class piece, not as well as it. Other class days stay technical or easy.",
      "Warm up for 5\u201310 minutes. Practice efforts here are about RPE 5\u20136 on a 0\u201310 scale. The log\u2019s session RPE field is 1\u201310.",
      input.training.experience === "new" ? "You marked this profile as new to the work. Stay at the easy end of the block." : "Start lighter or shorter if race load is not manageable yet.",
      "After two comfortable exposures with sound technique and no next-day symptom flare, change one thing only: one set, slightly less rest, or a little distance or load. No improvement in seconds is guaranteed. Skip all-out simulations this week.",
    ],
  };
}

function neighborClass(days: Record<Weekday, DayKind>, weekday: Weekday): boolean {
  const index = WEEKDAYS.indexOf(weekday);
  const prev = WEEKDAYS[(index + 6) % 7];
  const next = WEEKDAYS[(index + 1) % 7];
  return days[prev] === "class" && days[next] === "class";
}

export function sanitizeTraining(value: unknown): TrainingSettings {
  const empty = emptyTraining();
  if (typeof value !== "object" || value === null) return empty;
  const record = value as Record<string, unknown>;
  const days = { ...empty.days };
  if (typeof record.days === "object" && record.days !== null) {
    const source = record.days as Record<string, unknown>;
    for (const day of WEEKDAYS) {
      if (isDayKind(source[day])) days[day] = source[day];
    }
  }
  const experience = (EXPERIENCE_LEVELS as readonly string[]).includes(String(record.experience))
    ? (record.experience as ExperienceLevel)
    : null;
  const limitationNote = typeof record.limitationNote === "string" ? record.limitationNote.slice(0, 500) : "";
  let bodyMassKg: number | null = null;
  if (typeof record.bodyMassKg === "number" && Number.isFinite(record.bodyMassKg) && record.bodyMassKg >= 30 && record.bodyMassKg <= 250) {
    bodyMassKg = Math.round(record.bodyMassKg * 10) / 10;
  }
  return {
    days,
    experience,
    limitationNote,
    bodyMassKg,
    goal: isNutritionGoal(record.goal) ? record.goal : null,
  };
}

export function sanitizeFocus(value: unknown): FocusHold | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.stationKey !== null && !isBenchmarkStation(record.stationKey as SegmentKey)) return null;
  const stationKey = record.stationKey === null ? null : (record.stationKey as BenchmarkStation);
  if (typeof record.startedOn !== "string" || typeof record.reviewOn !== "string") return null;
  if (!isValidDateString(record.startedOn) || !isValidDateString(record.reviewOn)) return null;
  if (record.reviewOn <= record.startedOn) return null;
  return { stationKey, startedOn: record.startedOn, reviewOn: record.reviewOn };
}

export function stationBlock(key: SegmentKey): string[] | null {
  if (!(key in BLOCKS)) return null;
  return BLOCKS[key as BenchmarkStation];
}

export function guidanceFor(input: {
  division: DivisionId | null;
  training: TrainingSettings;
  hold: FocusHold | null;
  today: string;
  sessions: BenchmarkSession[];
  recent: Array<{ sessionDate: string; rpe: number | null; elapsedSec: number | null }>;
}): { rows: StationBenchmark[]; focus: FocusChoice; store: FocusHold | null; day: DayPlan } {
  const rows = input.division ? stationBenchmarks(input.sessions, input.division, input.today) : [];
  const { choice, store } = input.division
    ? chooseFocus(rows, input.hold, input.today)
    : {
        choice: {
          stationKey: null,
          reason: "Choose Men\u2019s Singles Open or Women\u2019s Singles Open before comparing stations.",
          heldUntil: null,
          usingHold: false,
        },
        store: null,
      };
  return {
    rows,
    focus: choice,
    store,
    day: dailyPlan({ division: input.division, training: input.training, focus: choice, today: input.today, sessions: input.recent }),
  };
}
