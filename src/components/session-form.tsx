"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DecoratedSegment } from "@/lib/quantities";
import { configurationFor, decorateSegment, formatPace, segmentPace, summarize } from "@/lib/quantities";
import { SEGMENTS, type SegmentDef, type SegmentKey, type SessionType } from "@/lib/segments";
import { formatDuration } from "@/lib/time";
import { officialTarget, validateSessionBody, type WireSegmentInput } from "@/lib/validate";

interface SegmentForm {
  skipped: boolean;
  time: string;
  targetMeters: string;
  performedMeters: string;
  targetReps: string;
  performedReps: string;
  targetLoad: string;
  performedLoad: string;
  targetA: string;
  targetB: string;
  performedA: string;
  performedB: string;
  targetHeight: string;
  performedHeight: string;
}

function blankSegment(def: SegmentDef): SegmentForm {
  const target = officialTarget(def.key);
  return {
    skipped: false,
    time: "",
    targetMeters: target.meters != null ? String(target.meters) : "",
    performedMeters: "",
    targetReps: target.reps != null ? String(target.reps) : "",
    performedReps: "",
    targetLoad: target.loadKg != null ? String(target.loadKg) : "",
    performedLoad: "",
    targetA: target.implementsKg?.[0] != null ? String(target.implementsKg[0]) : "",
    targetB: target.implementsKg?.[1] != null ? String(target.implementsKg[1]) : "",
    performedA: "",
    performedB: "",
    targetHeight: target.heightM != null ? String(target.heightM) : "",
    performedHeight: "",
  };
}

function text(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function fromDecorated(segment: DecoratedSegment): SegmentForm {
  const performed = segment.performed;
  return {
    skipped: segment.status === "skipped",
    time: segment.time ?? "",
    targetMeters: text(segment.target.meters),
    performedMeters: text(performed?.meters),
    targetReps: text(segment.target.reps),
    performedReps: text(performed?.reps),
    targetLoad: text(segment.target.loadKg),
    performedLoad: text(performed?.loadKg),
    targetA: text(segment.target.implementsKg?.[0]),
    targetB: text(segment.target.implementsKg?.[1]),
    performedA: text(performed?.implementsKg?.[0]),
    performedB: text(performed?.implementsKg?.[1]),
    targetHeight: text(segment.target.heightM),
    performedHeight: text(performed?.heightM),
  };
}

function num(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function quantity(def: SegmentDef, form: SegmentForm, performed: boolean) {
  if (def.kind === "wall") {
    return {
      reps: num(performed ? form.performedReps : form.targetReps),
      loadKg: num(performed ? form.performedLoad : form.targetLoad),
      heightM: num(performed ? form.performedHeight : form.targetHeight),
    };
  }
  if (def.kind === "carry") {
    return {
      meters: num(performed ? form.performedMeters : form.targetMeters),
      implementsKg: [
        num(performed ? form.performedA : form.targetA),
        num(performed ? form.performedB : form.targetB),
      ] as [number | null, number | null],
    };
  }
  if (def.kind === "loaded") {
    return {
      meters: num(performed ? form.performedMeters : form.targetMeters),
      loadKg: num(performed ? form.performedLoad : form.targetLoad),
    };
  }
  return { meters: num(performed ? form.performedMeters : form.targetMeters) };
}

function hasPerformed(value: ReturnType<typeof quantity>): boolean {
  if ("reps" in value && value.reps != null) return true;
  if ("meters" in value && value.meters != null) return true;
  if ("loadKg" in value && value.loadKg != null) return true;
  if ("heightM" in value && value.heightM != null) return true;
  if ("implementsKg" in value && value.implementsKg?.some((item) => item != null)) return true;
  return false;
}

export interface SessionDraft {
  sessionDate: string;
  sessionType: SessionType;
  actualElapsed: string;
  transitions: string;
  penalties: string;
  rpe: string;
  notes: string;
  segments: Record<SegmentKey, SegmentForm>;
}

export function emptyDraft(today: string): SessionDraft {
  return {
    sessionDate: today,
    sessionType: "full",
    actualElapsed: "",
    transitions: "",
    penalties: "",
    rpe: "",
    notes: "",
    segments: Object.fromEntries(SEGMENTS.map((segment) => [segment.key, blankSegment(segment)])) as Record<
      SegmentKey,
      SegmentForm
    >,
  };
}

export function draftFromSession(session: {
  sessionDate: string;
  sessionType: SessionType;
  actualElapsed: string | null;
  transitions: string | null;
  penalties: string | null;
  rpe: number | null;
  notes: string;
  segments: DecoratedSegment[];
}): SessionDraft {
  const draft = emptyDraft(session.sessionDate);
  draft.sessionType = session.sessionType;
  draft.actualElapsed = session.actualElapsed ?? "";
  draft.transitions = session.transitions ?? "";
  draft.penalties = session.penalties ?? "";
  draft.rpe = session.rpe == null ? "" : String(session.rpe);
  draft.notes = session.notes;
  for (const segment of session.segments) {
    draft.segments[segment.key] = fromDecorated(segment);
  }
  return draft;
}

function toWire(draft: SessionDraft) {
  const segments: WireSegmentInput[] = SEGMENTS.map((def) => {
    const form = draft.segments[def.key];
    const performed = quantity(def, form, true);
    return {
      key: def.key,
      status: form.skipped ? "skipped" : form.time.trim() ? "timed" : "unrecorded",
      time: form.skipped || !form.time.trim() ? null : form.time.trim(),
      target: quantity(def, form, false),
      performed: hasPerformed(performed) ? performed : null,
    };
  });
  return {
    sessionDate: draft.sessionDate,
    sessionType: draft.sessionType,
    actualElapsed: draft.actualElapsed.trim() || null,
    transitions: draft.transitions.trim() || null,
    penalties: draft.penalties.trim() || null,
    rpe: draft.rpe.trim() ? Number(draft.rpe) : null,
    notes: draft.notes,
    segments,
  };
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <Input value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value)} />
        <span className="w-12 shrink-0 text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}

export function SessionForm({
  initial,
  sessionId,
  onSave,
  onDelete,
}: {
  initial: SessionDraft;
  sessionId?: string;
  onSave: (body: ReturnType<typeof toWire>, sessionId?: string) => { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
  onDelete?: (sessionId: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    const parsed = validateSessionBody(toWire(draft));
    if (!parsed.ok) return { ok: false as const, error: parsed.error, fieldErrors: parsed.fieldErrors };
    const math = {
      sessionType: parsed.value.sessionType,
      actualElapsedSec: parsed.value.actualElapsedSec,
      transitionsSec: parsed.value.transitionsSec,
      penaltiesSec: parsed.value.penaltiesSec,
      segments: parsed.value.segments,
    };
    return { ok: true as const, totals: summarize(math), configuration: configurationFor(math), segments: parsed.value.segments };
  }, [draft]);

  function updateSegment(key: SegmentKey, patch: Partial<SegmentForm>) {
    setDraft((current) => ({
      ...current,
      segments: { ...current.segments, [key]: { ...current.segments[key], ...patch } },
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const body = toWire(draft);
    const result = onSave(body, sessionId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    router.push(`/log/edit/?id=${result.id}`);
    router.refresh();
  }

  function remove() {
    if (!sessionId || !onDelete) return;
    if (!window.confirm("Delete this session from this browser?")) return;
    onDelete(sessionId);
    router.push("/log");
    router.refresh();
  }

  const totals = preview.ok ? preview.totals : null;

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <section className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span>Date (Asia/Kuala_Lumpur)</span>
            <Input type="date" value={draft.sessionDate} onChange={(event) => setDraft({ ...draft, sessionDate: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Type</span>
            <select
              className="h-11 rounded-lg border border-input bg-transparent px-3"
              value={draft.sessionType}
              onChange={(event) => setDraft({ ...draft, sessionType: event.target.value as SessionType })}
            >
              <option value="full">Full</option>
              <option value="partial">Partial</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>RPE (optional)</span>
            <select
              className="h-11 rounded-lg border border-input bg-transparent px-3"
              value={draft.rpe}
              onChange={(event) => setDraft({ ...draft, rpe: event.target.value })}
            >
              <option value="">Not recorded</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span>Actual elapsed</span>
            <Input placeholder="mm:ss" value={draft.actualElapsed} onChange={(event) => setDraft({ ...draft, actualElapsed: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Transitions</span>
            <Input placeholder="blank or 0:00" value={draft.transitions} onChange={(event) => setDraft({ ...draft, transitions: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Penalties</span>
            <Input placeholder="blank or 0:00" value={draft.penalties} onChange={(event) => setDraft({ ...draft, penalties: event.target.value })} />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>Notes</span>
          <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
        <p className="text-sm text-muted-foreground">
          Leave a split blank when it was not recorded. Blank is unknown, not 0:00. Mark skipped when the piece was not done. Performed fields can stay blank to use the target.
        </p>
      </section>

      <section className="rounded-2xl bg-secondary/60 p-4 text-sm">
        {totals ? (
          <div className="grid gap-1">
            <p>
              Runs: {totals.runs.timedCount} timed
              {totals.runs.timedSeconds != null ? `, ${formatDuration(totals.runs.timedSeconds)}` : ""}
              {totals.runs.distanceMeters != null ? ` over ${totals.runs.distanceMeters.toLocaleString("en-US")} m` : ""}
              {totals.runs.averagePaceSecPerKm != null ? `, pace ${formatDuration(totals.runs.averagePaceSecPerKm)} /km` : ""}
            </p>
            <p>
              Stations: {totals.stations.timedCount} timed
              {totals.stations.timedSeconds != null ? `, ${formatDuration(totals.stations.timedSeconds)}` : ""}
            </p>
            <p>Finish: {totals.finishSeconds != null ? formatDuration(totals.finishSeconds) : "not enough recorded times"}</p>
            <p>{preview.ok && preview.configuration.raceEligible ? "Counts toward official full-race bests." : "Not an official full-race result."}</p>
            {preview.ok && preview.configuration.modified ? <p>Modified workload. Left out of official bests.</p> : null}
          </div>
        ) : (
          <p>Fix the highlighted fields to see totals. Nothing is treated as zero while a field is blank.</p>
        )}
      </section>

      {SEGMENTS.map((def, index) => {
        const form = draft.segments[def.key];
        const live = preview.ok ? preview.segments.find((segment) => segment.key === def.key) : undefined;
        const pace = live ? segmentPace(live) : null;
        const note = live ? decorateSegment(live).planNote : null;
        return (
          <section key={def.key} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{index + 1} · {def.kind === "run" ? "Run" : "Station"}</p>
                <h2 className="text-lg font-semibold">{def.name}</h2>
                <p className="text-sm text-muted-foreground">Open standard: {def.detail}</p>
              </div>
              <label className="grid w-36 gap-1 text-sm">
                <span>Time</span>
                <Input
                  placeholder="mm:ss"
                  disabled={form.skipped}
                  value={form.time}
                  onChange={(event) => updateSegment(def.key, { time: event.target.value, skipped: false })}
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.skipped}
                onChange={(event) => updateSegment(def.key, { skipped: event.target.checked, time: event.target.checked ? "" : form.time })}
              />
              Skipped — not done
            </label>
            {fieldErrors[`segments.${def.key}.time`] ? (
              <p className="mt-2 text-sm text-destructive">{fieldErrors[`segments.${def.key}.time`]}</p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Target</legend>
                {def.kind !== "wall" ? (
                  <NumberField label="Distance" suffix="m" value={form.targetMeters} onChange={(value) => updateSegment(def.key, { targetMeters: value })} />
                ) : null}
                {def.kind === "wall" ? (
                  <NumberField label="Reps" suffix="reps" value={form.targetReps} onChange={(value) => updateSegment(def.key, { targetReps: value })} />
                ) : null}
                {def.kind === "loaded" || def.kind === "wall" ? (
                  <NumberField label={def.kind === "loaded" && (def.key === "sled_push" || def.key === "sled_pull") ? "Load including sled" : "Load"} suffix="kg" value={form.targetLoad} onChange={(value) => updateSegment(def.key, { targetLoad: value })} />
                ) : null}
                {def.kind === "carry" ? (
                  <>
                    <NumberField label="Implement A" suffix="kg" value={form.targetA} onChange={(value) => updateSegment(def.key, { targetA: value })} />
                    <NumberField label="Implement B" suffix="kg" value={form.targetB} onChange={(value) => updateSegment(def.key, { targetB: value })} />
                  </>
                ) : null}
                {def.kind === "wall" ? (
                  <NumberField label="Target height" suffix="m" value={form.targetHeight} onChange={(value) => updateSegment(def.key, { targetHeight: value })} />
                ) : null}
              </fieldset>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Performed</legend>
                {def.kind !== "wall" ? (
                  <NumberField label="Distance" suffix="m" value={form.performedMeters} onChange={(value) => updateSegment(def.key, { performedMeters: value })} />
                ) : null}
                {def.kind === "wall" ? (
                  <NumberField label="Reps" suffix="reps" value={form.performedReps} onChange={(value) => updateSegment(def.key, { performedReps: value })} />
                ) : null}
                {def.kind === "loaded" || def.kind === "wall" ? (
                  <NumberField label="Load" suffix="kg" value={form.performedLoad} onChange={(value) => updateSegment(def.key, { performedLoad: value })} />
                ) : null}
                {def.kind === "carry" ? (
                  <>
                    <NumberField label="Implement A" suffix="kg" value={form.performedA} onChange={(value) => updateSegment(def.key, { performedA: value })} />
                    <NumberField label="Implement B" suffix="kg" value={form.performedB} onChange={(value) => updateSegment(def.key, { performedB: value })} />
                  </>
                ) : null}
                {def.kind === "wall" ? (
                  <NumberField label="Target height" suffix="m" value={form.performedHeight} onChange={(value) => updateSegment(def.key, { performedHeight: value })} />
                ) : null}
              </fieldset>
            </div>
            {pace ? <p className="mt-3 font-mono text-sm">{formatPace(pace.seconds, pace.unit)}</p> : null}
            {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
          </section>
        );
      })}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="sticky bottom-16 z-10 flex gap-2 rounded-xl bg-background/95 py-2">
        <Button type="submit" className="h-11 flex-1" disabled={pending}>
          {pending ? "Saving…" : "Save session"}
        </Button>
        {sessionId ? (
          <Button type="button" variant="destructive" className="h-11" disabled={pending} onClick={remove}>
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

