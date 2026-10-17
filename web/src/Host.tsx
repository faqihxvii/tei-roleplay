import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type Role } from '../../engine/src/types';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';
import type { HostView, PlayerSummary } from '../../room/src/views';
import { useHostAudio } from './audio/useHostAudio';
import { AvControls, ClockControls, Console, useConsoleToggle } from './Console';
import { DebriefScreen } from './Debrief';
import { QuizCount } from './Quiz';
import { Portrait } from './art';
import { Diorama } from './Diorama';
import { RoleMark, roleProps, TeiLogo } from './shared';
import { EdisiKhusus } from './EdisiKhusus';
import { GuessScreen, YearScreen } from './MainScreens';
import { formatSeconds, storage, useClockOffset, useRoomSocket, useSecondsLeft } from './socket';

// The projected main screen. Before the game it doubles as the team console (room code, QR,
// drag-and-drop teams); once the game runs, facilitator controls live in the K overlay.

const hostKey = (code: string) => `tei:host:${code}`;
const codeFromUrl = () => new URLSearchParams(location.search).get('r')?.toUpperCase() ?? '';

export function Host() {
  const [code, setCode] = useState(codeFromUrl);
  const token = code ? storage.get(hostKey(code)) : null;

  if (!code || !token) {
    return <CreateRoom onCreated={(newCode, hostToken) => {
      storage.set(hostKey(newCode), hostToken);
      history.replaceState(null, '', `/host?r=${newCode}`);
      setCode(newCode);
    }} />;
  }
  return <HostRoom code={code} token={token} onLost={() => { storage.remove(hostKey(code)); history.replaceState(null, '', '/host'); setCode(''); }} />;
}

function CreateRoom({ onCreated }: { onCreated: (code: string, hostToken: string) => void }) {
  const [oknum, setOknum] = useState(false);
  const [santai, setSantai] = useState(false);
  const [latihan, setLatihan] = useState(true);
  const [kuis, setKuis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oknum, latihan, kuis, tempo: santai ? 'santai' : 'normal' }) });
      const body = (await res.json()) as { code?: string; hostToken?: string; message?: string };
      if (!res.ok || !body.code || !body.hostToken) throw new Error(body.message ?? 'Ruangan gagal dibuat.');
      onCreated(body.code, body.hostToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ruangan gagal dibuat.');
      setBusy(false);
    }
  };

  return (
    <main className="host center">
      <header className="masthead">
        <TeiLogo />
        <h1>Buka ruangan <span className="accent-serif">baru.</span></h1>
      </header>
      <div className="create-cast" aria-hidden="true">
        {ROLES.map(role => <Portrait key={role} role={role} className="cast-face" />)}
      </div>
      <p className="lead create-lead">Lima tim memerintah satu negara selama lima tahun. Siapkan proyektor, lalu pilih cara bermain kelas ini.</p>
      <label className="check">
        <input type="checkbox" checked={oknum} onChange={e => setOknum(e.target.checked)} />
        <span><strong>Mode Oknum.</strong> Satu tim diam-diam bermain untuk membuat negara kolaps.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={latihan} onChange={e => setLatihan(e.target.checked)} />
        <span><strong>Tahun 0 latihan.</strong> Satu putaran terpandu 3 menit setelah briefing, di negara simulasi yang hasilnya dibuang.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={kuis} onChange={e => setKuis(e.target.checked)} />
        <span><strong>Kuis pra/pasca.</strong> Lima soal di HP sebelum bermain dan di akhir debrief, untuk mengukur pemahaman kelas.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={santai} onChange={e => setSantai(e.target.checked)} />
        <span><strong>Tempo Santai.</strong> Semua fase 50% lebih lama, untuk kelas yang butuh waktu baca lebih panjang.</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary" onClick={create} disabled={busy}>{busy ? 'Membuka…' : 'Buka ruangan'}</button>
    </main>
  );
}

function HostRoom({ code, token, onLost }: { code: string; token: string; onLost: () => void }) {
  const [view, setView] = useState<HostView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const clock = useClockOffset();
  const [consoleOpen, setConsoleOpen] = useConsoleToggle();

  const onMessage = (message: ServerMessage) => {
    if (message.t === 'host-state') {
      clock.sync(message.now);
      setView(message.view);
    } else if (message.t === 'error') {
      if (message.code === 'ruangan-tidak-ada' || message.code === 'bukan-host') onLost();
      else setNotice(message.message);
    }
  };
  const { status, send } = useRoomSocket((): ClientMessage => ({ t: 'host', code, token }), onMessage, true);
  const printing = new URLSearchParams(location.search).get('cetak') === 'edisi';
  // The print tab stays silent; only the projected screen plays sound (GDD, "Audio").
  useHostAudio(view, clock.now, !printing);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  if (!view) return <main className="host center">Menghubungkan ke ruangan {code}…</main>;
  if (printing) return <EdisiKhusus view={view} />;

  return (
    <main className="host">
      {status !== 'terhubung' && <p className="banner" role="status">Koneksi server putus. Menyambung ulang…</p>}
      {notice && <p className="banner warn" role="alert">{notice}</p>}
      {view.phase === 'gabung' && <Lobby view={view} send={send} />}
      {view.phase === 'briefing' && <Briefing view={view} send={send} now={clock.now} />}
      {view.phase === 'tahun' && <YearScreen view={view} now={clock.now} />}
      {view.phase === 'tebak' && <GuessScreen view={view} now={clock.now} />}
      {view.phase === 'selesai' && view.debrief && <DebriefScreen view={view} send={send} consoleOpen={consoleOpen} />}
      {view.phase !== 'gabung' && (
        <button className="console-toggle" onClick={() => setConsoleOpen(!consoleOpen)} aria-expanded={consoleOpen}>
          Konsol <kbd>K</kbd>
        </button>
      )}
      {consoleOpen && <Console view={view} send={send} onClose={() => setConsoleOpen(false)} />}
    </main>
  );
}

function JoinPanel({ code }: { code: string }) {
  const url = `${location.origin}/?r=${code}`;
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    void import('qrcode').then(QR => QR.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1a1a1a', light: '#ffffff' } }))
      .then(markup => { if (live) setSvg(markup); });
    return () => { live = false; };
  }, [url]);
  const localOnly = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  return (
    <section className="join-panel">
      <div className="qr" role="img" aria-label={`Kode QR menuju ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <p className="kicker">Pindai QR atau buka</p>
        <p className="join-url">{location.host}</p>
        <p className="kicker">lalu masukkan kode</p>
        <p className="room-code" aria-label={`Kode ruangan ${code.split('').join(' ')}`}>{code}</p>
        {localOnly && (
          <p className="error small">Halaman ini dibuka lewat localhost, jadi HP tidak bisa menjangkaunya. Buka lewat alamat jaringan laptop (mis. http://192.168.1.10:5173/host).</p>
        )}
      </div>
    </section>
  );
}

function Lobby({ view, send }: { view: HostView; send: (m: ClientMessage) => void }) {
  const connected = view.players.filter(p => p.connected).length;
  return (
    <>
      <div className="lobby-top">
        <JoinPanel code={view.code} />
        <section className="console">
          <p className="count"><strong>{view.players.length}</strong> pemain · {connected} terhubung</p>
          <QuizCount view={view} stage="pra" />
          {view.options.oknum && <p className="badge">Mode Oknum aktif</p>}
          <div className="row">
            <button className="btn" onClick={() => send({ t: 'assign', mode: 'acak' })} disabled={!view.players.length}>Bagi acak</button>
            <button className="btn" onClick={() => send({ t: 'assign', mode: 'seimbang' })} disabled={!view.players.length}>Bagi seimbang</button>
          </div>
          <p className="muted small">Seret nama ke tim lain, atau pakai menu di setiap nama. Bagi seimbang mempertahankan tim yang sudah diatur.</p>
          <button className="btn primary" onClick={() => send({ t: 'startBriefing' })} disabled={!view.players.length}>Mulai briefing peran</button>
          <p className="muted small">Pemain tanpa tim akan dimasukkan ke tim terkecil. Tim tanpa anggota dimainkan lewat konsol fasilitator.</p>
          <AvControls compact />
        </section>
      </div>
      <Teams view={view} editable send={send} />
    </>
  );
}

function Briefing({ view, send, now }: { view: HostView; send: (m: ClientMessage) => void; now: () => number }) {
  const seconds = useSecondsLeft(view.phaseEndsAt, now);
  return (
    <>
      <section className="center briefing">
        <p className="kicker">Briefing peran</p>
        <p className="big-timer" aria-live="off">{seconds !== null ? formatSeconds(seconds) : '–'}</p>
        <p className="lead">Baca kartu peran dan agenda rahasia timmu di HP. Jangan perlihatkan ke tim lain.</p>
        <QuizCount view={view} stage="pra" />
        {view.stats && <Diorama stats={view.stats} />}
        <div className="row">
          <ClockControls view={view} send={send} />
          {view.options.latihan ? (
            <>
              <button className="btn primary" onClick={() => send({ t: 'begin', practice: true })}>Mulai Tahun 0 (latihan)</button>
              <button className="btn" onClick={() => send({ t: 'begin', practice: false })}>Lewati latihan</button>
            </>
          ) : (
            <button className="btn primary" onClick={() => send({ t: 'begin', practice: false })}>Mulai Tahun 1</button>
          )}
        </div>
      </section>
      <Teams view={view} />
    </>
  );
}

function Teams({ view, editable = false, send }: { view: HostView; editable?: boolean; send?: (m: ClientMessage) => void }) {
  const [dragOver, setDragOver] = useState<Role | 'none' | null>(null);
  const dragged = useRef<string | null>(null);
  const columns: (Role | null)[] = editable ? [...ROLES, null] : [...ROLES];

  const drop = (role: Role | null) => (event: DragEvent) => {
    event.preventDefault();
    setDragOver(null);
    const id = dragged.current ?? event.dataTransfer.getData('text/plain');
    if (id) send?.({ t: 'move', playerId: id, role });
    dragged.current = null;
  };

  return (
    <section className="teams" aria-label="Tim">
      {columns.map(role => {
        const members = view.players.filter(p => p.role === role);
        if (role === null && !members.length) return null;
        const key = role ?? 'none';
        return (
          <div
            key={key}
            className={`team${dragOver === key ? ' drag-over' : ''}`}
            {...(role ? roleProps(role) : {})}
            onDragOver={editable ? e => { e.preventDefault(); setDragOver(key); } : undefined}
            onDragLeave={editable ? () => setDragOver(null) : undefined}
            onDrop={editable ? drop(role) : undefined}
          >
            {role && <Portrait role={role} className="team-portrait" />}
            <h2>
              {role && <RoleMark role={role} small />}
              {role ? ROLE_LABEL[role] : 'Belum dapat tim'}
              <span className="muted"> · {members.length}</span>
            </h2>
            {role && view.offlineRoles.includes(role) && <p className="muted small">Dimainkan lewat konsol fasilitator</p>}
            <ul className="chips">
              {members.map(p => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  spokesperson={!!role && view.spokespeople[role] === p.id}
                  editable={editable}
                  send={send}
                  onDragStart={() => { dragged.current = p.id; }}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function PlayerChip({ player, spokesperson, editable, send, onDragStart }: {
  player: PlayerSummary;
  spokesperson: boolean;
  editable: boolean;
  send?: (m: ClientMessage) => void;
  onDragStart: () => void;
}) {
  return (
    <li
      className={`chip${player.connected ? '' : ' offline'}`}
      draggable={editable}
      onDragStart={editable ? e => { e.dataTransfer.setData('text/plain', player.id); onDragStart(); } : undefined}
    >
      <span className="dot" aria-hidden="true" />
      <span className="name">{player.nickname}</span>
      {spokesperson && <span className="tag" title="Juru Bicara tahun ini">Jubir</span>}
      {!player.connected && <span className="sr-only">(terputus)</span>}
      {editable && send && (
        <span className="controls">
          <select
            aria-label={`Pindahkan ${player.nickname}`}
            value={player.role ?? ''}
            onChange={e => send({ t: 'move', playerId: player.id, role: (e.target.value || null) as Role | null })}
          >
            <option value="">Tanpa tim</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button
            className="icon-btn"
            aria-label={`Keluarkan ${player.nickname}`}
            onClick={() => { if (confirm(`Keluarkan ${player.nickname} dari ruangan?`)) send({ t: 'kick', playerId: player.id }); }}
          >
            ×
          </button>
        </span>
      )}
    </li>
  );
}
