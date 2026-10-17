import { ROLES, type Role } from '../../engine/src/types';
import type { AssignMode, HostView, PlayerView, RoomErrorCode } from './room';

// Wire format between the server and its clients. Everything a client sends is untrusted,
// so parseClientMessage accepts only the exact shapes below.

export type ClientMessage =
  | { t: 'host'; code: string; token: string }
  | { t: 'join'; code: string; nickname: string }
  | { t: 'resume'; code: string; token: string }
  | { t: 'assign'; mode: AssignMode }
  | { t: 'move'; playerId: string; role: Role | null }
  | { t: 'kick'; playerId: string }
  | { t: 'startBriefing' }
  | { t: 'addTime' }
  | { t: 'startYear' };

export type ServerMessage =
  | { t: 'welcome'; as: 'host' }
  | { t: 'welcome'; as: 'player'; playerId: string; token: string }
  | { t: 'host-state'; now: number; view: HostView }
  | { t: 'player-state'; now: number; view: PlayerView }
  | { t: 'error'; code: RoomErrorCode | 'ruangan-tidak-ada' | 'pesan-salah' | 'terlalu-cepat' | 'bukan-host'; message: string }
  | { t: 'kicked' };

export const HOST_ONLY = new Set<ClientMessage['t']>(['assign', 'move', 'kick', 'startBriefing', 'addTime', 'startYear']);

const CODE_RE = /^[A-Z]{4}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const ID_RE = /^[A-Za-z0-9_-]{4,32}$/;

const isString = (v: unknown, re: RegExp): v is string => typeof v === 'string' && re.test(v);

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let m: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    m = parsed as Record<string, unknown>;
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
      return isString(m.playerId, ID_RE) && (m.role === null || ROLES.includes(m.role as Role))
        ? { t: 'move', playerId: m.playerId, role: m.role as Role | null }
        : null;
    case 'kick':
      return isString(m.playerId, ID_RE) ? { t: 'kick', playerId: m.playerId } : null;
    case 'startBriefing':
    case 'addTime':
    case 'startYear':
      return { t: m.t };
    default:
      return null;
  }
}
