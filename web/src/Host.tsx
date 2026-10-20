import { useEffect, useRef, useState, type DragEvent } from 'react';
import { LATEST_PACK, PACK_CHOICES } from '../../engine/src/content/packList';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type Role } from '../../engine/src/types';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';
import type { HostView, PlayerSummary } from '../../room/src/views';
import { useHostAudio } from './audio/useHostAudio';
import { AvControls, Console, useConsoleToggle } from './Console';
import { DebriefScreen } from './Debrief';
import { QuizCount } from './Quiz';
import { Portrait } from './art';
import { Diorama } from './Diorama';
import { ReactionLayer, useReactionLayer } from './Reactions';
import { RoleMark, roleProps, StepAnnouncer, TeiLogo } from './shared';
import { whereLabel } from './text';
import { EdisiKhusus } from './EdisiKhusus';
import { GuessScreen, TopBar, YearScreen } from './MainScreens';
import { storage, useClockOffset, useRoomSocket } from './socket';

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
  const [mode, setMode] = useState<'pemula' | 'lanjutan'>('pemula');
  const [crisisPack, setCrisisPack] = useState(LATEST_PACK);
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
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, crisisPack, oknum, latihan, kuis, tempo: santai ? 'santai' : 'normal' }) });
      const body = (await res.json()) as { code?: string; hostToken?: string; message?: string };
      if (!res.ok || !body.code || !body.hostToken) throw new Error(body.message ?? 'Ruangan gagal dibuat.');
      onCreated(body.code, body.hostToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ruangan gagal dibuat.');
      setBusy(false);
    }
  };

  return (
    <main className="host items-center">
      <div className="flex w-full max-w-form flex-col items-center gap-6 py-10 text-center">
        <TeiLogo />
        <h1>Buka ruangan <span className="accent-serif">baru.</span></h1>
        <div className="create-cast" aria-hidden="true">
          {ROLES.map(role => <Portrait key={role} role={role} className="cast-face" />)}
        </div>
        <p className="lead">Lima tim memerintah satu negara selama lima tahun. Siapkan proyektor, lalu pilih cara bermain kelas ini.</p>
      </div>
      <div className="flex w-full max-w-form flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="kicker">Tingkat kesulitan</legend>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'pemula'} onChange={() => setMode('pemula')} />
          <span><strong>Pemula.</strong> Setiap krisis memberi tiap tim tiga pilihan respons dengan akibat yang tertulis jelas. Satu ketukan per tim. Cocok untuk kelas pertama.</span>
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'lanjutan'} onChange={() => setMode('lanjutan')} />
          <span><strong>Lanjutan.</strong> Kartu kebijakan, pilihan kebijakan tiap peran (pajak, bunga, harga, upah, konsumsi), kekuatan khusus, dan tebak agenda di akhir.</span>
        </label>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="kicker">Paket krisis</legend>
        {PACK_CHOICES.map(pack => (
          <label key={pack.id} className="check">
            <input type="radio" name="crisisPack" checked={crisisPack === pack.id} onChange={() => setCrisisPack(pack.id)} />
            <span><strong>{pack.title}.</strong> {pack.blurb}</span>
          </label>
        ))}
      </fieldset>
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
        <span><strong>Tempo Santai.</strong> Rapat, Negosiasi dan Pengesahan 50% lebih lama, untuk kelas yang butuh waktu baca lebih panjang.</span>
      </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <button className="btn primary big mt-3" onClick={create} disabled={busy}>{busy ? 'Membuka…' : 'Buka ruangan'}</button>
      </div>
    </main>
  );
}

function HostRoom({ code, token, onLost }: { code: string; token: string; onLost: () => void }) {
  const [view, setView] = useState<HostView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const clock = useClockOffset();
  const [consoleOpen, setConsoleOpen] = useConsoleToggle();
  const reactions = useReactionLayer();

  const onMessage = (message: ServerMessage) => {
    if (message.t === 'reaction') {
      reactions.push(message.kind, message.role);
    } else if (message.t === 'host-state') {
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

  if (!view) return <main className="host items-center justify-center">Menghubungkan ke ruangan {code}…</main>;
  if (printing) return <EdisiKhusus view={view} />;

  return (
    <main className="host">
      {status !== 'terhubung' && <p className="banner" role="status">Koneksi server putus. Menyambung ulang…</p>}
      {notice && <p className="banner warn" role="alert">{notice}</p>}
      <StepAnnouncer label={whereLabel(view)} />
      <ReactionLayer floating={reactions.floating} counts={reactions.counts} />
      {view.phase === 'gabung' && <Lobby view={view} send={send} />}
      {view.phase === 'briefing' && <Briefing view={view} send={send} />}
      {view.phase === 'tahun' && <YearScreen view={view} now={clock.now} send={send} />}
      {view.phase === 'tebak' && <GuessScreen view={view} now={clock.now} send={send} />}
      {view.phase === 'selesai' && view.debrief && <DebriefScreen view={view} send={send} consoleOpen={consoleOpen} />}
      {view.phase !== 'gabung' && (
        <button className="console-toggle" onClick={() => setConsoleOpen(!consoleOpen)} aria-expanded={consoleOpen}>
          Konsol <kbd>K</kbd>
        </button>
      )}
      <Console view={view} send={send} open={consoleOpen} onOpenChange={setConsoleOpen} />
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
      <div className="flex flex-col gap-2">
        <p className="kicker">Pindai QR atau buka</p>
        <p className="join-url">{location.host}</p>
        <p className="kicker mt-3">lalu masukkan kode</p>
        <p className="room-code" aria-label={`Kode ruangan ${code.split('').join(' ')}`}>{code}</p>
        {localOnly && (
          <p className="text-xs text-danger">Halaman ini dibuka lewat localhost, jadi HP tidak bisa menjangkaunya. Buka lewat alamat jaringan laptop (mis. http://192.168.1.10:5173/host).</p>
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
        <section className="card gap-4 p-5">
          <p className="count"><strong>{view.players.length}</strong> pemain · {connected} terhubung</p>
          <QuizCount view={view} stage="pra" />
          <p className="badge">{view.options.mode === 'lanjutan' ? 'Lanjutan' : 'Pemula'}</p>
          <p className="badge">{PACK_CHOICES.find(pack => pack.id === (view.options.crisisPack ?? 'klasik'))?.title ?? 'Klasik'}</p>
          {view.options.oknum && <p className="badge">Mode Oknum aktif</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => send({ t: 'assign', mode: 'acak' })} disabled={!view.players.length}>Bagi acak</button>
            <button className="btn" onClick={() => send({ t: 'assign', mode: 'seimbang' })} disabled={!view.players.length}>Bagi seimbang</button>
          </div>
          <p className="text-xs text-muted">Seret nama ke tim lain, atau pakai menu di setiap nama. Bagi seimbang mempertahankan tim yang sudah diatur.</p>
          <button className="btn primary" onClick={() => send({ t: 'startBriefing' })} disabled={!view.players.length}>Mulai briefing peran</button>
          <p className="text-xs text-muted">Pemain tanpa tim akan dimasukkan ke tim terkecil. Tim tanpa anggota dimainkan lewat konsol fasilitator.</p>
          <AvControls compact />
        </section>
      </div>
      <Teams view={view} editable send={send} />
    </>
  );
}

function Briefing({ view, send }: { view: HostView; send: (m: ClientMessage) => void }) {
  return (
    <>
      <TopBar view={view} now={Date.now} />
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="kicker">Sebelum Tahun 1</p>
          <h1 className="chapter-question">Baca kartu peranmu.</h1>
          <p className="chapter-hint">Kartu peran dan agenda rahasia timmu ada di HP. Jangan perlihatkan ke tim lain. Mulai kalau semua tim sudah membaca.</p>
          <QuizCount view={view} stage="pra" />
          <div className="flex flex-wrap gap-3">
            {view.options.latihan ? (
              <>
                <button className="btn primary big" onClick={() => send({ t: 'begin', practice: true })}>Mulai Tahun 0 (latihan)</button>
                <button className="btn big" onClick={() => send({ t: 'begin', practice: false })}>Lewati latihan</button>
              </>
            ) : (
              <button className="btn primary big" onClick={() => send({ t: 'begin', practice: false })}>Mulai Tahun 1</button>
            )}
          </div>
        </div>
        {view.stats && <Diorama stats={view.stats} />}
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
            className={`team${role ? ' role-card' : ''}${dragOver === key ? ' drag-over' : ''}`}
            {...(role ? roleProps(role) : {})}
            onDragOver={editable ? e => { e.preventDefault(); setDragOver(key); } : undefined}
            onDragLeave={editable ? () => setDragOver(null) : undefined}
            onDrop={editable ? drop(role) : undefined}
          >
            {role && <Portrait role={role} className="team-portrait" />}
            <h2 className="flex items-center gap-2 text-sm">
              {role && <RoleMark role={role} small />}
              {role ? ROLE_LABEL[role] : 'Belum dapat tim'}
              <span className="font-regular text-muted">· {members.length}</span>
            </h2>
            {role && view.offlineRoles.includes(role) && <p className="text-xs text-muted">Dimainkan lewat konsol fasilitator</p>}
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
      {spokesperson && <span className="tag" title="Jubir tahun ini">Jubir</span>}
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
