import { configurationFor, decorateSegment, summarize, type DecoratedSegment } from "./quantities";
import type { SavedSession } from "./device-store";
import { formatClock } from "./time";

export function viewSession(saved: SavedSession) {
  return {
    id: saved.id,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    sessionDate: saved.input.sessionDate,
    sessionType: saved.input.sessionType,
    actualElapsed: formatClock(saved.input.actualElapsedSec),
    transitions: formatClock(saved.input.transitionsSec),
    penalties: formatClock(saved.input.penaltiesSec),
    rpe: saved.input.rpe,
    notes: saved.input.notes,
    segments: saved.input.segments.map(decorateSegment) as DecoratedSegment[],
    totals: summarize(saved.input),
    configuration: configurationFor(saved.input),
  };
}
