"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { DeviceNotice } from "@/components/data-warning";
import { Fold } from "@/components/fold";
import { NutritionSection } from "@/components/log-insights";
import { useDevice } from "@/components/device-context";
import {
  DAY_KIND_LABEL,
  DAY_KINDS,
  EXPERIENCE_LEVELS,
  SAMPLE_WEEK,
  WEEKDAY_LABEL,
  WEEKDAYS,
  emptyTraining,
  type DayKind,
  type ExperienceLevel,
  type TrainingSettings,
} from "@/lib/advice";
import { DIVISION_IDS, DIVISION_LABEL, type DivisionId } from "@/lib/divisions";
import { NUTRITION_GOALS, type NutritionGoal } from "@/lib/nutrition";

const GOAL_LABEL: Record<NutritionGoal, string> = {
  performance: "Training",
  maintain: "Maintain",
  gradual_change: "Slow body-mass change, with a dietitian",
};

export default function AccountPage() {
  const device = useDevice();
  const router = useRouter();
  const profile = device.active;
  const [name, setName] = useState(profile?.name ?? "");
  const [division, setDivision] = useState<DivisionId | "">(profile?.division ?? "");
  const [training, setTraining] = useState<TrainingSettings>(profile?.training ?? emptyTraining());
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mass, setMass] = useState(profile?.training.bodyMassKg == null ? "" : String(profile.training.bodyMassKg));

  function saveTraining(next: TrainingSettings) {
    const kilograms = mass.trim() === "" ? null : Number(mass);
    if (kilograms !== null && (!Number.isFinite(kilograms) || kilograms < 30 || kilograms > 250)) {
      setMessage("Body mass, if you enter one, must be from 30 to 250 kg. Leave it blank to store none.");
      return;
    }
    const saved = { ...next, bodyMassKg: kilograms === null ? null : Math.round(kilograms * 10) / 10 };
    device.setTraining(saved);
    setTraining(saved);
    setMessage("Week and optional details saved on this browser only.");
  }

  return (
    <div className="grid gap-5 pb-4">
      <h1 className="text-[34px] leading-tight font-bold">Profile</h1>
      <div className="ios-group">
        <Link href="/" className="ios-row justify-between text-[17px]">
          <span>Switch athlete</span>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link href="/log/backup" className="ios-row justify-between text-[17px]">
          <span>Export or import</span>
          <span className="text-muted-foreground">›</span>
        </Link>
      </div>
      <p className="text-[13px] leading-5 text-muted-foreground">Screen lock stays on this device. It is not a sign-in.</p>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          device.rename(name);
          setMessage("Name saved on this browser.");
        }}
      >
        <Label htmlFor="person">Name</Label>
        <Input id="person" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" className="h-11">Save name</Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!division) {
            setMessage("Choose Men’s Singles Open or Women’s Singles Open.");
            return;
          }
          device.setDivision(division);
          setMessage("Category saved for new sessions. Sessions already stored keep their own category.");
        }}
      >
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Category</legend>
          {DIVISION_IDS.map((value) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input type="radio" name="profile-division" value={value} checked={division === value} onChange={() => setDivision(value)} />
              {DIVISION_LABEL[value]}
            </label>
          ))}
        </fieldset>
        <Button type="submit" className="h-11">Save category</Button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          saveTraining(training);
        }}
      >
        <h2 className="text-lg font-semibold">Your week</h2>
        <p className="text-sm text-muted-foreground">Nothing is filled in until you choose it. A sample week is only a starting point you can edit.</p>
        {WEEKDAYS.map((day) => (
          <label key={day} className="grid gap-1 text-sm">
            <span>{WEEKDAY_LABEL[day]}</span>
            <select
              className="h-11 rounded-lg border border-input bg-transparent px-3"
              value={training.days[day]}
              onChange={(event) =>
                setTraining((current) => ({
                  ...current,
                  days: { ...current.days, [day]: event.target.value as DayKind },
                }))
              }
            >
              {DAY_KINDS.map((kind) => (
                <option key={kind} value={kind}>{DAY_KIND_LABEL[kind]}</option>
              ))}
            </select>
          </label>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => setTraining((current) => ({ ...current, days: { ...SAMPLE_WEEK } }))}
        >
          Fill a sample week
        </Button>
        <label className="grid gap-1 text-sm">
          <span>Experience (optional)</span>
          <select
            className="h-11 rounded-lg border border-input bg-transparent px-3"
            value={training.experience ?? ""}
            onChange={(event) =>
              setTraining((current) => ({
                ...current,
                experience: event.target.value ? (event.target.value as ExperienceLevel) : null,
              }))
            }
          >
            <option value="">Not set</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Limitation note (optional)</span>
          <Textarea
            value={training.limitationNote}
            placeholder="Leave blank. Your own note only."
            onChange={(event) => setTraining((current) => ({ ...current, limitationNote: event.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Body mass, kg (optional)</span>
          <Input inputMode="decimal" value={mass} onChange={(event) => setMass(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Goal (optional)</span>
          <select
            className="h-11 rounded-lg border border-input bg-transparent px-3"
            value={training.goal ?? ""}
            onChange={(event) =>
              setTraining((current) => ({
                ...current,
                goal: event.target.value ? (event.target.value as NutritionGoal) : null,
              }))
            }
          >
            <option value="">Not set</option>
            {NUTRITION_GOALS.map((goal) => (
              <option key={goal} value={goal}>{GOAL_LABEL[goal]}</option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-11">Save week</Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (passphrase.trim().length < 4) {
            setMessage("Use at least 4 characters. This is only a local screen lock.");
            return;
          }
          await device.setLock(passphrase);
          setPassphrase("");
          setMessage("Local lock saved. The passphrase itself is not stored.");
        }}
      >
        <Label htmlFor="lock">{profile?.lock ? "Replace local lock" : "Optional local lock"}</Label>
        <Input id="lock" type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
        <Button type="submit" className="h-11">Save local lock</Button>
      </form>
      {profile?.lock ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => { device.removeLock(); setMessage("Local lock removed. The sessions were already stored without encryption."); }}>
          Remove local lock
        </Button>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        className="h-11"
        onClick={() => {
          if (!window.confirm("Erase this person and their sessions from this browser?")) return;
          device.eraseActive();
          router.push("/");
        }}
      >
        Erase this profile from this browser
      </Button>
      {profile ? <Fold title="Food & recovery"><NutritionSection profile={profile} /></Fold> : null}
      {message ? <p className="text-[15px] text-destructive" role="status">{message}</p> : null}
      <DeviceNotice />
    </div>
  );
}
