import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ROLE_COLOR, ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type AgendaId, type Decision, type Role } from '../../engine/src/types';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';
import type { PlayerView } from '../../room/src/views';
import { DecisionForm } from './DecisionForm';
import { Board, HoldButton, RoleMark, RoleName, Timer } from './shared';
import { storage, useClockOffset, useRoomSocket } from './socket';
import { COLLAPSE_LABEL, ENDING_LABEL, STEP_LABEL, signed } from './text';

type Session = { code: string; nickname?: string; token?: string };
type Send = (message: ClientMessage) => void;

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
  const [notice, setNotice] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const clock = useClockOffset();
  const lastStep = useRef<string | null>(null);

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
      case 'player-state': {
        clock.sync(message.now);
        // Buzz when the phase changes, so phones on the desk call attention (GDD, "UX/UI").
        const step = `${message.view.phase}/${message.view.step}`;
        if (lastStep.current && lastStep.current !== step) navigator.vibrate?.(60);
        lastStep.current = step;
        setView(message.view);
        break;
      }
      case 'kicked':
        if (sessionRef.current) storage.remove(tokenKey(sessionRef.current.code));
        setKicked(true);
        break;
      case 'error':
        if (!view || message.code === 'token-salah' || message.code === 'ruangan-tidak-ada') {
          if (sessionRef.current) storage.remove(tokenKey(sessionRef.current.code));
          setSession(null);
          setView(null);
          setError(message.message);
        } else {
          setNotice(message.message);
        }
        break;
    }
  };

  const { status, send } = useRoomSocket(hello, onMessage, !!session && !kicked);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

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
    <main className="phone" style={view.team ? { ['--role' as string]: ROLE_COLOR[view.team.role] } : undefined}>
      {status !== 'terhubung' && <p className="banner" role="status">{status === 'terputus' ? 'Sinyal putus. Menyambung ulang…' : 'Menghubungkan…'}</p>}
      {notice && <p className="banner warn" role="alert">{notice}</p>}
      <PhoneHeader view={view} now={clock.now} />
      <PhoneBody view={view} send={send} />
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

function PhoneHeader({ view, now }: { view: PlayerView; now: () => number }) {
  if (!view.team) return null;
  const title = view.phase === 'tahun' && view.step ? `Tahun ${view.year} · ${STEP_LABEL[view.step]}` : view.phase === 'briefing' ? 'Briefing peran' : view.phase === 'tebak' ? 'Tebak agenda' : view.phase === 'selesai' ? 'Hasil akhir' : `Ruangan ${view.code}`;
  return (
    <header className="phone-head">
      <RoleMark role={view.team.role} />
      <div className="phone-head-text">
        <strong>{view.team.label}</strong>
        <span className="muted small">{title}</span>
      </div>
      <Timer endsAt={view.phaseEndsAt} pausedMs={view.pausedMs} now={now} />
    </header>
  );
}

function PhoneBody({ view, send }: { view: PlayerView; send: Send }) {
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

  const members = (
    <section>
      <h3 className="label">Anggota tim</h3>
      <ul className="members">
        {team.members.map(name => (
          <li key={name} aria-current={name === view.me.nickname ? 'true' : undefined}>{name}{name === team.spokesperson ? ' · Jubir' : ''}</li>
        ))}
      </ul>
    </section>
  );

  const agenda = team.agenda && (
    <details className="agenda" open={view.phase === 'briefing'}>
      <summary>Agenda rahasia: {team.agenda.name}</summary>
      <p>{team.agenda.description}</p>
      <p className="muted small">Jangan tunjukkan layar ini ke tim lain.</p>
    </details>
  );

  const resource = team.resource && (
    <p className="resource">
      {team.resource.label} timmu: <strong>{team.resource.value}</strong>
      {team.resource.change ? <span className={`delta ${team.resource.change > 0 ? 'up' : 'down'}`}> {signed(team.resource.change)}</span> : null}
      <span className="muted small"> · hanya terlihat di HP timmu</span>
    </p>
  );

  if (view.phase === 'gabung') {
    return (
      <section className="stack">
        {members}
        <p className="muted">Tim masih bisa berubah. Tunggu fasilitator memulai briefing.</p>
      </section>
    );
  }

  if (view.phase === 'briefing') {
    return (
      <section className="stack">
        {view.me.isSpokesperson && <p className="badge">Kamu Juru Bicara tahun 1: kamu yang mengesahkan keputusan tim dan membuat pakta.</p>}
        {agenda}
        {resource}
        {members}
      </section>
    );
  }

  if (view.phase === 'tebak') return <FinalScreen view={view} send={send} />;
  if (view.phase === 'selesai') return <ResultsScreen view={view} />;

  // A year in progress.
  return (
    <section className="stack">
      {view.me.isSpokesperson && view.step !== 'pengungkapan' && view.step !== 'koran' && <p className="badge">Kamu Juru Bicara tahun {view.year}.</p>}
      {view.crisis && view.step === 'krisis' && <CrisisCard view={view} />}
      {view.decision && <DecideScreen key={`${view.year}`} view={view} send={send} />}
      {view.step === 'krisis' && view.decision === null && <HandPreview view={view} />}
      {(view.step === 'pengungkapan' || view.step === 'koran') && <RevealMine view={view} />}
      {resource}
      {agenda}
    </section>
  );
}

function CrisisCard({ view }: { view: PlayerView }) {
  const crisis = view.crisis!;
  return (
    <article className="crisis-mini">
      {view.pemilu && view.stats && <p className="badge">Tahun pemilu. Survei Kepercayaan Publik: {view.stats.kepercayaan} dari 10.</p>}
      <p className="kicker">Krisis tahun {view.year}</p>
      <h2>{crisis.title}</h2>
      <p>{crisis.ruleText}</p>
      <p className="muted small">Lihat layar utama. Rapat Tim dimulai sebentar lagi.</p>
    </article>
  );
}

function HandPreview({ view }: { view: PlayerView }) {
  return view.stats ? <Board stats={view.stats} compact /> : null;
}

function DecideScreen({ view, send }: { view: PlayerView; send: Send }) {
  const ctx = view.decision!;
  const [tab, setTab] = useState<'keputusan' | 'pakta'>('keputusan');
  const [draft, setDraft] = useState<Decision>(ctx.myProposal ?? ctx.majority);
  const submitted = !!ctx.myProposal;
  const isSpokesperson = view.me.isSpokesperson;

  const change = (decision: Decision) => {
    setDraft(decision);
    send({ t: 'propose', decision });
  };

  if (ctx.locked) {
    return (
      <section className="stack">
        <div className="stamp" role="status">SAH</div>
        <p className="lead">Keputusan tim sudah {ctx.locked.source === 'fasilitator' ? 'diputuskan fasilitator' : 'disahkan'}.</p>
        <p className="muted">Tunggu pengungkapan di layar utama.</p>
        {view.step === 'lobi' && <PactPanel view={view} send={send} />}
      </section>
    );
  }

  return (
    <section className="stack">
      {view.step === 'lobi' && (
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'keputusan'} className={tab === 'keputusan' ? 'on' : ''} onClick={() => setTab('keputusan')}>Keputusan</button>
          <button role="tab" aria-selected={tab === 'pakta'} className={tab === 'pakta' ? 'on' : ''} onClick={() => setTab('pakta')}>Pakta</button>
        </div>
      )}
      {view.step === 'lobi' && tab === 'pakta' ? (
        <PactPanel view={view} send={send} />
      ) : (
        <>
          <p className="muted small">
            {ctx.proposers} dari {ctx.members} anggota sudah memilih. Angka di samping pilihan adalah jumlah suara.
            {view.step === 'pengesahan' ? ' Jika Juru Bicara tidak mengesahkan sampai waktu habis, pilihan terbanyak yang dipakai.' : ''}
          </p>
          <DecisionForm ctx={ctx} value={draft} onChange={change} />
          {!submitted && <button className="btn" onClick={() => change(draft)}>Pilih ini</button>}
          {submitted && <p className="muted small">Pilihanmu terkirim. Kamu masih bisa mengubahnya.</p>}
          {view.step === 'pengesahan' && isSpokesperson && (
            <div className="stack sah-box">
              <button className="btn" onClick={() => change(ctx.majority)}>Pakai pilihan terbanyak</button>
              <HoldButton label="Tahan untuk SAH" onConfirm={() => send({ t: 'lock', decision: draft })} />
            </div>
          )}
          {view.step === 'pengesahan' && !isSpokesperson && <p className="muted">Menunggu Juru Bicara ({view.team!.spokesperson}) mengesahkan.</p>}
        </>
      )}
    </section>
  );
}

function PactPanel({ view, send }: { view: PlayerView; send: Send }) {
  const role = view.team!.role;
  const lobby = view.lobby;
  const isSpokesperson = view.me.isSpokesperson;
  const partners = ROLES.filter(r => r !== role);
  const [to, setTo] = useState<Role>(partners[0]!);
  const [mine, setMine] = useState('');
  const [theirs, setTheirs] = useState('');
  const myTerms = lobby?.terms[role] ?? [];
  const theirTerms = lobby?.terms[to] ?? [];
  const live = view.pacts.filter(p => p.status === 'diajukan' || p.status === 'disepakati');

  return (
    <section className="stack">
      <h3 className="label">Pakta tahun ini</h3>
      {!view.pacts.length && <p className="muted small">Belum ada pakta. Pakta adalah janji dua arah yang dicek setelah pengungkapan: +1 jika ditepati, −1 jika dilanggar.</p>}
      <ul className="pacts">
        {view.pacts.map(p => {
          const incoming = p.to === role && p.status === 'diajukan';
          const outgoing = p.from === role && p.status === 'diajukan';
          return (
            <li key={p.id} className={`pact ${p.status}`}>
              <p><RoleName role={p.from} />: {p.fromText}</p>
              <p><RoleName role={p.to} />: {p.toText}</p>
              <p className="muted small">{{ diajukan: incoming ? 'Menunggu jawaban timmu' : 'Menunggu jawaban', disepakati: 'Disepakati', ditolak: 'Ditolak', ditarik: 'Ditarik', kedaluwarsa: 'Kedaluwarsa' }[p.status]}</p>
              {isSpokesperson && incoming && (
                <div className="row">
                  <button className="btn primary" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: true })}>Sepakat</button>
                  <button className="btn" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: false })}>Tolak</button>
                </div>
              )}
              {isSpokesperson && outgoing && <button className="btn" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: false })}>Tarik</button>}
            </li>
          );
        })}
      </ul>

      {lobby && isSpokesperson && live.filter(p => p.from === role || p.to === role).length < lobby.maxPacts && (
        <form className="stack pact-form" onSubmit={e => {
          e.preventDefault();
          if (mine && theirs) send({ t: 'pactPropose', to, fromTerm: mine as never, toTerm: theirs as never });
          setMine('');
          setTheirs('');
        }}>
          <h3 className="label">Ajukan pakta</h3>
          <label className="field compact">
            <span>Dengan tim</span>
            <select value={to} onChange={e => { setTo(e.target.value as Role); setTheirs(''); }}>
              {partners.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <label className="field compact">
            <span>Timmu berjanji</span>
            <select value={mine} onChange={e => setMine(e.target.value)} required>
              <option value="">Pilih janji…</option>
              {myTerms.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
            </select>
          </label>
          <label className="field compact">
            <span>Asalkan {ROLE_LABEL[to]} berjanji</span>
            <select value={theirs} onChange={e => setTheirs(e.target.value)} required>
              <option value="">Pilih janji…</option>
              {theirTerms.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
            </select>
          </label>
          <button className="btn primary" disabled={!mine || !theirs}>Ajukan</button>
        </form>
      )}
      {lobby && !isSpokesperson && <p className="muted small">Hanya Juru Bicara ({view.team!.spokesperson}) yang bisa mengajukan dan menjawab pakta. Bantu ia bernegosiasi.</p>}
    </section>
  );
}

function RevealMine({ view }: { view: PlayerView }) {
  const mine = view.reveal?.teams.find(t => t.role === view.team!.role);
  const pacts = (view.reveal?.pacts ?? []).filter(p => p.from === view.team!.role || p.to === view.team!.role);
  return (
    <section className="stack">
      <p className="lead">{view.step === 'koran' ? 'Harian TEI sudah terbit. Lihat layar utama.' : 'Semua keputusan dibuka. Lihat layar utama.'}</p>
      {view.step === 'koran' && view.frontPage && <h2 className="headline-mini">{view.frontPage.headline}</h2>}
      {mine && (
        <div className="reveal-mine">
          <h3 className="label">Keputusan timmu</h3>
          <ul>{mine.lines.map(line => <li key={line}>{line}</li>)}</ul>
          {mine.cancelled && <p className="warn">Kartumu dibatalkan.</p>}
        </div>
      )}
      {pacts.map(p => {
        const kept = p.from === view.team!.role ? p.result?.keptFrom : p.result?.keptTo;
        return <p key={p.id} className={kept ? 'ok' : 'warn'}>Pakta dengan {ROLE_LABEL[p.from === view.team!.role ? p.to : p.from]}: timmu {kept ? 'menepati (+1)' : 'melanggar (−1)'}.</p>;
      })}
    </section>
  );
}

function FinalScreen({ view, send }: { view: PlayerView; send: Send }) {
  const final = view.final!;
  const [agendas, setAgendas] = useState<Partial<Record<Role, AgendaId>>>({});
  const [oknum, setOknum] = useState<Role | null>(null);
  const role = view.team!.role;

  if (final.mine) {
    return (
      <section className="stack">
        <div className="stamp" role="status">TERKIRIM</div>
        <p className="muted">Tebakan timmu sudah dikirim. Tunggu hasil di layar utama.</p>
      </section>
    );
  }

  if (!view.me.isSpokesperson) {
    return (
      <section className="stack">
        <p className="lead">Tebak agenda rahasia tim lain.</p>
        <p className="muted">Diskusikan dengan timmu. Juru Bicara ({view.team!.spokesperson}) yang mengirim tebakan: +1 untuk setiap tebakan benar{view.options.oknum ? ', dan Oknum terbongkar jika minimal 3 tim menunjuknya' : ''}.</p>
      </section>
    );
  }

  return (
    <form className="stack" onSubmit={e => { e.preventDefault(); send({ t: 'final', vote: { agendas, oknum } }); }}>
      <p className="lead">Tebak agenda tim lain</p>
      <p className="muted small">+1 untuk setiap tebakan benar. Boleh dikosongkan.</p>
      {(Object.keys(final.options) as Role[]).map(target => (
        <fieldset key={target} className="choice">
          <legend><RoleName role={target} /></legend>
          {final.options[target]!.map(option => (
            <label key={option.id} className={`guess${agendas[target] === option.id ? ' on' : ''}`}>
              <input type="radio" name={`guess-${target}`} checked={agendas[target] === option.id} onChange={() => setAgendas({ ...agendas, [target]: option.id as AgendaId })} />
              <span><strong>{option.name}</strong><br /><span className="small muted">{option.description}</span></span>
            </label>
          ))}
        </fieldset>
      ))}
      {view.options.oknum && (
        <label className="field compact">
          <span>Siapa Oknum yang ingin negara kolaps?</span>
          <select value={oknum ?? ''} onChange={e => setOknum((e.target.value || null) as Role | null)}>
            <option value="">Tidak menunjuk</option>
            {ROLES.filter(r => r !== role).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      )}
      <button className="btn primary">Kirim tebakan</button>
    </form>
  );
}

function ResultsScreen({ view }: { view: PlayerView }) {
  const results = view.results;
  if (!results) return null;
  const mine = results.teams.find(t => t.role === view.team!.role)!;
  const rank = [...results.teams].sort((a, b) => b.score - a.score).findIndex(t => t.role === mine.role) + 1;
  return (
    <section className="stack">
      <p className="kicker">{ENDING_LABEL[results.ending]}</p>
      {results.collapses.map(c => <p key={c} className="warn">{COLLAPSE_LABEL[c]}</p>)}
      <p className="big-score">{mine.score} <small>poin</small></p>
      <p className="muted">Peringkat {rank} dari 5</p>
      <ul className="breakdown">
        <li>Agenda {mine.agendaName}: {mine.achieved ? 'tercapai' : 'tidak tercapai'}</li>
        <li>Tebakan benar: {mine.correctGuesses}</li>
        <li>Pakta ditepati {mine.pactsKept}, dilanggar {mine.pactsBroken}</li>
      </ul>
      <p className="muted small">Diskusi lanjut dipandu fasilitator di layar utama.</p>
    </section>
  );
}
