import { agendasForRole } from '../../engine/src/content/agendas';
import { createGame, resolveYear, validateDecisions } from '../../engine/src/game';
import { TUTORIAL_CRISIS } from '../../engine/src/content/crises';
import { checkPacts, emptyTally, PACT_TERMS, type PactTally, type PactTermId } from '../../engine/src/pacts';
import { Rng } from '../../engine/src/rng';
import { cleanComment, validSurveyAnswers, type SurveyAnswers } from './content/survey';
import { closeTiming, emptyTelemetry, noteAddTime, noteClientError, noteError, notePause, noteResume, openTiming, type StepEnd, type Telemetry } from './telemetry';
import { isOknumIdentified, scoreGame, type TeamResult } from '../../engine/src/scoring';
import { ROLES, type AgendaId, type Decision, type DecisionFor, type GameState, type Role, type YearDecisions } from '../../engine/src/types';
import { DONT_KNOW, QUIZ } from './content/quiz';
import { initialDebrief, type DebriefState } from './debrief';
import { buildFrontPage, type FrontPage } from './koran';

// The authoritative room: who is in it, which team they play, and the game they share.
// Pure and transport-agnostic: the server feeds it messages and broadcasts its views, so the
// same class can later run inside a Durable Object or PartyKit room (GDD, "Arsitektur teknis").

export const MAX_PLAYERS = 40;
export const NICKNAME_MAX = 16;
export const BRIEFING_MS = 90_000;
export const ADD_TIME_MS = 30_000;
export const GUESS_MS = 120_000;
export const MAX_PACTS_PER_TEAM = 3;

export type RoomPhase = 'gabung' | 'briefing' | 'tahun' | 'tebak' | 'selesai';
export type YearStep = 'krisis' | 'rapat' | 'lobi' | 'pengesahan' | 'pengungkapan' | 'koran';
export type AssignMode = 'acak' | 'seimbang';
export type Tempo = 'normal' | 'santai';

/** One year is about 6.5 minutes (GDD, "Struktur sesi & core loop"). */
export const STEP_ORDER: YearStep[] = ['krisis', 'rapat', 'lobi', 'pengesahan', 'pengungkapan', 'koran'];
export const STEP_MS: Record<YearStep, number> = { krisis: 45_000, rapat: 75_000, lobi: 120_000, pengesahan: 45_000, pengungkapan: 60_000, koran: 45_000 };
/** Santai gives classes that read slowly 50% more time (GDD, "Waktu dan gerak"). */
export const TEMPO_FACTOR: Record<Tempo, number> = { normal: 1, santai: 1.5 };
/** Year 0 practice: the same six steps squeezed into three minutes (GDD, "Onboarding"). */
export const PRACTICE_MS: Record<YearStep, number> = { krisis: 20_000, rapat: 45_000, lobi: 40_000, pengesahan: 25_000, pengungkapan: 35_000, koran: 15_000 };
/** Steps in which members may still change their proposal. */
export const DECIDING_STEPS: YearStep[] = ['rapat', 'lobi', 'pengesahan'];

export interface Player {
  id: string;
  nickname: string;
  role: Role | null;
  token: string;
  joinedAt: number;
  /** Open sockets for this player; a phone and a refreshed tab can overlap for a moment. */
  connections: number;
}

export interface RoomOptions {
  /** Mode Oknum: one team secretly plays to collapse the country. */
  oknum: boolean;
  /** Play the guided Year 0 practice between the briefing and year 1. */
  latihan?: boolean;
  /** Pre/post quiz: five questions on each phone before and after play. */
  kuis?: boolean;
}

export type QuizStage = 'pra' | 'pasca';

/** The real game, set aside while the class practises on a throwaway country. */
export interface PracticeStash {
  game: GameState;
  pacts: PactRecord[];
  years: YearRecord[];
  usedVariants: string[];
}

export interface Proposal {
  decision: Decision;
  /** Order of submission, which breaks ties in the team vote. */
  seq: number;
}

export type LockSource = 'jubir' | 'fasilitator' | 'suara';

export type PactStatus = 'diajukan' | 'disepakati' | 'ditolak' | 'ditarik' | 'kedaluwarsa';

export interface PactRecord {
  id: string;
  year: number;
  from: Role;
  to: Role;
  fromTerm: PactTermId;
  toTerm: PactTermId;
  status: PactStatus;
}

export interface PactResult {
  pactId: string;
  keptFrom: boolean;
  keptTo: boolean;
}

export interface YearRecord {
  year: number;
  lockSource: Record<Role, LockSource>;
  pactResults: PactResult[];
  frontPage: FrontPage;
}

export interface FinalVote {
  /** This team's guess of each other team's agenda. */
  agendas: Partial<Record<Role, AgendaId>>;
  /** Mode Oknum: the team this team names as the Oknum. */
  oknum: Role | null;
}

export interface FinalResults {
  teams: (TeamResult & { correctGuesses: number; pactsKept: number; pactsBroken: number })[];
  oknum: { role: Role; identified: boolean; votes: number } | null;
}

export interface RoomSnapshot {
  code: string;
  hostToken: string;
  createdAt: number;
  updatedAt: number;
  phase: RoomPhase;
  step: YearStep | null;
  options: RoomOptions;
  tempo: Tempo;
  seed: number;
  players: Player[];
  /** Teams nobody joined: the facilitator enters their decisions (GDD, "Mode tanpa HP"). */
  offlineRoles: Role[];
  phaseEndsAt: number | null;
  /** Time left on the clock while the facilitator has paused it. */
  pausedMs: number | null;
  game: GameState | null;
  seq: number;
  proposals: Record<string, Proposal>;
  locked: Partial<Record<Role, { decision: Decision; source: LockSource }>>;
  pacts: PactRecord[];
  years: YearRecord[];
  finals: Partial<Record<Role, FinalVote>>;
  results: FinalResults | null;
  debrief: DebriefState | null;
  /** Quiz answers per player id, each submitted once. */
  quiz: Record<string, { pra?: number[]; pasca?: number[] }>;
  /** The post quiz opens when the debrief reaches it and stays open. */
  quizPostOpen: boolean;
  /** Set while Year 0 runs; holds the real game until the practice ends. */
  practice: PracticeStash | null;
  /** Headline variants already printed this session, so none repeats (GDD, "Cara headline disusun"). */
  usedVariants: string[];
  /** Anonymous session telemetry; see telemetry.ts. */
  telemetry: Telemetry;
  /** End-of-session survey per player id, submitted once. Reports drop the ids (report.ts). */
  survey: Record<string, { answers: SurveyAnswers; comment: string | null }>;
  /** The survey opens when the debrief reaches Penutup and stays open. */
  surveyOpen: boolean;
}

export type RoomErrorCode =
  | 'nama-kosong' | 'nama-dipakai' | 'ruangan-penuh' | 'token-salah'
  | 'pemain-tidak-ada' | 'fase-salah' | 'belum-ada-pemain'
  | 'bukan-jubir' | 'keputusan-salah' | 'sudah-dikunci' | 'pakta-salah' | 'pakta-penuh' | 'tanpa-tim';

const ERROR_TEXT: Record<RoomErrorCode, string> = {
  'nama-kosong': 'Isi nama panggilan dulu.',
  'nama-dipakai': 'Nama itu sudah dipakai di ruangan ini. Coba nama lain.',
  'ruangan-penuh': `Ruangan sudah penuh (${MAX_PLAYERS} pemain). Minta fasilitator membuka ruangan kedua.`,
  'token-salah': 'Sesi tidak dikenali. Masuk lagi dengan nama panggilan.',
  'pemain-tidak-ada': 'Pemain itu sudah tidak ada di ruangan.',
  'fase-salah': 'Langkah itu tidak bisa dilakukan di fase ini.',
  'belum-ada-pemain': 'Belum ada pemain yang bergabung.',
  'bukan-jubir': 'Hanya Juru Bicara tim yang bisa melakukan ini.',
  'keputusan-salah': 'Pilihan itu tidak bisa dipakai tahun ini.',
  'sudah-dikunci': 'Keputusan tim sudah disahkan.',
  'pakta-salah': 'Pakta itu tidak bisa dibuat.',
  'pakta-penuh': `Satu tim paling banyak membuat ${MAX_PACTS_PER_TEAM} pakta per tahun.`,
  'tanpa-tim': 'Kamu belum masuk tim.',
};

export class RoomError extends Error {
  constructor(readonly code: RoomErrorCode) {
    super(ERROR_TEXT[code]);
  }
}

/** Trims, collapses whitespace and strips control characters; returns null when nothing is left. */
export function cleanNickname(raw: string): string | null {
  const cleaned = raw.replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX).trim();
  return cleaned || null;
}

export function neutralDecision<R extends Role>(role: R): DecisionFor<R> {
  const neutral: YearDecisions = {
    pemerintah: { role: 'pemerintah', cardId: null, pajak: 0 },
    bankSentral: { role: 'bankSentral', cardId: null, bunga: 0, tolakCetakUang: false },
    pengusaha: { role: 'pengusaha', cardId: null, hargaNaik: false },
    buruh: { role: 'buruh', cardId: null, upah: 0, mogok: false },
    masyarakat: { role: 'masyarakat', cardId: null, konsumsi: 'biasa', viral: null },
  };
  return neutral[role] as DecisionFor<R>;
}

/** The fields a team votes on, per role. */
export const DECISION_FIELDS: { [R in Role]: (keyof DecisionFor<R> & string)[] } = {
  pemerintah: ['cardId', 'pajak'],
  bankSentral: ['cardId', 'bunga', 'tolakCetakUang'],
  pengusaha: ['cardId', 'hargaNaik'],
  buruh: ['cardId', 'upah', 'mogok'],
  masyarakat: ['cardId', 'konsumsi', 'viral'],
};

export class Room {
  private constructor(private s: RoomSnapshot) {}

  static create(init: { code: string; hostToken: string; seed: number; options: RoomOptions; now: number; tempo?: Tempo }): Room {
    return new Room({
      code: init.code,
      hostToken: init.hostToken,
      createdAt: init.now,
      updatedAt: init.now,
      phase: 'gabung',
      step: null,
      options: init.options,
      tempo: init.tempo ?? 'normal',
      seed: init.seed,
      players: [],
      offlineRoles: [],
      phaseEndsAt: null,
      pausedMs: null,
      game: null,
      seq: 0,
      proposals: {},
      locked: {},
      pacts: [],
      years: [],
      finals: {},
      results: null,
      debrief: null,
      practice: null,
      quiz: {},
      quizPostOpen: false,
      usedVariants: [],
      telemetry: emptyTelemetry(),
      survey: {},
      surveyOpen: false,
    });
  }

  /** Restores a room from a snapshot; nobody is connected until their socket comes back. */
  static restore(snapshot: RoomSnapshot): Room {
    // Snapshots from the join-flow release predate the year loop: fill in what they lack.
    const legacyPhase: string = snapshot.phase;
    const s: RoomSnapshot = {
      step: null, tempo: 'normal', pausedMs: null, seq: 0, proposals: {}, locked: {}, pacts: [], years: [], finals: {}, results: null, debrief: null, practice: null, quiz: {}, quizPostOpen: false, usedVariants: [], telemetry: emptyTelemetry(), survey: {}, surveyOpen: false,
      ...structuredClone(snapshot),
      phase: legacyPhase === 'lobi' ? 'gabung' : snapshot.phase,
    };
    if (s.phase === 'tahun' && !s.step) s.step = 'krisis';
    for (const player of s.players) player.connections = 0;
    return new Room(s);
  }

  snapshot(): RoomSnapshot {
    return structuredClone(this.s);
  }

  /** Read-only access for the view builders. */
  get state(): Readonly<RoomSnapshot> { return this.s; }
  get code() { return this.s.code; }
  get phase() { return this.s.phase; }
  get step() { return this.s.step; }
  get updatedAt() { return this.s.updatedAt; }
  get inPractice() { return this.s.practice !== null; }
  get playerCount() { return this.s.players.length; }

  isHost(token: string): boolean {
    return token === this.s.hostToken;
  }

  playerByToken(token: string): Player | undefined {
    return this.s.players.find(p => p.token === token);
  }

  player(playerId: string): Player {
    const player = this.s.players.find(p => p.id === playerId);
    if (!player) throw new RoomError('pemain-tidak-ada');
    return player;
  }

  // ---------- joining and teams ----------

  join(rawNickname: string, ids: { id: string; token: string }, now: number): Player {
    const nickname = cleanNickname(rawNickname);
    if (!nickname) throw new RoomError('nama-kosong');
    if (this.s.players.length >= MAX_PLAYERS) throw new RoomError('ruangan-penuh');
    if (this.s.players.some(p => p.nickname.toLocaleLowerCase('id') === nickname.toLocaleLowerCase('id'))) throw new RoomError('nama-dipakai');
    const player: Player = { id: ids.id, nickname, role: null, token: ids.token, joinedAt: now, connections: 0 };
    this.s.players.push(player);
    // Latecomers after the lobby go straight to the smallest team, which also takes it off facilitator control.
    if (this.s.phase !== 'gabung') this.placeInSmallestTeam(player);
    this.touch(now);
    return player;
  }

  connect(playerId: string): void {
    this.player(playerId).connections++;
  }

  disconnect(playerId: string): void {
    const player = this.s.players.find(p => p.id === playerId);
    if (player) player.connections = Math.max(0, player.connections - 1);
  }

  kick(playerId: string, now: number): void {
    this.player(playerId);
    this.s.players = this.s.players.filter(p => p.id !== playerId);
    delete this.s.proposals[playerId];
    this.s.telemetry.kicks++;
    this.touch(now);
  }

  /** Random deals everyone afresh; balanced keeps current teams and only fills or evens them out. */
  assign(mode: AssignMode, seed: number, now: number): void {
    this.requirePhase('gabung');
    if (mode === 'acak') {
      const rng = new Rng(seed >>> 0);
      const order = rng.shuffle(ROLES);
      rng.shuffle(this.s.players).forEach((player, i) => { player.role = order[i % order.length]!; });
    } else {
      for (const player of this.s.players) if (!player.role) this.placeInSmallestTeam(player);
      this.evenOut();
    }
    this.touch(now);
  }

  move(playerId: string, role: Role | null, now: number): void {
    const player = this.player(playerId);
    if (player.role !== role) delete this.s.proposals[playerId];
    player.role = role;
    if (role) this.s.offlineRoles = this.s.offlineRoles.filter(r => r !== role);
    else if (this.s.phase !== 'gabung') this.markEmptyTeamsOffline();
    this.touch(now);
  }

  /** Members in join order, which is also the speaking order. */
  members(role: Role): Player[] {
    return this.s.players.filter(p => p.role === role).sort((a, b) => a.joinedAt - b.joinedAt);
  }

  /** The Juru Bicara rotates every year so everyone gets to decide once (GDD, "Keputusan di dalam tim"). */
  spokesperson(role: Role): Player | undefined {
    const members = this.members(role);
    return members.length ? members[(this.year - 1) % members.length] : undefined;
  }

  /** The year being played, or the one just resolved while its results are on screen. */
  get year(): number {
    const game = this.s.game;
    if (!game) return 1;
    if (this.s.step === 'pengungkapan' || this.s.step === 'koran' || this.s.phase === 'tebak' || this.s.phase === 'selesai') {
      return game.log.at(-1)?.year ?? game.year;
    }
    return game.year;
  }

  // ---------- clock ----------

  startBriefing(now: number): void {
    this.requirePhase('gabung');
    if (!this.s.players.length) throw new RoomError('belum-ada-pemain');
    for (const player of this.s.players) if (!player.role) this.placeInSmallestTeam(player);
    this.markEmptyTeamsOffline();
    this.s.game = createGame({ seed: this.s.seed, oknum: this.s.options.oknum });
    this.s.phase = 'briefing';
    this.setTimer(BRIEFING_MS, now);
    this.touch(now);
  }

  setTempo(tempo: Tempo, now: number): void {
    if (tempo !== this.s.tempo) this.s.telemetry.tempoChanges++;
    this.s.tempo = tempo;
    this.touch(now);
  }

  pause(now: number): void {
    if (this.s.phaseEndsAt === null) throw new RoomError('fase-salah');
    this.s.pausedMs = Math.max(0, this.s.phaseEndsAt - now);
    this.s.phaseEndsAt = null;
    notePause(this.s.telemetry, now);
    this.touch(now);
  }

  resume(now: number): void {
    if (this.s.pausedMs === null) throw new RoomError('fase-salah');
    this.s.phaseEndsAt = now + this.s.pausedMs;
    this.s.pausedMs = null;
    noteResume(this.s.telemetry, now);
    this.touch(now);
  }

  addTime(now: number): void {
    if (this.s.pausedMs !== null) this.s.pausedMs += ADD_TIME_MS;
    else if (this.s.phaseEndsAt !== null) this.s.phaseEndsAt = Math.max(this.s.phaseEndsAt, now) + ADD_TIME_MS;
    else throw new RoomError('fase-salah');
    noteAddTime(this.s.telemetry, ADD_TIME_MS);
    this.touch(now);
  }

  /** Advances a phase whose timer ran out; returns whether anything changed. */
  tick(now: number): boolean {
    if (this.s.phaseEndsAt !== null && this.s.phaseEndsAt <= now) {
      this.next(now, 'waktu');
      return true;
    }
    return false;
  }

  /** Moves to the next phase or step: on the timer, when everyone is done, or when the facilitator skips ahead. */
  next(now: number, by: StepEnd = 'fasilitator'): void {
    const s = this.s;
    if (s.phase === 'gabung' || s.phase === 'selesai') throw new RoomError('fase-salah');
    closeTiming(s.telemetry, by, now);
    if (by === 'fasilitator') s.telemetry.skips++;
    if (s.phase === 'briefing') {
      this.begin(!!s.options.latihan, now);
      return;
    } else if (s.phase === 'tahun') {
      switch (s.step) {
        case 'krisis': this.enterStep('rapat', now); break;
        case 'rapat': this.enterStep('lobi', now); break;
        case 'lobi':
          for (const pact of this.pactsThisYear()) if (pact.status === 'diajukan') pact.status = 'kedaluwarsa';
          this.enterStep('pengesahan', now);
          break;
        case 'pengesahan':
          this.resolve();
          this.enterStep('pengungkapan', now);
          break;
        case 'pengungkapan': this.enterStep('koran', now); break;
        case 'koran':
          if (s.practice) {
            this.endPractice(now);
          } else if (s.game!.ended) {
            s.phase = 'tebak';
            s.step = null;
            this.setTimer(GUESS_MS, now);
          } else {
            this.enterStep('krisis', now);
          }
          break;
      }
    } else if (s.phase === 'tebak') {
      this.finish();
      s.debrief = initialDebrief();
      s.phase = 'selesai';
      s.phaseEndsAt = null;
      s.pausedMs = null;
    } else {
      throw new RoomError('fase-salah');
    }
    this.touch(now);
  }

  /** Leaves the briefing: into the Year 0 practice, or straight into year 1. */
  begin(practice: boolean, now: number): void {
    const s = this.s;
    this.requirePhase('briefing');
    closeTiming(s.telemetry, 'fasilitator', now);
    s.phase = 'tahun';
    if (practice) {
      s.practice = { game: s.game!, pacts: s.pacts, years: s.years, usedVariants: s.usedVariants };
      // A throwaway country with the same starting board and a mild, rule-free crisis.
      s.game = createGame({ seed: (s.seed ^ 0x5eed) >>> 0, firstCrisis: TUTORIAL_CRISIS.id });
      s.pacts = [];
      s.years = [];
      s.usedVariants = [...s.usedVariants];
    }
    this.enterStep('krisis', now);
    this.touch(now);
  }

  /** Throws the practice country away and starts year 1 of the real game. */
  endPractice(now: number): void {
    const s = this.s;
    if (!s.practice) throw new RoomError('fase-salah');
    closeTiming(s.telemetry, 'fasilitator', now);
    s.game = s.practice.game;
    s.pacts = s.practice.pacts;
    s.years = s.practice.years;
    s.usedVariants = s.practice.usedVariants;
    s.practice = null;
    this.enterStep('krisis', now);
    this.touch(now);
  }

  private enterStep(step: YearStep, now: number): void {
    this.s.step = step;
    if (step === 'krisis') {
      this.s.proposals = {};
      this.s.locked = {};
    }
    this.setTimer((this.s.practice ? PRACTICE_MS : STEP_MS)[step], now);
  }

  private setTimer(ms: number, now: number): void {
    const s = this.s;
    const plannedMs = Math.round(ms * TEMPO_FACTOR[s.tempo]);
    s.pausedMs = null;
    s.phaseEndsAt = now + plannedMs;
    closeTiming(s.telemetry, 'fasilitator', now); // only if a caller forgot; normally already closed
    const phase = s.phase as 'briefing' | 'tahun' | 'tebak';
    openTiming(s.telemetry, { phase, year: phase === 'briefing' || s.practice ? 0 : this.year, step: s.step, plannedMs }, now);
  }

  // ---------- team decisions ----------

  /** Checks a decision against this year's hand, resources and powers. */
  validDecision(role: Role, decision: Decision): boolean {
    if (decision.role !== role || !this.s.game) return false;
    const decisions = { ...this.currentDecisions(), [role]: decision } as YearDecisions;
    try {
      validateDecisions(this.s.game, decisions);
      return true;
    } catch {
      return false;
    }
  }

  /** Every member puts forward what they would choose; the counts show on the spokesperson's phone. */
  propose(playerId: string, decision: Decision, now: number): void {
    const role = this.requireDeciding(playerId);
    if (!this.validDecision(role, decision)) throw new RoomError('keputusan-salah');
    this.s.proposals[playerId] = { decision, seq: ++this.s.seq };
    this.touch(now);
  }

  /** The spokesperson holds SAH; returns true when that was the last team and the reveal began. */
  lock(playerId: string, decision: Decision, now: number): boolean {
    const role = this.requireDeciding(playerId);
    if (this.s.step !== 'pengesahan') throw new RoomError('fase-salah');
    if (this.spokesperson(role)?.id !== playerId) throw new RoomError('bukan-jubir');
    return this.lockTeam(role, decision, 'jubir', now);
  }

  /** The facilitator decides for a team: always for offline teams, or to unstick one in class. */
  hostDecide(role: Role, decision: Decision, now: number): boolean {
    if (this.s.phase !== 'tahun' || !this.s.step || !DECIDING_STEPS.includes(this.s.step)) throw new RoomError('fase-salah');
    return this.lockTeam(role, decision, 'fasilitator', now);
  }

  private lockTeam(role: Role, decision: Decision, source: LockSource, now: number): boolean {
    if (this.s.locked[role]) throw new RoomError('sudah-dikunci');
    if (!this.validDecision(role, decision)) throw new RoomError('keputusan-salah');
    this.s.locked[role] = { decision, source };
    this.touch(now);
    if (this.s.step === 'pengesahan' && ROLES.every(r => this.s.locked[r])) {
      this.next(now, 'otomatis');
      return true;
    }
    return false;
  }

  /** Field by field, the most common choice among members; ties go to the earliest proposal. */
  majority<R extends Role>(role: R): DecisionFor<R> {
    const proposals = this.members(role)
      .map(p => this.s.proposals[p.id])
      .filter((p): p is Proposal => !!p && p.decision.role === role)
      .sort((a, b) => a.seq - b.seq);
    const result = { ...neutralDecision(role) } as Record<string, unknown>;
    for (const field of DECISION_FIELDS[role] as string[]) {
      const counts = new Map<string, number>();
      for (const p of proposals) {
        const key = JSON.stringify((p.decision as unknown as Record<string, unknown>)[field]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      let best: string | null = null;
      for (const [key, count] of counts) if (best === null || count > counts.get(best)!) best = key; // Map keeps first-seen order
      if (best !== null) result[field] = JSON.parse(best);
    }
    return result as unknown as DecisionFor<R>;
  }

  /** Vote counts per field for one team, in first-proposed order. */
  tally(role: Role): Record<string, { value: unknown; count: number }[]> {
    const proposals = this.members(role).map(p => this.s.proposals[p.id]).filter((p): p is Proposal => !!p).sort((a, b) => a.seq - b.seq);
    const out: Record<string, { value: unknown; count: number }[]> = {};
    for (const field of DECISION_FIELDS[role] as string[]) {
      const counts = new Map<string, number>();
      for (const p of proposals) {
        const key = JSON.stringify((p.decision as unknown as Record<string, unknown>)[field]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      out[field] = [...counts].map(([key, count]) => ({ value: JSON.parse(key), count }));
    }
    return out;
  }

  private currentDecisions(): YearDecisions {
    const decisions = {} as Record<Role, Decision>;
    for (const role of ROLES) decisions[role] = this.s.locked[role]?.decision ?? neutralDecision(role);
    return decisions as YearDecisions;
  }

  private requireDeciding(playerId: string): Role {
    const player = this.player(playerId);
    if (!player.role) throw new RoomError('tanpa-tim');
    if (this.s.phase !== 'tahun' || !this.s.step || !DECIDING_STEPS.includes(this.s.step)) throw new RoomError('fase-salah');
    if (this.s.locked[player.role]) throw new RoomError('sudah-dikunci');
    return player.role;
  }

  // ---------- pacts ----------

  pactsThisYear(): PactRecord[] {
    return this.s.pacts.filter(p => p.year === this.year);
  }

  proposePact(playerId: string, to: Role, fromTerm: PactTermId, toTerm: PactTermId, pactId: string, now: number): PactRecord {
    const from = this.requireLobbySpokesperson(playerId);
    if (to === from || !PACT_TERMS[fromTerm] || !PACT_TERMS[toTerm] || PACT_TERMS[fromTerm].role !== from || PACT_TERMS[toTerm].role !== to) {
      throw new RoomError('pakta-salah');
    }
    const live = this.pactsThisYear().filter(p => p.status === 'diajukan' || p.status === 'disepakati');
    if (live.some(p => p.fromTerm === fromTerm && p.toTerm === toTerm && p.from === from && p.to === to)) throw new RoomError('pakta-salah');
    if (live.filter(p => p.from === from || p.to === from).length >= MAX_PACTS_PER_TEAM) throw new RoomError('pakta-penuh');
    if (live.filter(p => p.from === to || p.to === to).length >= MAX_PACTS_PER_TEAM) throw new RoomError('pakta-penuh');
    const pact: PactRecord = { id: pactId, year: this.year, from, to, fromTerm, toTerm, status: 'diajukan' };
    this.s.pacts.push(pact);
    this.touch(now);
    return pact;
  }

  respondPact(playerId: string, pactId: string, accept: boolean, now: number): void {
    const role = this.requireLobbySpokesperson(playerId);
    const pact = this.pactsThisYear().find(p => p.id === pactId && p.status === 'diajukan');
    if (!pact) throw new RoomError('pakta-salah');
    if (pact.from === role && !accept) pact.status = 'ditarik';
    else if (pact.to === role) pact.status = accept ? 'disepakati' : 'ditolak';
    else throw new RoomError('pakta-salah');
    this.touch(now);
  }

  private requireLobbySpokesperson(playerId: string): Role {
    const player = this.player(playerId);
    if (!player.role) throw new RoomError('tanpa-tim');
    if (this.s.phase !== 'tahun' || this.s.step !== 'lobi') throw new RoomError('fase-salah');
    if (this.spokesperson(player.role)?.id !== playerId) throw new RoomError('bukan-jubir');
    return player.role;
  }

  pactTally(): PactTally {
    const tally = emptyTally();
    for (const record of this.s.years) {
      for (const result of record.pactResults) {
        const pact = this.s.pacts.find(p => p.id === result.pactId)!;
        tally[pact.from][result.keptFrom ? 'kept' : 'broken']++;
        tally[pact.to][result.keptTo ? 'kept' : 'broken']++;
      }
    }
    return tally;
  }

  // ---------- resolution ----------

  private resolve(): void {
    const s = this.s;
    const game = s.game!;
    const decisions = {} as Record<Role, Decision>;
    const lockSource = {} as Record<Role, LockSource>;
    for (const role of ROLES) {
      const locked = s.locked[role];
      // An unlocked team plays what most of its members chose (GDD, "Keputusan di dalam tim").
      decisions[role] = locked?.decision ?? this.majority(role);
      lockSource[role] = locked?.source ?? 'suara';
    }
    const year = game.year;
    s.game = resolveYear(game, decisions as YearDecisions);

    const agreed = s.pacts.filter(p => p.year === year && p.status === 'disepakati');
    const outcomes = checkPacts(agreed.map(p => ({ a: p.fromTerm, b: p.toTerm })), decisions as YearDecisions);
    const pactResults = agreed.map((p, i) => ({ pactId: p.id, keptFrom: outcomes[i]!.keptA, keptTo: outcomes[i]!.keptB }));

    const frontPage = buildFrontPage({
      state: s.game,
      log: s.game.log.at(-1)!,
      pacts: agreed,
      pactResults,
      seed: s.seed,
      used: new Set(s.usedVariants),
    });
    s.usedVariants.push(...frontPage.variantIds);
    s.years.push({ year, lockSource, pactResults, frontPage });
  }

  // ---------- end of game ----------

  /** Each team guesses the others' agendas and, in Mode Oknum, names the Oknum (GDD, "Skor akhir"). */
  submitFinal(playerId: string, vote: FinalVote, now: number): boolean {
    const player = this.player(playerId);
    if (!player.role) throw new RoomError('tanpa-tim');
    if (this.spokesperson(player.role)?.id !== playerId) throw new RoomError('bukan-jubir');
    return this.recordFinal(player.role, vote, now);
  }

  hostFinal(role: Role, vote: FinalVote, now: number): boolean {
    return this.recordFinal(role, vote, now);
  }

  private recordFinal(role: Role, vote: FinalVote, now: number): boolean {
    if (this.s.phase !== 'tebak') throw new RoomError('fase-salah');
    if (this.s.finals[role]) throw new RoomError('sudah-dikunci');
    const agendas: Partial<Record<Role, AgendaId>> = {};
    for (const [target, agenda] of Object.entries(vote.agendas) as [Role, AgendaId][]) {
      if (target === role || !ROLES.includes(target)) throw new RoomError('keputusan-salah');
      if (!agendasForRole(target).some(a => a.id === agenda)) throw new RoomError('keputusan-salah');
      agendas[target] = agenda;
    }
    const oknum = this.s.options.oknum ? vote.oknum : null;
    if (oknum !== null && (oknum === role || !ROLES.includes(oknum))) throw new RoomError('keputusan-salah');
    this.s.finals[role] = { agendas, oknum };
    this.touch(now);
    // Teams played from the console do not hold up the class; the facilitator may still vote for them first.
    if (ROLES.every(r => this.s.finals[r] || this.s.offlineRoles.includes(r))) {
      this.next(now, 'otomatis');
      return true;
    }
    return false;
  }

  private finish(): void {
    const s = this.s;
    const game = s.game!;
    const correct: Partial<Record<Role, number>> = {};
    const votes: Partial<Record<Role, Role>> = {};
    for (const role of ROLES) {
      const final = s.finals[role];
      correct[role] = Object.entries(final?.agendas ?? {}).filter(([target, agenda]) => game.agendas[target as Role] === agenda).length;
      if (final?.oknum) votes[role] = final.oknum;
    }
    const oknumRole = ROLES.find(r => game.agendas[r] === 'oknum') ?? null;
    const identified = isOknumIdentified(game, votes);
    const tally = this.pactTally();
    const results = scoreGame(game, { correctGuesses: correct, pacts: tally, oknumIdentified: identified });
    s.results = {
      teams: results.map(r => ({ ...r, correctGuesses: correct[r.role] ?? 0, pactsKept: tally[r.role].kept, pactsBroken: tally[r.role].broken })),
      oknum: oknumRole ? { role: oknumRole, identified, votes: Object.values(votes).filter(v => v === oknumRole).length } : null,
    };
  }

  // ---------- debrief ----------

  /** The facilitator walks the class through the debrief; every screen follows. */
  setDebrief(patch: Partial<DebriefState>, now: number): void {
    if (this.s.phase !== 'selesai' || !this.s.debrief || !this.s.game) throw new RoomError('fase-salah');
    const d = this.s.debrief;
    if (patch.section !== undefined) {
      if (patch.section === 'kuis' && !this.s.options.kuis) throw new RoomError('fase-salah');
      d.section = patch.section;
      if (patch.section === 'kuis') this.s.quizPostOpen = true;
      if (patch.section === 'penutup') this.s.surveyOpen = true;
    }
    if (patch.quizReveal !== undefined) d.quizReveal = patch.quizReveal;
    if (patch.focus !== undefined) {
      if (patch.focus && !this.s.game.log[patch.focus.year - 1]) throw new RoomError('keputusan-salah');
      d.focus = patch.focus;
    }
    if (patch.agendaShown !== undefined) d.agendaShown = Math.max(0, Math.min(ROLES.length, patch.agendaShown));
    if (patch.round !== undefined) d.round = Math.max(0, Math.min(2, patch.round));
    this.touch(now);
  }

  // ---------- quiz ----------

  /** Which quiz a player may answer right now, if any. */
  openQuiz(playerId: string): QuizStage | null {
    const s = this.s;
    if (!s.options.kuis) return null;
    const mine = s.quiz[playerId] ?? {};
    // The pre quiz must come before any play, Year 0 included.
    if ((s.phase === 'gabung' || s.phase === 'briefing') && !mine.pra) return 'pra';
    if (s.phase === 'selesai' && s.quizPostOpen && !mine.pasca) return 'pasca';
    return null;
  }

  submitQuiz(playerId: string, stage: QuizStage, answers: number[], now: number): void {
    this.player(playerId);
    if (this.openQuiz(playerId) !== stage) throw new RoomError('fase-salah');
    if (answers.length !== QUIZ.length || answers.some((a, i) => !Number.isInteger(a) || a < DONT_KNOW || a >= QUIZ[i]!.options.length)) {
      throw new RoomError('keputusan-salah');
    }
    (this.s.quiz[playerId] ??= {})[stage] = [...answers];
    this.touch(now);
  }

  // ---------- survey ----------

  /** Whether this player may answer the end-of-session survey now. */
  surveyOpenFor(playerId: string): boolean {
    return this.s.phase === 'selesai' && this.s.surveyOpen && !this.s.survey[playerId];
  }

  submitSurvey(playerId: string, answers: SurveyAnswers, comment: string | null, now: number): void {
    this.player(playerId);
    if (!this.surveyOpenFor(playerId)) throw new RoomError('fase-salah');
    if (!validSurveyAnswers(answers)) throw new RoomError('keputusan-salah');
    this.s.survey[playerId] = { answers: { seru: answers.seru, jelas: answers.jelas, belajar: answers.belajar }, comment: cleanComment(comment) };
    this.touch(now);
  }

  // ---------- telemetry ----------

  noteReconnect(kind: 'host' | 'player'): void {
    if (kind === 'host') this.s.telemetry.hostReconnects++;
    else this.s.telemetry.reconnects++;
  }

  noteError(code: string): void {
    noteError(this.s.telemetry, code);
  }

  noteClientError(where: 'host' | 'phone', message: string): void {
    noteClientError(this.s.telemetry, where, message);
  }

  // ---------- helpers ----------

  private requirePhase(phase: RoomPhase): void {
    if (this.s.phase !== phase) throw new RoomError('fase-salah');
  }

  private markEmptyTeamsOffline(): void {
    this.s.offlineRoles = ROLES.filter(role => !this.members(role).length);
  }

  private placeInSmallestTeam(player: Player): void {
    // Ties go to the first role in table order, so a class of five fills one seat per role.
    const role = ROLES.reduce((best, r) => (this.members(r).length < this.members(best).length ? r : best));
    player.role = role;
    this.s.offlineRoles = this.s.offlineRoles.filter(r => r !== role);
  }

  /** Moves the latest joiners out of the biggest team until sizes differ by at most one. */
  private evenOut(): void {
    for (;;) {
      const sizes = ROLES.map(role => ({ role, size: this.members(role).length }));
      const biggest = sizes.reduce((a, b) => (b.size > a.size ? b : a));
      const smallest = sizes.reduce((a, b) => (b.size < a.size ? b : a));
      if (biggest.size - smallest.size <= 1) return;
      this.members(biggest.role).at(-1)!.role = smallest.role;
    }
  }

  private touch(now: number): void {
    this.s.updatedAt = now;
  }
}
