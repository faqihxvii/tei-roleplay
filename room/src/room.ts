import { getAgenda } from '../../engine/src/content/agendas';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { createGame } from '../../engine/src/game';
import { Rng } from '../../engine/src/rng';
import { ROLES, type GameState, type Role } from '../../engine/src/types';

// The authoritative room: who is in it, which team they play, and the game they share.
// Pure and transport-agnostic: the server feeds it messages and broadcasts its views, so the
// same class can later run inside a Durable Object or PartyKit room (GDD, "Arsitektur teknis").

export const MAX_PLAYERS = 40;
export const NICKNAME_MAX = 16;
export const BRIEFING_MS = 90_000;
export const ADD_TIME_MS = 30_000;

export type RoomPhase = 'lobi' | 'briefing' | 'tahun';
export type AssignMode = 'acak' | 'seimbang';

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
}

export interface RoomSnapshot {
  code: string;
  hostToken: string;
  createdAt: number;
  updatedAt: number;
  phase: RoomPhase;
  options: RoomOptions;
  seed: number;
  players: Player[];
  /** Teams nobody joined: the facilitator enters their decisions (GDD, "Mode tanpa HP"). */
  offlineRoles: Role[];
  phaseEndsAt: number | null;
  game: GameState | null;
}

export type RoomErrorCode =
  | 'nama-kosong' | 'nama-dipakai' | 'ruangan-penuh' | 'token-salah'
  | 'pemain-tidak-ada' | 'fase-salah' | 'belum-ada-pemain';

const ERROR_TEXT: Record<RoomErrorCode, string> = {
  'nama-kosong': 'Isi nama panggilan dulu.',
  'nama-dipakai': 'Nama itu sudah dipakai di ruangan ini. Coba nama lain.',
  'ruangan-penuh': `Ruangan sudah penuh (${MAX_PLAYERS} pemain). Minta fasilitator membuka ruangan kedua.`,
  'token-salah': 'Sesi tidak dikenali. Masuk lagi dengan nama panggilan.',
  'pemain-tidak-ada': 'Pemain itu sudah tidak ada di ruangan.',
  'fase-salah': 'Langkah itu tidak bisa dilakukan di fase ini.',
  'belum-ada-pemain': 'Belum ada pemain yang bergabung.',
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

export interface PlayerSummary {
  id: string;
  nickname: string;
  role: Role | null;
  connected: boolean;
}

/** What the projected host screen and facilitator console see. Never contains agendas. */
export interface HostView {
  code: string;
  phase: RoomPhase;
  options: RoomOptions;
  year: number;
  players: PlayerSummary[];
  offlineRoles: Role[];
  spokespeople: Partial<Record<Role, string>>;
  phaseEndsAt: number | null;
}

/** What one phone sees: its own team only. */
export interface PlayerView {
  code: string;
  phase: RoomPhase;
  year: number;
  me: { id: string; nickname: string; role: Role | null; isSpokesperson: boolean };
  team: { role: Role; label: string; members: string[]; agenda: { name: string; description: string } | null } | null;
  phaseEndsAt: number | null;
}

export class Room {
  private constructor(private s: RoomSnapshot) {}

  static create(init: { code: string; hostToken: string; seed: number; options: RoomOptions; now: number }): Room {
    return new Room({
      code: init.code,
      hostToken: init.hostToken,
      createdAt: init.now,
      updatedAt: init.now,
      phase: 'lobi',
      options: init.options,
      seed: init.seed,
      players: [],
      offlineRoles: [],
      phaseEndsAt: null,
      game: null,
    });
  }

  /** Restores a room from a snapshot; nobody is connected until their socket comes back. */
  static restore(snapshot: RoomSnapshot): Room {
    const s = structuredClone(snapshot);
    for (const player of s.players) player.connections = 0;
    return new Room(s);
  }

  snapshot(): RoomSnapshot {
    return structuredClone(this.s);
  }

  get code() { return this.s.code; }
  get phase() { return this.s.phase; }
  get updatedAt() { return this.s.updatedAt; }
  get playerCount() { return this.s.players.length; }

  isHost(token: string): boolean {
    return token === this.s.hostToken;
  }

  playerByToken(token: string): Player | undefined {
    return this.s.players.find(p => p.token === token);
  }

  join(rawNickname: string, ids: { id: string; token: string }, now: number): Player {
    const nickname = cleanNickname(rawNickname);
    if (!nickname) throw new RoomError('nama-kosong');
    if (this.s.players.length >= MAX_PLAYERS) throw new RoomError('ruangan-penuh');
    if (this.s.players.some(p => p.nickname.toLocaleLowerCase('id') === nickname.toLocaleLowerCase('id'))) throw new RoomError('nama-dipakai');
    const player: Player = { id: ids.id, nickname, role: null, token: ids.token, joinedAt: now, connections: 0 };
    this.s.players.push(player);
    // Latecomers after the lobby go straight to the smallest team, which also takes it off facilitator control.
    if (this.s.phase !== 'lobi') this.placeInSmallestTeam(player);
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
    this.touch(now);
  }

  /** Random deals everyone afresh; balanced keeps current teams and only fills or evens them out. */
  assign(mode: AssignMode, seed: number, now: number): void {
    this.requirePhase('lobi');
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
    this.player(playerId).role = role;
    if (role) this.s.offlineRoles = this.s.offlineRoles.filter(r => r !== role);
    this.touch(now);
  }

  startBriefing(now: number): void {
    this.requirePhase('lobi');
    if (!this.s.players.length) throw new RoomError('belum-ada-pemain');
    for (const player of this.s.players) if (!player.role) this.placeInSmallestTeam(player);
    this.s.offlineRoles = ROLES.filter(role => !this.members(role).length);
    this.s.game = createGame({ seed: this.s.seed, oknum: this.s.options.oknum });
    this.s.phase = 'briefing';
    this.s.phaseEndsAt = now + BRIEFING_MS;
    this.touch(now);
  }

  addTime(now: number): void {
    if (this.s.phaseEndsAt === null) throw new RoomError('fase-salah');
    this.s.phaseEndsAt = Math.max(this.s.phaseEndsAt, now) + ADD_TIME_MS;
    this.touch(now);
  }

  /** Hands over to the year loop; the six year phases are driven from here in the next milestone. */
  startYear(now: number): void {
    this.requirePhase('briefing');
    this.s.phase = 'tahun';
    this.s.phaseEndsAt = null;
    this.touch(now);
  }

  /** Advances a phase whose timer ran out; returns whether anything changed. */
  tick(now: number): boolean {
    if (this.s.phase === 'briefing' && this.s.phaseEndsAt !== null && this.s.phaseEndsAt <= now) {
      this.startYear(now);
      return true;
    }
    return false;
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

  get year(): number {
    return this.s.game?.year ?? 1;
  }

  hostView(): HostView {
    const spokespeople: Partial<Record<Role, string>> = {};
    for (const role of ROLES) {
      const spokesperson = this.spokesperson(role);
      if (spokesperson) spokespeople[role] = spokesperson.id;
    }
    return {
      code: this.s.code,
      phase: this.s.phase,
      options: { ...this.s.options },
      year: this.year,
      players: this.s.players.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, connected: p.connections > 0 })),
      offlineRoles: [...this.s.offlineRoles],
      spokespeople,
      phaseEndsAt: this.s.phaseEndsAt,
    };
  }

  playerView(playerId: string): PlayerView {
    const player = this.player(playerId);
    const role = player.role;
    const agendaId = role && this.s.game ? this.s.game.agendas[role] : null;
    const agenda = agendaId ? getAgenda(agendaId) : null;
    return {
      code: this.s.code,
      phase: this.s.phase,
      year: this.year,
      me: { id: player.id, nickname: player.nickname, role, isSpokesperson: !!role && this.spokesperson(role)?.id === player.id },
      team: role
        ? {
            role,
            label: ROLE_LABEL[role],
            members: this.members(role).map(p => p.nickname),
            agenda: agenda && this.s.phase !== 'lobi' ? { name: agenda.name, description: agenda.description } : null,
          }
        : null,
      phaseEndsAt: this.s.phaseEndsAt,
    };
  }

  private player(playerId: string): Player {
    const player = this.s.players.find(p => p.id === playerId);
    if (!player) throw new RoomError('pemain-tidak-ada');
    return player;
  }

  private requirePhase(phase: RoomPhase): void {
    if (this.s.phase !== phase) throw new RoomError('fase-salah');
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
