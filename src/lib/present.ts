import { DIVISION_LABEL } from "./divisions";
import { configurationFor, decorateSegment, summarize, type DecoratedSegment } from "./quantities";
import type { SavedSession } from "./device-store";
import { formatClock } from "./time";

export function viewSession(saved: SavedSession) {
  const division = saved.input.division;
  return {
    id: saved.id,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    sessionDate: saved.input.sessionDate,
    sessionType: saved.input.sessionType,
    division,
    divisionLabel: DIVISION_LABEL[division],
    actualElapsed: formatClock(saved.input.actualElapsedSec),
    transitions: formatClock(saved.input.transitionsSec),
    penalties: formatClock(saved.input.penaltiesSec),
    rpe: saved.input.rpe,
    notes: saved.input.notes,
    segments: saved.input.segments.map((segment) => decorateSegment(segment, division)) as DecoratedSegment[],
    totals: summarize(saved.input),
    configuration: configurationFor(saved.input),
  };
}
