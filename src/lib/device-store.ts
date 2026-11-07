import { emptyTraining, sanitizeFocus, sanitizeTraining, type FocusHold, type TrainingSettings } from "./advice";
import { isDivisionId, type DivisionId } from "./divisions";
import { createLocalLock, type LocalLock } from "./local-lock";
import type { SessionType } from "./segments";
import type { SessionInput } from "./validate";
import { validateSessionBody } from "./validate";

export const DEVICE_STORAGE_KEY = "lane-ledger.device.v1";

export interface SavedSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: SessionInput;
}

export interface Profile {
  id: string;
  name: string;
  division: DivisionId | null;
  training: TrainingSettings;
  focusHold: FocusHold | null;
  lock: LocalLock | null;
  sessions: SavedSession[];
}

export interface DeviceData {
  version: 1;
  activeProfileId: string | null;
  profiles: Profile[];
}

const PASSWORD_KEYS = new Set(["password", "passphrase", "currentPassword", "newPassword"]);

export function emptyDevice(): DeviceData {
  return { version: 1, activeProfileId: null, profiles: [] };
}

export function addProfile(data: DeviceData, name: string, division: DivisionId): DeviceData {
  const trimmed = name.trim();
  const profile: Profile = {
    id: crypto.randomUUID(),
    name: trimmed,
    division,
    training: emptyTraining(),
    focusHold: null,
    lock: null,
    sessions: [],
  };
  return { ...data, activeProfileId: profile.id, profiles: [...data.profiles, profile] };
}

export function setProfileDivision(data: DeviceData, profileId: string, division: DivisionId): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) => (profile.id === profileId ? { ...profile, division } : profile)),
  };
}

export function setProfileTraining(data: DeviceData, profileId: string, training: TrainingSettings): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === profileId ? { ...profile, training: sanitizeTraining(training) } : profile,
    ),
  };
}

export function setProfileFocus(data: DeviceData, profileId: string, focusHold: FocusHold | null): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) => (profile.id === profileId ? { ...profile, focusHold } : profile)),
  };
}

export function renameProfile(data: DeviceData, profileId: string, name: string): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === profileId ? { ...profile, name: name.trim() } : profile,
    ),
  };
}

export function removeProfile(data: DeviceData, profileId: string): DeviceData {
  const profiles = data.profiles.filter((profile) => profile.id !== profileId);
  return {
    ...data,
    profiles,
    activeProfileId: data.activeProfileId === profileId ? (profiles[0]?.id ?? null) : data.activeProfileId,
  };
}

export async function setProfileLock(data: DeviceData, profileId: string, password: string): Promise<DeviceData> {
  const lock = await createLocalLock(password);
  return {
    ...data,
    profiles: data.profiles.map((profile) => (profile.id === profileId ? { ...profile, lock } : profile)),
  };
}

export function clearProfileLock(data: DeviceData, profileId: string): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) => (profile.id === profileId ? { ...profile, lock: null } : profile)),
  };
}

export function profileById(data: DeviceData, profileId: string | null): Profile | null {
  if (!profileId) return null;
  return data.profiles.find((profile) => profile.id === profileId) ?? null;
}

export function saveSession(data: DeviceData, profileId: string, input: SessionInput, sessionId?: string): { data: DeviceData; id: string } {
  const now = new Date().toISOString();
  const id = sessionId ?? crypto.randomUUID();
  const profiles = data.profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const existing = profile.sessions.find((session) => session.id === id);
    const saved: SavedSession = {
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      input,
    };
    const sessions = existing
      ? profile.sessions.map((session) => (session.id === id ? saved : session))
      : [saved, ...profile.sessions];
    return { ...profile, sessions };
  });
  return { data: { ...data, profiles }, id };
}

export function deleteSession(data: DeviceData, profileId: string, sessionId: string): DeviceData {
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === profileId
        ? { ...profile, sessions: profile.sessions.filter((session) => session.id !== sessionId) }
        : profile,
    ),
  };
}

export function sessionsFor(data: DeviceData, profileId: string): SavedSession[] {
  return profileById(data, profileId)?.sessions ?? [];
}

function containsPasswordKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsPasswordKey);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(([key, entry]) => PASSWORD_KEYS.has(key) || containsPasswordKey(entry));
}

export function exportProfile(profile: Profile) {
  return {
    format: "lane-ledger-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    profileName: profile.name,
    division: profile.division,
    training: profile.training,
    focusHold: profile.focusHold,
    sessions: profile.sessions.map((session) => ({
      division: session.input.division,
      sessionDate: session.input.sessionDate,
      sessionType: session.input.sessionType,
      actualElapsed: clock(session.input.actualElapsedSec),
      transitions: clock(session.input.transitionsSec),
      penalties: clock(session.input.penaltiesSec),
      rpe: session.input.rpe,
      notes: session.input.notes,
      segments: session.input.segments.map((segment) => wireSegment(segment)),
    })),
  };
}

function clock(seconds: number | null): string | null {
  if (seconds === null) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function wireSegment(segment: SessionInput["segments"][number]) {
  const target: Record<string, unknown> = {};
  const performed: Record<string, unknown> = {};
  const assign = (bag: Record<string, unknown>, key: string, value: number | null, convert?: (value: number) => number) => {
    if (value !== null) bag[key] = convert ? convert(value) : value;
  };
  assign(target, "meters", segment.targetMeters);
  assign(performed, "meters", segment.performedMeters);
  assign(target, "reps", segment.targetReps);
  assign(performed, "reps", segment.performedReps);
  assign(target, "loadKg", segment.targetLoadGrams, (value) => value / 1000);
  assign(performed, "loadKg", segment.performedLoadGrams, (value) => value / 1000);
  assign(target, "heightM", segment.targetHeightCm, (value) => value / 100);
  assign(performed, "heightM", segment.performedHeightCm, (value) => value / 100);
  if (segment.targetImplementAGrams !== null || segment.targetImplementBGrams !== null) {
    target.implementsKg = [segment.targetImplementAGrams === null ? null : segment.targetImplementAGrams / 1000, segment.targetImplementBGrams === null ? null : segment.targetImplementBGrams / 1000];
  }
  if (segment.performedImplementAGrams !== null || segment.performedImplementBGrams !== null) {
    performed.implementsKg = [segment.performedImplementAGrams === null ? null : segment.performedImplementAGrams / 1000, segment.performedImplementBGrams === null ? null : segment.performedImplementBGrams / 1000];
  }
  return {
    key: segment.key,
    status: segment.status,
    time: clock(segment.seconds),
    target,
    performed: Object.keys(performed).length > 0 ? performed : null,
  };
}

export function importBackup(
  data: DeviceData,
  body: unknown,
  target: { profileId: string } | { newProfile: true },
  now = new Date(),
): { ok: true; data: DeviceData; imported: number; profileId: string } | { ok: false; error: string } {
  if (containsPasswordKey(body)) {
    return { ok: false, error: "This file contains a password field. Backups must not include passphrases." };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Backup must be a JSON object." };
  }
  const record = body as Record<string, unknown>;
  if (record.format !== "lane-ledger-backup" || (record.version !== 1 && record.version !== 2)) {
    return { ok: false, error: "Unrecognized backup file." };
  }
  const legacy = record.version === 1;
  const fileDivision = isDivisionId(record.division) ? record.division : legacy ? "men_open" : null;
  if ("userId" in record || "username" in record) {
    return { ok: false, error: "Backups cannot assign an online account. This app has no accounts." };
  }
  if (!Array.isArray(record.sessions)) return { ok: false, error: "Sessions must be a list." };
  if (record.sessions.length > 200) return { ok: false, error: "Import at most 200 sessions at a time." };
  const inputs: SessionInput[] = [];
  for (const [index, session] of record.sessions.entries()) {
    const parsed = validateSessionBody(withDivision(session, legacy ? "men_open" : fileDivision), now);
    if (!parsed.ok) return { ok: false, error: `Session ${index + 1} is not valid.` };
    inputs.push(parsed.value);
  }
  const stamp = new Date().toISOString();
  const saved: SavedSession[] = inputs.map((input) => ({
    id: crypto.randomUUID(),
    createdAt: stamp,
    updatedAt: stamp,
    input,
  }));
  if ("newProfile" in target) {
    const name = typeof record.profileName === "string" && record.profileName.trim() ? record.profileName.trim().slice(0, 80) : "Imported person";
    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      division: fileDivision,
      training: legacy ? emptyTraining() : sanitizeTraining(record.training),
      focusHold: legacy ? null : sanitizeFocus(record.focusHold),
      lock: null,
      sessions: saved,
    };
    return {
      ok: true,
      imported: saved.length,
      profileId: profile.id,
      data: { ...data, activeProfileId: profile.id, profiles: [...data.profiles, profile] },
    };
  }
  if (!profileById(data, target.profileId)) return { ok: false, error: "Choose a profile on this device first." };
  return {
    ok: true,
    imported: saved.length,
    profileId: target.profileId,
    data: {
      ...data,
      profiles: data.profiles.map((profile) =>
        profile.id === target.profileId ? { ...profile, sessions: [...saved, ...profile.sessions] } : profile,
      ),
    },
  };
}

function withDivision(session: unknown, fallback: DivisionId | null): unknown {
  if (typeof session !== "object" || session === null || Array.isArray(session)) return session;
  const record = session as Record<string, unknown>;
  if (isDivisionId(record.division)) return record;
  if (!fallback) return record;
  return { ...record, division: fallback };
}

function normalizeProfile(profile: Profile): Profile {
  const division = isDivisionId(profile.division) ? profile.division : null;
  return {
    ...profile,
    division,
    training: sanitizeTraining(profile.training),
    focusHold: sanitizeFocus(profile.focusHold),
    sessions: (profile.sessions ?? []).map((session) => ({
      ...session,
      input: {
        ...session.input,
        division: isDivisionId(session.input?.division) ? session.input.division : "men_open",
      },
    })),
  };
}

export function loadDevice(): { ok: true; data: DeviceData } | { ok: false } {
  if (typeof localStorage === "undefined") return { ok: true, data: emptyDevice() };
  const raw = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!raw) return { ok: true, data: emptyDevice() };
  try {
    const parsed = JSON.parse(raw) as DeviceData;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) return { ok: false };
    return {
      ok: true,
      data: {
        version: 1,
        activeProfileId: typeof parsed.activeProfileId === "string" ? parsed.activeProfileId : null,
        profiles: parsed.profiles.map((profile) => normalizeProfile(profile)),
      },
    };
  } catch {
    return { ok: false };
  }
}

export function persistDevice(data: DeviceData): void {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(data));
}

export function assertNoPasswordInJson(value: unknown, secret: string): boolean {
  return !JSON.stringify(value).includes(secret);
}

export type { SessionType };
