import type { PactTermId } from '../../engine/src/pacts';
import { PACT_TERMS } from '../../engine/src/pacts';
import { INDICATORS, ROLES, type AgendaId, type Decision, type Indicator, type Role } from '../../engine/src/types';
import { SURVEY_COMMENT_MAX, validSurveyAnswers, type SurveyAnswers } from './content/survey';
import { DEBRIEF_SECTIONS, type DebriefSection, type DebriefState } from './debrief';
import type { AssignMode, FinalVote, QuizStage, RoomErrorCode, Tempo } from './room';
import type { HostView, PlayerView } from './views';

// Wire format between the server and its clients. Everything a client sends is untrusted,
// so parseClientMessage accepts only the exact shapes below.

export type ClientMessage =
  | { t: 'host'; code: string; token: string }
  | { t: 'join'; code: string; nickname: string }
  | { t: 'resume'; code: string; token: string }
  // facilitator
  | { t: 'assign'; mode: AssignMode }
  | { t: 'move'; playerId: string; role: Role | null }
  | { t: 'kick'; playerId: string }
  | { t: 'startBriefing' }
  | { t: 'next' }
  | { t: 'begin'; practice: boolean }
  | { t: 'endPractice' }
  | { t: 'pause' }
  | { t: 'resume-clock' }
  | { t: 'addTime' }
  | { t: 'tempo'; tempo: Tempo }
  | { t: 'hostDecide'; role: Role; decision: Decision }
  | { t: 'hostReady'; role: Role; on: boolean }
  | { t: 'hostFinal'; role: Role; vote: FinalVote }
  | { t: 'debrief'; patch: Partial<DebriefState> }
  // players
  | { t: 'propose'; decision: Decision }
  | { t: 'lock'; decision: Decision }
  | { t: 'ready'; on: boolean }
  | { t: 'pactPropose'; to: Role; fromTerm: PactTermId; toTerm: PactTermId }
  | { t: 'pactRespond'; pactId: string; accept: boolean }
  | { t: 'final'; vote: FinalVote }
  | { t: 'quiz'; stage: QuizStage; answers: number[] }
  | { t: 'survey'; answers: SurveyAnswers; comment: string | null }
  | { t: 'react'; kind: ReactionKind }
  // any bound client: a script error for the anonymous telemetry
  | { t: 'clientError'; message: string };

/** Live reactions from phones, floated on the main screen; never stored. */
export const REACTIONS = ['tawa', 'marah', 'tepuk', 'uang'] as const;
export type ReactionKind = typeof REACTIONS[number];

export type ServerMessage =
  | { t: 'welcome'; as: 'host' }
  | { t: 'welcome'; as: 'player'; playerId: string; token: string }
  | { t: 'host-state'; now: number; view: HostView }
  | { t: 'player-state'; now: number; view: PlayerView }
  | { t: 'error'; code: RoomErrorCode | 'ruangan-tidak-ada' | 'pesan-salah' | 'terlalu-cepat' | 'bukan-host'; message: string }
  | { t: 'kicked' }
  | { t: 'reaction'; kind: ReactionKind; role: Role | null };

export const HOST_ONLY = new Set<ClientMessage['t']>([
  'assign', 'move', 'kick', 'startBriefing', 'next', 'begin', 'endPractice', 'pause', 'resume-clock', 'addTime', 'tempo', 'hostDecide', 'hostReady', 'hostFinal', 'debrief',
]);
export const PLAYER_ONLY = new Set<ClientMessage['t']>(['propose', 'lock', 'ready', 'pactPropose', 'pactRespond', 'final', 'quiz', 'survey', 'react']);

const CODE_RE = /^[A-Z]{4}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const ID_RE = /^[A-Za-z0-9_-]{4,32}$/;
const CARD_RE = /^[a-z]{2,4}_[a-zA-Z]{2,24}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isString = (v: unknown, re: RegExp): v is string => typeof v === 'string' && re.test(v);
const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);
const isStep = (v: unknown): v is -1 | 0 | 1 => v === -1 || v === 0 || v === 1;

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Rebuilds a decision from exactly the fields its role allows; null when anything is off. */
export function parseDecision(v: unknown): Decision | null {
  if (!isObj(v)) return null;
  const cardId = v.cardId === null ? null : isString(v.cardId, CARD_RE) ? v.cardId : undefined;
  if (cardId === undefined) return null;
  switch (v.role) {
    case 'pemerintah':
      return isStep(v.pajak) ? { role: 'pemerintah', cardId, pajak: v.pajak } : null;
    case 'bankSentral':
      return isStep(v.bunga) && typeof v.tolakCetakUang === 'boolean' ? { role: 'bankSentral', cardId, bunga: v.bunga, tolakCetakUang: v.tolakCetakUang } : null;
    case 'pengusaha':
      return typeof v.hargaNaik === 'boolean' ? { role: 'pengusaha', cardId, hargaNaik: v.hargaNaik } : null;
    case 'buruh':
      return (v.upah === 0 || v.upah === 1 || v.upah === 2) && typeof v.mogok === 'boolean' ? { role: 'buruh', cardId, upah: v.upah, mogok: v.mogok } : null;
    case 'masyarakat':
      return (v.konsumsi === 'hemat' || v.konsumsi === 'biasa' || v.konsumsi === 'belanja') && (v.viral === null || isRole(v.viral))
        ? { role: 'masyarakat', cardId, konsumsi: v.konsumsi, viral: v.viral as Role | null }
        : null;
    default:
      return null;
  }
}

function parseDebrief(v: unknown): Partial<DebriefState> | null {
  if (!isObj(v)) return null;
  const patch: Partial<DebriefState> = {};
  if (v.section !== undefined) {
    if (!DEBRIEF_SECTIONS.includes(v.section as DebriefSection)) return null;
    patch.section = v.section as DebriefSection;
  }
  if (v.focus !== undefined) {
    if (v.focus === null) patch.focus = null;
    else if (isObj(v.focus) && INDICATORS.includes(v.focus.stat as Indicator) && Number.isInteger(v.focus.year) && (v.focus.year as number) >= 1 && (v.focus.year as number) <= 5) {
      patch.focus = { stat: v.focus.stat as Indicator, year: v.focus.year as number };
    } else return null;
  }
  if (v.quizReveal !== undefined) {
    if (typeof v.quizReveal !== 'boolean') return null;
    patch.quizReveal = v.quizReveal;
  }
  for (const key of ['agendaShown', 'round'] as const) {
    if (v[key] === undefined) continue;
    if (!Number.isInteger(v[key]) || (v[key] as number) < 0 || (v[key] as number) > 5) return null;
    patch[key] = v[key] as number;
  }
  return patch;
}

function parseFinal(v: unknown): FinalVote | null {
  if (!isObj(v) || !isObj(v.agendas) || !(v.oknum === null || isRole(v.oknum))) return null;
  const agendas: Partial<Record<Role, AgendaId>> = {};
  for (const [role, agenda] of Object.entries(v.agendas)) {
    if (!isRole(role) || typeof agenda !== 'string' || agenda.length > 24) return null;
    agendas[role] = agenda as AgendaId;
  }
  return { agendas, oknum: v.oknum as Role | null };
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let m: Obj;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed)) return null;
    m = parsed;
  } catch {
    return null;
  }
  const code = typeof m.code === 'string' ? normalizeCode(m.code) : '';
  switch (m.t) {
    case 'host':
    case 'resume':
      return CODE_RE.test(code) && isString(m.token, TOKEN_RE) ? { t: m.t, code, token: m.token } : null;
    case 'join':
      return CODE_RE.test(code) && typeof m.nickname === 'string' && m.nickname.length <= 64 ? { t: 'join', code, nickname: m.nickname } : null;
    case 'assign':
      return m.mode === 'acak' || m.mode === 'seimbang' ? { t: 'assign', mode: m.mode } : null;
    case 'move':
      return isString(m.playerId, ID_RE) && (m.role === null || isRole(m.role)) ? { t: 'move', playerId: m.playerId, role: m.role as Role | null } : null;
    case 'kick':
      return isString(m.playerId, ID_RE) ? { t: 'kick', playerId: m.playerId } : null;
    case 'begin':
      return typeof m.practice === 'boolean' ? { t: 'begin', practice: m.practice } : null;
    case 'startBriefing':
    case 'endPractice':
    case 'next':
    case 'pause':
    case 'resume-clock':
    case 'addTime':
      return { t: m.t };
    case 'tempo':
      return m.tempo === 'normal' || m.tempo === 'santai' ? { t: 'tempo', tempo: m.tempo } : null;
    case 'hostDecide': {
      const decision = parseDecision(m.decision);
      return isRole(m.role) && decision ? { t: 'hostDecide', role: m.role, decision } : null;
    }
    case 'hostReady':
      return isRole(m.role) && typeof m.on === 'boolean' ? { t: 'hostReady', role: m.role, on: m.on } : null;
    case 'ready':
      return typeof m.on === 'boolean' ? { t: 'ready', on: m.on } : null;
    case 'hostFinal': {
      const vote = parseFinal(m.vote);
      return isRole(m.role) && vote ? { t: 'hostFinal', role: m.role, vote } : null;
    }
    case 'debrief': {
      const patch = parseDebrief(m.patch);
      return patch ? { t: 'debrief', patch } : null;
    }
    case 'propose':
    case 'lock': {
      const decision = parseDecision(m.decision);
      return decision ? { t: m.t, decision } : null;
    }
    case 'pactPropose':
      return isRole(m.to) && typeof m.fromTerm === 'string' && m.fromTerm in PACT_TERMS && typeof m.toTerm === 'string' && m.toTerm in PACT_TERMS
        ? { t: 'pactPropose', to: m.to, fromTerm: m.fromTerm as PactTermId, toTerm: m.toTerm as PactTermId }
        : null;
    case 'pactRespond':
      return isString(m.pactId, ID_RE) && typeof m.accept === 'boolean' ? { t: 'pactRespond', pactId: m.pactId, accept: m.accept } : null;
    case 'quiz':
      return (m.stage === 'pra' || m.stage === 'pasca') && Array.isArray(m.answers) && m.answers.length <= 10 && m.answers.every(a => Number.isInteger(a))
        ? { t: 'quiz', stage: m.stage, answers: m.answers as number[] }
        : null;
    case 'final': {
      const vote = parseFinal(m.vote);
      return vote ? { t: 'final', vote } : null;
    }
    case 'survey': {
      if (!validSurveyAnswers(m.answers)) return null;
      if (!(m.comment === null || (typeof m.comment === 'string' && m.comment.length <= SURVEY_COMMENT_MAX * 2))) return null;
      const a = m.answers;
      return { t: 'survey', answers: { seru: a.seru, jelas: a.jelas, belajar: a.belajar }, comment: m.comment as string | null };
    }
    case 'react':
      return REACTIONS.includes(m.kind as ReactionKind) ? { t: 'react', kind: m.kind as ReactionKind } : null;
    case 'clientError':
      return typeof m.message === 'string' && m.message.length <= 2000 ? { t: 'clientError', message: m.message } : null;
    default:
      return null;
  }
}
