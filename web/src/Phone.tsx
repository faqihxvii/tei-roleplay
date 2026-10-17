import { useRef, useState, type FormEvent } from 'react';
import { ROLE_CODE, ROLE_COLOR } from '../../engine/src/content/roles';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';
import type { PlayerView } from '../../room/src/room';
import { formatSeconds, storage, useClockOffset, useRoomSocket, useSecondsLeft } from './socket';

type Session = { code: string; nickname?: string; token?: string };

const tokenKey = (code: string) => `tei:pemain:${code}`;

function initialSession(): Session | null {
  const code = new URLSearchParams(location.search).get('r')?.trim().toUpperCase() ?? '';
  const token = code ? storage.get(tokenKey(code)) : null;
  return code && token ? { code, token } : null;
}

export function Phone() {
  const [session, setSession] = useState<Session | null>(initialSession);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const clock = useClockOffset();

  const hello = (): ClientMessage | null => {
    const s = sessionRef.current;
    if (!s) return null;
    return s.token ? { t: 'resume', code: s.code, token: s.token } : { t: 'join', code: s.code, nickname: s.nickname ?? '' };
  };

  const onMessage = (message: ServerMessage) => {
    switch (message.t) {
      case 'welcome':
        if (message.as === 'player') {
          const code = sessionRef.current!.code;
          storage.set(tokenKey(code), message.token);
          setSession({ code, token: message.token });
          history.replaceState(null, '', `/?r=${code}`);
          setError(null);
        }
        break;
      case 'player-state':
        clock.sync(message.now);
        setView(message.view);
        break;
      case 'kicked':
        if (session) storage.remove(tokenKey(session.code));
        setKicked(true);
        break;
      case 'error':
        // Anything before we have a seat sends the phone back to the form, with the reason.
        if (!view || message.code === 'token-salah' || message.code === 'ruangan-tidak-ada') {
          if (sessionRef.current) storage.remove(tokenKey(sessionRef.current.code));
          setSession(null);
          setView(null);
        }
        setError(message.message);
        break;
    }
  };

  const { status } = useRoomSocket(hello, onMessage, !!session && !kicked);

  if (kicked) {
    return (
      <main className="phone center">
        <p className="lead">Fasilitator mengeluarkanmu dari ruangan.</p>
        <p className="muted">Kalau ini keliru, minta fasilitator lalu masuk lagi.</p>
        <button className="btn" onClick={() => { setKicked(false); setSession(null); setView(null); }}>Masuk lagi</button>
      </main>
    );
  }

  if (!session || !view) {
    return <JoinForm busy={!!session} error={error} onJoin={(code, nickname) => { setError(null); setSession({ code, nickname }); }} />;
  }

  return (
    <main className="phone">
      <ConnectionBar status={status} />
      <PhoneBody view={view} now={clock.now} />
    </main>
  );
}

function JoinForm({ busy, error, onJoin }: { busy: boolean; error: string | null; onJoin: (code: string, nickname: string) => void }) {
  const fromQr = new URLSearchParams(location.search).get('r')?.toUpperCase() ?? '';
  const [code, setCode] = useState(fromQr);
  const [nickname, setNickname] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim().length === 4 && nickname.trim()) onJoin(code.trim().toUpperCase(), nickname);
  };

  return (
    <main className="phone">
      <header className="masthead">
        <p className="kicker">The Economic Influence</p>
        <h1>Masuk ruangan</h1>
      </header>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Kode ruangan</span>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD"
            className="code-input"
            aria-describedby="code-hint"
            required
          />
          <small id="code-hint" className="muted">4 huruf di layar utama.</small>
        </label>
        <label className="field">
          <span>Nama panggilan</span>
          <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={16} autoComplete="nickname" placeholder="mis. Ani" required />
          <small className="muted">Cukup nama panggilan. Tidak perlu nama lengkap atau data lain.</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy || code.length !== 4 || !nickname.trim()}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form>
    </main>
  );
}

function ConnectionBar({ status }: { status: string }) {
  if (status === 'terhubung') return null;
  return <p className="banner" role="status">{status === 'terputus' ? 'Sinyal putus. Menyambung ulang…' : 'Menghubungkan…'}</p>;
}

function PhoneBody({ view, now }: { view: PlayerView; now: () => number }) {
  const seconds = useSecondsLeft(view.phaseEndsAt, now);
  const team = view.team;

  if (!team) {
    return (
      <section className="center grow">
        <p className="kicker">Ruangan {view.code}</p>
        <p className="lead">Halo, {view.me.nickname}.</p>
        <p className="muted">Tunggu fasilitator membagi tim. Lihat layar utama.</p>
      </section>
    );
  }

  const roleCard = (
    <div className="role-card" style={{ ['--role' as string]: ROLE_COLOR[team.role] }}>
      <span className="role-mark" aria-hidden="true">{ROLE_CODE[team.role]}</span>
      <div>
        <p className="kicker">Timmu</p>
        <h2>{team.label}</h2>
      </div>
    </div>
  );

  const members = (
    <section>
      <h3 className="label">Anggota tim</h3>
      <ul className="members">
        {team.members.map(name => <li key={name} aria-current={name === view.me.nickname ? 'true' : undefined}>{name}</li>)}
      </ul>
    </section>
  );

  if (view.phase === 'lobi') {
    return (
      <section className="stack">
        {roleCard}
        {members}
        <p className="muted">Tim masih bisa berubah. Tunggu fasilitator memulai briefing.</p>
      </section>
    );
  }

  if (view.phase === 'briefing') {
    return (
      <section className="stack">
        {roleCard}
        {view.me.isSpokesperson && <p className="badge">Kamu Juru Bicara tahun {view.year}: kamu yang mengunci keputusan tim.</p>}
        {team.agenda && (
          <article className="agenda">
            <p className="kicker">Agenda rahasia tim</p>
            <h3>{team.agenda.name}</h3>
            <p>{team.agenda.description}</p>
            <p className="muted small">Jangan tunjukkan layar ini ke tim lain.</p>
          </article>
        )}
        {members}
        {seconds !== null && <p className="timer" aria-live="off">Tahun 1 mulai dalam {formatSeconds(seconds)}</p>}
      </section>
    );
  }

  return (
    <section className="stack">
      {roleCard}
      <p className="lead">Tahun {view.year} dimulai. Lihat layar utama.</p>
      {view.me.isSpokesperson && <p className="badge">Kamu Juru Bicara tahun ini.</p>}
      {team.agenda && (
        <details className="agenda">
          <summary>Agenda rahasia: {team.agenda.name}</summary>
          <p>{team.agenda.description}</p>
        </details>
      )}
    </section>
  );
}
