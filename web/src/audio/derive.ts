import { INDICATORS, type Indicator } from '../../../engine/src/types';
import type { HostView, PublicStats, RevealView } from '../../../room/src/views';
import { zoneOf } from '../text';
import type { CueId, Mood } from './cues';

// Pure mapping from what changed on the main screen to the sounds it makes. Kept free of audio code
// so it can be tested and so the same events could drive captions later.

/** Sounds for the change from one host view to the next. The first view of a session makes none. */
export function cuesFor(prev: HostView | null, next: HostView): CueId[] {
  if (!prev) return [];
  const cues: CueId[] = [];

  if (next.phase === 'gabung' && next.players.length > prev.players.length) cues.push('gabung');
  if (next.phase !== prev.phase) {
    if (next.phase === 'briefing') cues.push('briefing');
    if (next.phase === 'tebak') cues.push('tebak');
    if (next.phase === 'selesai' && next.results) cues.push(next.results.ending === 'kolaps' ? 'akhir.kolaps' : 'akhir.baik');
  }
  const newStep = next.phase === 'tahun' && next.step && (next.step !== prev.step || next.year !== prev.year || next.practice !== prev.practice);
  if (newStep) cues.push(`fase.${next.step!}` as CueId);

  // Locks and pacts only count within the same step, so a fresh year never replays last year's stamps.
  if (!newStep && next.phase === 'tahun') {
    const lockedBefore = new Set(prev.teams.filter(t => t.locked).map(t => t.role));
    for (const team of next.teams) if (team.locked && !lockedBefore.has(team.role)) cues.push('sah');
    const pactsBefore = new Set(prev.pacts.map(p => p.id));
    for (const pact of next.pacts) if (!pactsBefore.has(pact.id)) cues.push('pakta.sepakat');
  }

  if (prev.pausedMs === null && next.pausedMs !== null) cues.push('jeda');
  if (prev.pausedMs !== null && next.pausedMs === null && next.phaseEndsAt !== null) cues.push('lanjut');

  if (prev.debrief && next.debrief) {
    if (prev.debrief.section !== next.debrief.section) cues.push('halaman');
    if (!prev.debrief.quizReveal && next.debrief.quizReveal) cues.push('kuis.jawaban');
  }
  return cues;
}

/**
 * The reveal is paced on the main screen itself, one item every 1.5 s, so its sounds follow the same
 * count: team cards, then causes, then pacts, then the verdict.
 */
export function revealCue(reveal: RevealView, shown: number): CueId[] {
  const teams = reveal.teams.length;
  const groups = reveal.groups.length;
  const pacts = reveal.pacts.length;
  const i = shown - 1;
  if (i < 0) return [];
  if (i < teams) return ['kartu.buka'];
  if (i < teams + groups) {
    const net = reveal.groups[i - teams]!.changes.reduce((sum, c) => sum + goodness(c.stat as Indicator, c.amount), 0);
    return [net >= 0 ? 'sebab.baik' : 'sebab.buruk'];
  }
  if (i < teams + groups + pacts) {
    const r = reveal.pacts[i - teams - groups]!.result;
    return [r && r.keptFrom && r.keptTo ? 'pakta.tepat' : 'pakta.robek'];
  }
  if (i === teams + groups + pacts) {
    if (reveal.collapses.length) return ['kolaps'];
    if (enteredDanger(reveal.statsBefore, reveal.statsAfter)) return ['bahaya'];
  }
  return [];
}

const goodness = (stat: Indicator, amount: number) => (stat === 'harga' || stat === 'keresahan' ? -amount : amount);

export function enteredDanger(before: PublicStats, after: PublicStats): boolean {
  return INDICATORS.some(stat => zoneOf(stat, before[stat]) === 'aman' && zoneOf(stat, after[stat]) !== 'aman');
}

/** Length of the ticking-clock recording: it covers the last ten seconds of a timed step. */
export const TICK_SECONDS = 10;

/**
 * Where to start the ticking clock for the time left, in seconds into the recording, or null outside
 * the last ten seconds. Starting part-way keeps it in step with the clock after a resume or extra time.
 */
export function tickOffset(msLeft: number): number | null {
  if (msLeft <= 0 || msLeft > TICK_SECONDS * 1000) return null;
  return Math.max(0, TICK_SECONDS - msLeft / 1000);
}

/** Which loop plays, and whether it sits under the action. Silence for the debrief discussion. */
export function musicFor(view: HostView): { mood: Mood | null; duck: boolean } {
  const paused = view.pausedMs !== null;
  if (view.phase === 'gabung' || view.phase === 'briefing') return { mood: 'tenang', duck: paused };
  if (view.phase === 'tebak') return { mood: 'tegang', duck: paused };
  if (view.phase !== 'tahun' || !view.stats) return { mood: null, duck: false };
  const stats = view.stats;
  const collapsing = INDICATORS.some(stat => zoneOf(stat, stats[stat]) === 'kolaps');
  const mood: Mood = collapsing || stats.keresahan >= 7 ? 'krisis' : stats.keresahan >= 5 ? 'tegang' : 'tenang';
  // Reading moments: the reveal and the front page are carried by their own sounds.
  const duck = paused || view.step === 'pengungkapan' || view.step === 'koran' || view.step === 'krisis';
  return { mood, duck };
}
