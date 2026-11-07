"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FocusHold, TrainingSettings } from "@/lib/advice";
import type { DivisionId } from "@/lib/divisions";
import {
  addProfile,
  clearProfileLock,
  deleteSession,
  emptyDevice,
  importBackup,
  loadDevice,
  persistDevice,
  profileById,
  removeProfile,
  renameProfile,
  saveSession,
  setProfileDivision,
  setProfileFocus,
  setProfileLock,
  setProfileTraining,
  type DeviceData,
  type Profile,
} from "@/lib/device-store";
import { localLockMatches } from "@/lib/local-lock";
import { validateSessionBody, type SessionInput } from "@/lib/validate";

interface DeviceApi {
  ready: boolean;
  unreadable: boolean;
  data: DeviceData;
  active: Profile | null;
  unlocked: boolean;
  resetEmpty: () => void;
  createProfile: (name: string, division: DivisionId) => void;
  selectProfile: (profileId: string) => void;
  rename: (name: string) => void;
  setDivision: (division: DivisionId) => void;
  setTraining: (training: TrainingSettings) => void;
  setFocus: (focus: FocusHold) => void;
  eraseActive: () => void;
  unlock: (password: string) => Promise<boolean>;
  lockScreen: () => void;
  setLock: (password: string) => Promise<void>;
  removeLock: () => void;
  save: (input: SessionInput, sessionId?: string) => string;
  removeSession: (sessionId: string) => void;
  importFile: (body: unknown, asNewProfile: boolean) => { ok: true; imported: number } | { ok: false; error: string };
}

const DeviceContext = createContext<DeviceApi | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DeviceData>(emptyDevice());
  const [ready, setReady] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [openLocks, setOpenLocks] = useState<Record<string, true>>({});

  useEffect(() => {
    const loaded = loadDevice();
    if (!loaded.ok) setUnreadable(true);
    else setData(loaded.data);
    setReady(true);
  }, []);

  function commit(next: DeviceData) {
    persistDevice(next);
    setData(next);
  }

  const active = profileById(data, data.activeProfileId);
  const unlocked = Boolean(active && (active.lock === null || openLocks[active.id]));

  const api = useMemo<DeviceApi>(() => ({
    ready,
    unreadable,
    data,
    active,
    unlocked,
    resetEmpty: () => {
      setUnreadable(false);
      setOpenLocks({});
      commit(emptyDevice());
    },
    createProfile: (name: string, division: DivisionId) => {
      const next = addProfile(data, name, division);
      const created = next.profiles[next.profiles.length - 1];
      setOpenLocks((current) => ({ ...current, [created.id]: true }));
      commit(next);
    },
    selectProfile: (profileId: string) => commit({ ...data, activeProfileId: profileId }),
    rename: (name: string) => {
      if (!active) return;
      commit(renameProfile(data, active.id, name));
    },
    setDivision: (division: DivisionId) => {
      if (!active) return;
      commit(setProfileDivision(data, active.id, division));
    },
    setTraining: (training: TrainingSettings) => {
      if (!active) return;
      commit(setProfileTraining(data, active.id, training));
    },
    setFocus: (focus: FocusHold) => {
      if (!active) return;
      if (
        active.focusHold &&
        active.focusHold.stationKey === focus.stationKey &&
        active.focusHold.startedOn === focus.startedOn &&
        active.focusHold.reviewOn === focus.reviewOn
      ) {
        return;
      }
      commit(setProfileFocus(data, active.id, focus));
    },
    eraseActive: () => {
      if (!active) return;
      setOpenLocks((current) => {
        const copy = { ...current };
        delete copy[active.id];
        return copy;
      });
      commit(removeProfile(data, active.id));
    },
    unlock: async (password: string) => {
      if (!active?.lock) return true;
      const matches = await localLockMatches(active.lock, password);
      if (!matches) return false;
      setOpenLocks((current) => ({ ...current, [active.id]: true }));
      return true;
    },
    lockScreen: () => {
      if (!active) return;
      setOpenLocks((current) => {
        const copy = { ...current };
        delete copy[active.id];
        return copy;
      });
    },
    setLock: async (password: string) => {
      if (!active) return;
      const next = await setProfileLock(data, active.id, password);
      setOpenLocks((current) => ({ ...current, [active.id]: true }));
      commit(next);
    },
    removeLock: () => {
      if (!active) return;
      commit(clearProfileLock(data, active.id));
    },
    save: (input: SessionInput, sessionId?: string) => {
      if (!active) throw new Error("Choose a profile first.");
      const saved = saveSession(data, active.id, input, sessionId);
      commit(saved.data);
      return saved.id;
    },
    removeSession: (sessionId: string) => {
      if (!active) return;
      commit(deleteSession(data, active.id, sessionId));
    },
    importFile: (body: unknown, asNewProfile: boolean) => {
      const result = importBackup(
        data,
        body,
        asNewProfile || !active ? { newProfile: true } : { profileId: active.id },
      );
      if (!result.ok) return result;
      if (asNewProfile || !active) setOpenLocks((current) => ({ ...current, [result.profileId]: true }));
      commit(result.data);
      return { ok: true, imported: result.imported };
    },
  }), [active, data, ready, unlocked, unreadable]);

  return <DeviceContext.Provider value={api}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceApi {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("Device storage is unavailable.");
  return value;
}

export function useSessionSaver() {
  const device = useDevice();
  return (body: unknown, sessionId?: string) => {
    const parsed = validateSessionBody(body);
    if (!parsed.ok) return parsed;
    return { ok: true as const, id: device.save(parsed.value, sessionId) };
  };
}
