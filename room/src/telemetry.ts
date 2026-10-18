// Anonymous session telemetry (GDD, "Telemetri anonim"): how long each phase really took, how often
// the facilitator stepped in, reconnects and errors. Nothing here names a player; the session report
// built from it (report.ts) carries counts and choices per team, never nicknames or player ids.

export type TimedPhase = 'briefing' | 'tahun' | 'tebak';
/** How a phase ended: its clock ran out, the facilitator skipped it, or everyone was done early. */
export type StepEnd = 'waktu' | 'fasilitator' | 'otomatis';

export interface StepTiming {
  phase: TimedPhase;
  /** 0 for the Year 0 practice. */
  year: number;
  step: string | null;
  /** Null for steps without a clock, which the facilitator moves on by hand. */
  plannedMs: number | null;
  actualMs: number;
  pausedMs: number;
  addedMs: number;
  endedBy: StepEnd;
}

export interface Telemetry {
  current: Omit<StepTiming, 'actualMs' | 'endedBy'> & { startedAt: number; pausedAt: number | null } | null;
  steps: StepTiming[];
  pauses: number;
  addTimes: number;
  skips: number;
  tempoChanges: number;
  /** A phone coming back to its session after a refresh or a dropped signal. */
  reconnects: number;
  /** The host screen reopened after the first time. */
  hostReconnects: number;
  kicks: number;
  /** Rejected actions by error code (wrong phase, not the spokesperson, …). */
  errors: Record<string, number>;
  /** Script errors reported by browsers, deduplicated by message. */
  clientErrors: { where: 'host' | 'phone'; message: string; count: number }[];
}

export const MAX_CLIENT_ERRORS = 20;
export const CLIENT_ERROR_MAX = 300;

export const emptyTelemetry = (): Telemetry => ({
  current: null, steps: [], pauses: 0, addTimes: 0, skips: 0, tempoChanges: 0, reconnects: 0, hostReconnects: 0, kicks: 0, errors: {}, clientErrors: [],
});

export function openTiming(t: Telemetry, info: { phase: TimedPhase; year: number; step: string | null; plannedMs: number | null }, now: number): void {
  t.current = { ...info, startedAt: now, pausedAt: null, pausedMs: 0, addedMs: 0 };
}

export function closeTiming(t: Telemetry, by: StepEnd, now: number): void {
  const c = t.current;
  if (!c) return;
  const pausedMs = c.pausedMs + (c.pausedAt !== null ? now - c.pausedAt : 0);
  t.steps.push({ phase: c.phase, year: c.year, step: c.step, plannedMs: c.plannedMs, actualMs: Math.max(0, now - c.startedAt), pausedMs, addedMs: c.addedMs, endedBy: by });
  t.current = null;
}

export function notePause(t: Telemetry, now: number): void {
  t.pauses++;
  if (t.current && t.current.pausedAt === null) t.current.pausedAt = now;
}

export function noteResume(t: Telemetry, now: number): void {
  if (t.current?.pausedAt != null) {
    t.current.pausedMs += now - t.current.pausedAt;
    t.current.pausedAt = null;
  }
}

export function noteAddTime(t: Telemetry, ms: number): void {
  t.addTimes++;
  if (t.current) t.current.addedMs += ms;
}

export function noteError(t: Telemetry, code: string): void {
  t.errors[code] = (t.errors[code] ?? 0) + 1;
}

export function noteClientError(t: Telemetry, where: 'host' | 'phone', raw: string): void {
  // Keep only the first line: stack traces carry file paths, not useful and not anonymous-safe.
  const message = raw.split('\n')[0]!.replace(/[\p{C}]/gu, ' ').trim().slice(0, CLIENT_ERROR_MAX);
  if (!message) return;
  const known = t.clientErrors.find(e => e.where === where && e.message === message);
  if (known) known.count++;
  else if (t.clientErrors.length < MAX_CLIENT_ERRORS) t.clientErrors.push({ where, message, count: 1 });
}
