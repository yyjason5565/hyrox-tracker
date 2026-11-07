"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RpeHelp } from "@/components/rpe-help";
import { DIVISION_IDS, DIVISION_LABEL, standardDetail, type DivisionId } from "@/lib/divisions";
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

function blankSegment(def: SegmentDef, division: DivisionId): SegmentForm {
  const target = officialTarget(def.key, division);
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
  division: DivisionId;
  sessionType: SessionType;
  actualElapsed: string;
  transitions: string;
  penalties: string;
  rpe: string;
  notes: string;
  segments: Record<SegmentKey, SegmentForm>;
}

function sameNumber(raw: string, value: number | null | undefined): boolean {
  if (value == null) return raw.trim() === "";
  return raw.trim() !== "" && Number(raw) === value;
}

function matchesOfficial(form: SegmentForm, division: DivisionId, def: SegmentDef): boolean {
  const target = officialTarget(def.key, division);
  return (
    sameNumber(form.targetMeters, target.meters) &&
    sameNumber(form.targetReps, target.reps) &&
    sameNumber(form.targetLoad, target.loadKg) &&
    sameNumber(form.targetA, target.implementsKg?.[0]) &&
    sameNumber(form.targetB, target.implementsKg?.[1]) &&
    sameNumber(form.targetHeight, target.heightM)
  );
}

export function emptyDraft(today: string, division: DivisionId): SessionDraft {
  return {
    sessionDate: today,
    division,
    sessionType: "full",
    actualElapsed: "",
    transitions: "",
    penalties: "",
    rpe: "",
    notes: "",
    segments: Object.fromEntries(SEGMENTS.map((segment) => [segment.key, blankSegment(segment, division)])) as Record<
      SegmentKey,
      SegmentForm
    >,
  };
}

function withDivision(draft: SessionDraft, division: DivisionId): SessionDraft {
  if (draft.division === division) return draft;
  const segments = { ...draft.segments };
  for (const def of SEGMENTS) {
    const current = segments[def.key];
    if (!matchesOfficial(current, draft.division, def)) continue;
    const next = blankSegment(def, division);
    segments[def.key] = { ...current, ...{
      targetMeters: next.targetMeters,
      targetReps: next.targetReps,
      targetLoad: next.targetLoad,
      targetA: next.targetA,
      targetB: next.targetB,
      targetHeight: next.targetHeight,
    } };
  }
  return { ...draft, division, segments };
}

export function draftFromSession(session: {
  sessionDate: string;
  division: DivisionId;
  sessionType: SessionType;
  actualElapsed: string | null;
  transitions: string | null;
  penalties: string | null;
  rpe: number | null;
  notes: string;
  segments: DecoratedSegment[];
}): SessionDraft {
  const draft = emptyDraft(session.sessionDate, session.division);
  draft.division = session.division;
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
    division: draft.division,
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
  formId = "workout-form",
}: {
  initial: SessionDraft;
  sessionId?: string;
  formId?: string;
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
      division: parsed.value.division,
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
    router.push("/log/history");
    router.refresh();
  }

  function remove() {
    if (!sessionId || !onDelete) return;
    if (!window.confirm("Delete this session from this browser?")) return;
    onDelete(sessionId);
    router.push("/log/history");
    router.refresh();
  }

  const totals = preview.ok ? preview.totals : null;

  const fieldClass = "h-11 min-h-11 w-full rounded-[10px] border border-white/10 bg-input px-3 text-[16px]";

  return (
    <form
      id={formId}
      className="grid gap-5 pb-8"
      onSubmit={onSubmit}
      onFocus={(event) => {
        const target = event.target;
        if (target instanceof HTMLElement) target.scrollIntoView({ block: "nearest" });
      }}
    >
      <section className="ios-group">
        <label className="grid gap-1 px-4 py-3">
          <span className="text-[13px] text-muted-foreground">Date</span>
          <Input type="date" className="text-[16px]" value={draft.sessionDate} onChange={(event) => setDraft({ ...draft, sessionDate: event.target.value })} required />
        </label>
        <label className="grid gap-1 px-4 py-3">
          <span className="text-[13px] text-muted-foreground">Category</span>
          <select className={fieldClass} value={draft.division} onChange={(event) => setDraft((current) => withDivision(current, event.target.value as DivisionId))}>
            {DIVISION_IDS.map((division) => (
              <option key={division} value={division}>{DIVISION_LABEL[division]}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 px-4 py-3">
          <span className="text-[13px] text-muted-foreground">Type</span>
          <select className={fieldClass} aria-label="Workout type" value={draft.sessionType} onChange={(event) => setDraft({ ...draft, sessionType: event.target.value as SessionType })}>
            <option value="full">Full</option>
            <option value="partial">Partial</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <div className="grid gap-1 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground"><label htmlFor="session-rpe">RPE</label><RpeHelp /></span>
          <select id="session-rpe" className={fieldClass} value={draft.rpe} onChange={(event) => setDraft({ ...draft, rpe: event.target.value })}>
            <option value="">Not recorded</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="ios-group px-4 py-4">
        {totals ? (
          <div>
            <p className="text-[13px] text-muted-foreground">{totals.totalLabel}</p>
            <p className="font-mono text-[34px] leading-tight font-semibold">{totals.totalSeconds != null ? formatDuration(totals.totalSeconds) : "—"}</p>
            {totals.stopwatchSeconds != null ? (
              <p className="text-[13px] text-muted-foreground">Stopwatch {formatDuration(totals.stopwatchSeconds)}. Not the total.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-[15px] text-destructive">Check the highlighted fields. Blank is not zero.</p>
        )}
      </section>
      <p className="px-1 text-[13px] text-muted-foreground">Example: 4:35</p>
      <ol className="ios-group">
      {SEGMENTS.map((def, index) => {
        const form = draft.segments[def.key];
        const live = preview.ok ? preview.segments.find((segment) => segment.key === def.key) : undefined;
        const pace = live ? segmentPace(live) : null;
        const note = live ? decorateSegment(live).planNote : null;
        return (
          <li key={def.key}>
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[17px]">{index + 1}. {def.name}</p>
                <p className="text-[13px] text-muted-foreground">{DIVISION_LABEL[draft.division]} · {standardDetail(draft.division, def.key)}</p>
              </div>
              <Input
                className="w-28 shrink-0 text-right text-[16px]"
                placeholder="mm:ss"
                inputMode="text"
                autoComplete="off"
                aria-label={`${def.name} time, for example 4:35`}
                disabled={form.skipped}
                value={form.time}
                onChange={(event) => updateSegment(def.key, { time: event.target.value, skipped: false })}
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 px-4 text-[15px]">
              <input
                type="checkbox"
                checked={form.skipped}
                onChange={(event) => updateSegment(def.key, { skipped: event.target.checked, time: event.target.checked ? "" : form.time })}
              />
              Skipped, not done
            </label>
            {fieldErrors[`segments.${def.key}.time`] ? (
              <p className="px-4 pb-2 text-[13px] text-destructive">{fieldErrors[`segments.${def.key}.time`]}</p>
            ) : null}
            <details className="px-4 pb-3">
              <summary className="min-h-11 cursor-pointer text-[15px] text-primary">Distance, reps, and load</summary>
              <div className="grid gap-3 pb-2 sm:grid-cols-2">
                <fieldset className="grid gap-2">
                  <legend className="text-[13px] text-muted-foreground">Target</legend>
                  {def.kind !== "wall" ? <NumberField label="Distance" suffix="m" value={form.targetMeters} onChange={(value) => updateSegment(def.key, { targetMeters: value })} /> : null}
                  {def.kind === "wall" ? <NumberField label="Reps" suffix="reps" value={form.targetReps} onChange={(value) => updateSegment(def.key, { targetReps: value })} /> : null}
                  {def.kind === "loaded" || def.kind === "wall" ? <NumberField label={def.kind === "loaded" && (def.key === "sled_push" || def.key === "sled_pull") ? "Load including sled" : "Load"} suffix="kg" value={form.targetLoad} onChange={(value) => updateSegment(def.key, { targetLoad: value })} /> : null}
                  {def.kind === "carry" ? <><NumberField label="Implement A" suffix="kg" value={form.targetA} onChange={(value) => updateSegment(def.key, { targetA: value })} /><NumberField label="Implement B" suffix="kg" value={form.targetB} onChange={(value) => updateSegment(def.key, { targetB: value })} /></> : null}
                  {def.kind === "wall" ? <NumberField label="Target height" suffix="m" value={form.targetHeight} onChange={(value) => updateSegment(def.key, { targetHeight: value })} /> : null}
                </fieldset>
                <fieldset className="grid gap-2">
                  <legend className="text-[13px] text-muted-foreground">Performed, if different</legend>
                  {def.kind !== "wall" ? <NumberField label="Distance" suffix="m" value={form.performedMeters} onChange={(value) => updateSegment(def.key, { performedMeters: value })} /> : null}
                  {def.kind === "wall" ? <NumberField label="Reps" suffix="reps" value={form.performedReps} onChange={(value) => updateSegment(def.key, { performedReps: value })} /> : null}
                  {def.kind === "loaded" || def.kind === "wall" ? <NumberField label="Load" suffix="kg" value={form.performedLoad} onChange={(value) => updateSegment(def.key, { performedLoad: value })} /> : null}
                  {def.kind === "carry" ? <><NumberField label="Implement A" suffix="kg" value={form.performedA} onChange={(value) => updateSegment(def.key, { performedA: value })} /><NumberField label="Implement B" suffix="kg" value={form.performedB} onChange={(value) => updateSegment(def.key, { performedB: value })} /></> : null}
                  {def.kind === "wall" ? <NumberField label="Target height" suffix="m" value={form.performedHeight} onChange={(value) => updateSegment(def.key, { performedHeight: value })} /> : null}
                </fieldset>
              </div>
            </details>
            {pace ? <p className="px-4 pb-2 font-mono text-[13px]">{formatPace(pace.seconds, pace.unit)}</p> : null}
            {note ? <p className="px-4 pb-2 text-[13px] text-muted-foreground">{note}</p> : null}
          </li>
        );
      })}
      </ol>

      <details className="ios-group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-[17px] font-semibold">More</summary>
        <div className="border-t border-white/10">
          <label className="ios-row">
            <span className="flex-1 text-[17px]">Roxzone</span>
            <Input className="w-28 text-right text-[16px]" placeholder="mm:ss" inputMode="text" aria-label="Roxzone, blank if not recorded, 0:00 if none" value={draft.transitions} onChange={(event) => setDraft({ ...draft, transitions: event.target.value })} />
          </label>
          <label className="ios-row">
            <span className="flex-1 text-[17px]">Penalties</span>
            <Input className="w-28 text-right text-[16px]" placeholder="mm:ss" inputMode="text" aria-label="Penalties, blank if not recorded, 0:00 if none" value={draft.penalties} onChange={(event) => setDraft({ ...draft, penalties: event.target.value })} />
          </label>
          <label className="ios-row">
            <span className="flex-1 text-[17px]">Stopwatch</span>
            <Input className="w-28 text-right text-[16px]" placeholder="mm:ss" inputMode="text" aria-label="Optional stopwatch, not the calculated total" value={draft.actualElapsed} onChange={(event) => setDraft({ ...draft, actualElapsed: event.target.value })} />
          </label>
          <label className="grid gap-2 px-4 py-3 text-[17px]">
            <span>Notes</span>
            <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <p className="px-4 pb-3 text-[13px] text-muted-foreground">Blank means not recorded. 0:00 means none. Stopwatch is not the total.</p>
        </div>
      </details>
      {error ? <p className="text-[15px] text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" className="h-12 text-[17px]" disabled={pending}>{pending ? "Saving…" : "Save workout"}</Button>
      {sessionId ? (
        <Button type="button" variant="destructive" className="h-12" disabled={pending} onClick={remove}>Delete workout</Button>
      ) : null}
    </form>
  );
}

