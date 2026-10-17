import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type AgendaId, type Decision, type Role } from '../../engine/src/types';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';
import type { PlayerView } from '../../room/src/views';
import { DecisionForm } from './DecisionForm';
import { QuizForm, QuizMine } from './Quiz';
import { ROLE_BRIEF } from '../../engine/src/content/briefs';
import { CrisisArt, Portrait } from './art';
import { Concepts, Glossed } from './Glossary';
import { SurveyForm, SurveyThanks } from './Survey';
import { useHaptics } from './haptics';
import { Board, HoldButton, RoleMark, RoleName, TeiLogo, Timer, roleProps } from './shared';
import { storage, useClockOffset, useRoomSocket } from './socket';
import { COLLAPSE_LABEL, ENDING_LABEL, INDICATOR_LABEL as STAT_NAME, PRACTICE_COACH, STEP_LABEL, signed } from './text';

const YEAR_STEPS = ['krisis', 'rapat', 'lobi', 'pengesahan', 'pengungkapan', 'koran'] as const;

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
  useHaptics(view);
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
      case 'player-state': {
        clock.sync(message.now);
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
    <main className="phone" {...(view.team ? roleProps(view.team.role) : {})}>
      {status !== 'terhubung' && <p className="banner" role="status">{status === 'terputus' ? 'Sinyal putus. Menyambung ulang…' : 'Menghubungkan…'}</p>}
      {notice && <p className="banner warn" role="alert">{notice}</p>}
      <PhoneShell view={view} send={send} now={clock.now} />
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
        <TeiLogo />
        <h1>Masuk <span className="accent-serif">ruangan.</span></h1>
      </header>
      <Cast />
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

type PhoneTab = 'sekarang' | 'tim' | 'negara';
const PHONE_TABS: { id: PhoneTab; label: string }[] = [
  { id: 'sekarang', label: 'Sekarang' },
  { id: 'tim', label: 'Timku' },
  { id: 'negara', label: 'Negara' },
];

/**
 * The phone in three places: what to do now, the team's own cards (role, secret agenda, private
 * number) and the country's state. The task always comes first; reference material waits one tap
 * away instead of piling up under the form. A new phase brings the player back to "Sekarang".
 */
function PhoneShell({ view, send, now }: { view: PlayerView; send: Send; now: () => number }) {
  const [tab, setTabState] = useState<PhoneTab>('sekarang');
  // A tab opens at its top, not where the last one was scrolled to.
  const setTab = (next: PhoneTab) => { setTabState(next); window.scrollTo({ top: 0 }); };
  const phaseKey = `${view.phase}:${view.year}:${view.step}`;
  useEffect(() => { setTabState('sekarang'); }, [phaseKey]);
  const withTabs = !!view.team && view.phase !== 'gabung';
  return (
    <>
      <PhoneHeader view={view} now={now} />
      <div className={withTabs ? 'phone-page with-nav' : 'phone-page'}>
        {(!withTabs || tab === 'sekarang') && <PhoneBody view={view} send={send} />}
        {withTabs && tab === 'tim' && <TeamTab view={view} />}
        {withTabs && tab === 'negara' && <CountryTab view={view} />}
      </div>
      {withTabs && (
        <nav className="phone-nav" aria-label="Bagian layar">
          {PHONE_TABS.map(t => (
            <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

/** Where the year stands: six steps, the current one marked, so a phone always says "you are here". */
function StepRail({ view }: { view: PlayerView }) {
  if (view.phase !== 'tahun' || !view.step) return null;
  const at = YEAR_STEPS.indexOf(view.step);
  return (
    <ol className="step-rail" aria-label={`Langkah ${at + 1} dari ${YEAR_STEPS.length}: ${STEP_LABEL[view.step]}`}>
      {YEAR_STEPS.map((step, i) => <li key={step} className={i < at ? 'done' : i === at ? 'now' : ''} aria-hidden="true" />)}
    </ol>
  );
}

function PhoneHeader({ view, now }: { view: PlayerView; now: () => number }) {
  if (!view.team) return null;
  const title = view.phase === 'tahun' && view.step ? `${view.practice ? 'Latihan' : `Tahun ${view.year}`} · ${STEP_LABEL[view.step]}` : view.phase === 'briefing' ? 'Briefing peran' : view.phase === 'tebak' ? 'Tebak agenda' : view.phase === 'selesai' ? 'Debrief' : `Ruangan ${view.code}`;
  return (
    <header className="phone-head">
      <div className="phone-head-row">
        <RoleMark role={view.team.role} />
        <div className="phone-head-text">
          <strong>{view.team.label}</strong>
          <span className="small">{title}{view.me.isSpokesperson && <span className="jubir-chip">Jubir</span>}</span>
        </div>
        <Timer endsAt={view.phaseEndsAt} pausedMs={view.pausedMs} now={now} />
      </div>
      <StepRail view={view} />
    </header>
  );
}

/** The team's own cards: private number, secret agenda, what the role controls, who is in it. */
function TeamTab({ view }: { view: PlayerView }) {
  const team = view.team!;
  return (
    <section className="stack">
      {team.resource && <Resource resource={team.resource} />}
      {team.agenda && (
        <div className="agenda">
          <p className="label">Agenda rahasia</p>
          <h3>{team.agenda.name}</h3>
          <p>{team.agenda.description}</p>
          <p className="muted small">Jangan tunjukkan layar ini ke tim lain.</p>
        </div>
      )}
      <RoleBriefCard role={team.role} open />
      <Members view={view} />
    </section>
  );
}

/** The country as the main screen shows it, for a player who cannot see the projector well. */
function CountryTab({ view }: { view: PlayerView }) {
  const agreed = view.pacts.filter(p => p.status === 'disepakati');
  return (
    <section className="stack">
      {view.stats ? <Board stats={view.stats} /> : <p className="muted">Negara belum berjalan.</p>}
      {view.crisis && (
        <div className="country-crisis">
          <p className="label">Krisis tahun {view.year}</p>
          <h3>{view.crisis.title}</h3>
          <p className="small">{view.crisis.ruleText}</p>
        </div>
      )}
      {agreed.length > 0 && (
        <div>
          <p className="label">Pakta yang disepakati</p>
          <ul className="pacts">
            {agreed.map(p => (
              <li key={p.id} className="pact disepakati">
                <p><RoleName role={p.from} />: {p.fromText}</p>
                <p><RoleName role={p.to} />: {p.toText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Resource({ resource }: { resource: NonNullable<NonNullable<PlayerView['team']>['resource']> }) {
  return (
    <p className="resource">
      <span>{resource.label} timmu</span>
      <strong>{resource.value}</strong>
      {resource.change ? <span className={`delta ${resource.change > 0 ? 'up' : 'down'}`}>{signed(resource.change)}</span> : null}
      <span className="muted small">Hanya terlihat di HP timmu</span>
    </p>
  );
}

function Members({ view }: { view: PlayerView }) {
  const team = view.team!;
  return (
    <section>
      <h3 className="label">Anggota tim</h3>
      <ul className="members">
        {team.members.map(name => (
          <li key={name} aria-current={name === view.me.nickname ? 'true' : undefined}>{name}{name === team.spokesperson ? ' · Jubir' : ''}</li>
        ))}
      </ul>
    </section>
  );
}

/** One line on the task at hand, under the step's name (GDD, "Onboarding"). */
function TaskHead({ view }: { view: PlayerView }) {
  if (view.phase !== 'tahun' || !view.step) return null;
  const jubir = view.me.isSpokesperson;
  const locked = !!view.decision?.locked;
  const task: Record<string, string> = {
    krisis: 'Baca krisisnya. Apa dampaknya bagi timmu?',
    rapat: 'Pilih satu kartu dan atur tuas timmu. Suara terbanyak yang dipakai.',
    lobi: jubir ? 'Kamu Juru Bicara: buat dan jawab pakta dengan tim lain.' : 'Bantu Juru Bicara bernegosiasi. Kamu masih bisa mengubah pilihan.',
    pengesahan: locked ? 'Keputusan timmu sudah sah.' : jubir ? 'Kamu Juru Bicara: tahan tombol SAH untuk mengesahkan keputusan tim.' : `Tunggu Juru Bicara (${view.team?.spokesperson ?? '-'}) mengesahkan.`,
    pengungkapan: 'Lihat layar utama: keputusan semua tim dibuka.',
    koran: 'Harian TEI terbit. Lihat layar utama.',
  };
  return (
    <div className="task-head">
      <h2>{STEP_LABEL[view.step]}</h2>
      <p>{task[view.step]}</p>
    </div>
  );
}

function PhoneBody({ view, send }: { view: PlayerView; send: Send }) {
  const team = view.team;
  const quiz = view.myQuiz;
  const preQuiz = quiz?.open === 'pra' ? <QuizForm key="pra" quiz={quiz} send={send} /> : quiz?.done.pra && (view.phase === 'gabung' || view.phase === 'briefing') ? <p className="muted small">Kuis awal terkirim. Terima kasih.</p> : null;
  if (!team) {
    return (
      <section className="stack">
        <div className="center">
          <p className="kicker">Ruangan {view.code}</p>
          <p className="lead">Halo, {view.me.nickname}.</p>
          <p className="muted">Tunggu fasilitator membagi tim. Lihat layar utama.</p>
        </div>
        <Cast />
        {preQuiz}
        <HowToPlay />
      </section>
    );
  }

  if (view.phase === 'gabung') {
    return (
      <section className="stack">
        <Members view={view} />
        <p className="muted">Tim masih bisa berubah. Tunggu fasilitator memulai briefing.</p>
        {preQuiz}
      </section>
    );
  }

  if (view.phase === 'briefing') {
    // The task here is reading: who you are, what you secretly want, what you control.
    return (
      <section className="stack">
        <div className="briefing-hero">
          <Portrait role={team.role} />
          <div>
            <h2>Kamu {team.label}</h2>
            <p className="small">Baca kartumu sebelum Tahun 1 dimulai.</p>
          </div>
        </div>
        {view.me.isSpokesperson && <p className="badge">Kamu Juru Bicara tahun 1: kamu yang mengesahkan keputusan tim dan membuat pakta.</p>}
        {preQuiz}
        <TeamTab view={view} />
      </section>
    );
  }

  if (view.phase === 'tebak') return <FinalScreen view={view} send={send} />;
  if (view.phase === 'selesai') return <ResultsScreen view={view} send={send} />;

  // A year in progress.
  const coach = view.practice && view.step ? PRACTICE_COACH[view.step] : null;
  return (
    <section className="stack">
      <TaskHead view={view} />
      {coach && (
        <aside className="coach" role="note">
          <p className="label">Latihan · tidak dihitung</p>
          <p>{view.me.isSpokesperson && coach.spokesperson ? coach.spokesperson : coach.phone}</p>
        </aside>
      )}
      {view.crisis && view.step === 'krisis' && <CrisisCard view={view} />}
      {view.decision && <DecideScreen key={`${view.year}`} view={view} send={send} />}
      {(view.step === 'pengungkapan' || view.step === 'koran') && <RevealMine view={view} />}
    </section>
  );
}

/** The five roles as a row of caricatures: who is in this country. */
function Cast() {
  return (
    <figure className="cast" aria-label="Lima peran: Pemerintah, Bank Sentral, Pengusaha, Serikat Buruh, Masyarakat">
      {ROLES.map(role => <Portrait key={role} role={role} className="cast-face" />)}
      <figcaption className="muted small">Lima peran, satu negara, lima tahun.</figcaption>
    </figure>
  );
}

function HowToPlay() {
  return (
    <section className="how">
      <h2 className="label">Cara bermain</h2>
      <ol>
        <li><strong>Rapat dengan timmu.</strong> Pilih satu kartu kebijakan dan atur tuas peranmu di HP.</li>
        <li><strong>Lobi tim lain.</strong> Juru Bicara membuat pakta: janji yang dicek setelah keputusan dibuka.</li>
        <li><strong>Jaga negara tetap hidup</strong> sambil diam-diam mengejar agenda rahasia timmu.</li>
      </ol>
    </section>
  );
}

/** What this role controls, its power and its friends (GDD, "Peran"), shared with the paper kit. */
function RoleBriefCard({ role, open }: { role: Role; open: boolean }) {
  const brief = ROLE_BRIEF[role];
  return (
    <details className="role-brief" open={open}>
      <summary>Kartu peran: {ROLE_LABEL[role]}</summary>
      <p className="role-focus"><Glossed text={brief.focus} /></p>
      <h3 className="label">Tuas: {brief.lever.name}</h3>
      <dl className="lever-list">
        {brief.lever.options.map(([name, fx]) => (
          <div key={name}><dt>{name}</dt><dd>{fx}</dd></div>
        ))}
      </dl>
      <h3 className="label">Kekuatan: {brief.power.name}</h3>
      <p><Glossed text={brief.power.text} /></p>
      {brief.resource?.income && <p className="muted small">{brief.resource.income}</p>}
      <p className="ally"><strong>Kawan dan lawan.</strong> {brief.allies}</p>
    </details>
  );
}

function CrisisCard({ view }: { view: PlayerView }) {
  const crisis = view.crisis!;
  return (
    <article className="crisis-mini">
      {view.pemilu && view.stats && <p className="badge">Tahun pemilu. Survei Kepercayaan Publik: {view.stats.kepercayaan} dari 10.</p>}
      <CrisisArt id={crisis.id} />
      <h2>{crisis.title}</h2>
      <p><Glossed text={crisis.narrative} /></p>
      <p className="crisis-rule small"><strong>Aturan tahun ini.</strong> {crisis.ruleText}</p>
      <p className="crisis-question"><span className="label">Bahas di timmu</span><br /><Glossed text={crisis.question} /></p>
      <Concepts list={crisis.concepts} label="Ketuk istilahnya" />
      {crisis.didYouKnow && (
        <p className="muted small">
          Tahukah Anda? Krisis seperti ini pernah terjadi: {crisis.didYouKnow.title} ({crisis.didYouKnow.source}). Ceritanya dibahas di akhir permainan.
        </p>
      )}
    </article>
  );
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
        <p className="muted">{ctx.locked.source === 'fasilitator' ? 'Diputuskan fasilitator. ' : ''}Tunggu pengungkapan di layar utama.</p>
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
          {view.step === 'rapat' && view.crisis && <p className="crisis-question"><span className="label">Bahas di timmu</span><br /><Glossed text={view.crisis.question} /></p>}
          <p className="vote-count small"><strong>{ctx.proposers} dari {ctx.members}</strong> anggota sudah memilih. Angka di samping pilihan adalah jumlah suara.</p>
          <DecisionForm ctx={ctx} value={draft} onChange={change} />
          {!submitted && <button className="btn" onClick={() => change(draft)}>Pilih ini</button>}
          {submitted && <p className="muted small">Pilihanmu terkirim. Kamu masih bisa mengubahnya.</p>}
          {view.step === 'pengesahan' && isSpokesperson && (
            <div className="stack sah-box">
              <button className="btn" onClick={() => change(ctx.majority)}>Pakai pilihan terbanyak</button>
              <HoldButton label="Tahan untuk SAH" onConfirm={() => send({ t: 'lock', decision: draft })} />
            </div>
          )}
          {view.step === 'pengesahan' && <p className="muted small">Jika waktu habis sebelum SAH, pilihan terbanyak yang dipakai.</p>}
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

function ResultsScreen({ view, send }: { view: PlayerView; send: Send }) {
  const results = view.results;
  const d = view.debrief;
  if (!results) return null;
  const role = view.team!.role;
  const mine = results.teams.find(t => t.role === role)!;
  const rank = [...results.teams].sort((a, b) => b.score - a.score).findIndex(t => t.role === mine.role) + 1;

  if (d?.section === 'garisWaktu' || d?.section === 'sebab') {
    return (
      <section className="stack">
        <p className="lead">Lihat layar utama.</p>
        {d.chain && (
          <div className="stack">
            <h3 className="label">{STAT_NAME[d.chain.stat]} tahun {d.chain.year}: {d.chain.from} → {d.chain.to}</h3>
            <ul className="chain-mini">
              {d.chain.links.map((l, i) => (
                <li key={i} className={l.role === role ? 'mine' : ''}>
                  <strong>{signed(l.amount)}</strong> {l.label}
                  {l.origin && <span className="muted small"> · dari tahun {l.origin.year}</span>}
                </li>
              ))}
            </ul>
            <p className="muted small">Baris tebal adalah keputusan timmu.</p>
          </div>
        )}
      </section>
    );
  }

  if (d?.section === 'agenda') {
    const shown = d.agendas.slice(0, d.agendaShown);
    return (
      <section className="stack">
        <p className="lead">Agenda dibuka satu per satu di layar utama.</p>
        <ul className="breakdown">
          {shown.map(a => {
            const guess = a.guesses.find(g => g.by === role);
            return (
              <li key={a.role}>
                <strong>{ROLE_LABEL[a.role]}</strong>: {a.agendaName}
                {a.role !== role && <span className={guess?.correct ? 'ok' : 'muted'}> · tebakan timmu {guess?.guess ? (guess.correct ? 'benar' : 'salah') : 'kosong'}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (d?.section === 'diskusi') {
    const round = d.rounds[d.round]!;
    return (
      <section className="stack">
        <p className="kicker">Putaran {d.round + 1} dari 3</p>
        <h2 className="question-mini">{round.title}</h2>
        <ol className="breakdown">{round.prompts.map(p => <li key={p}>{p}</li>)}</ol>
        <div className="agenda">
          <p className="kicker">Pertanyaan untuk timmu</p>
          <p>{d.teamPrompts[role]}</p>
        </div>
      </section>
    );
  }

  if (d?.section === 'penutup') {
    // A post quiz still open comes first; the survey follows.
    if (view.myQuiz?.open === 'pasca') return <QuizForm key="pasca" quiz={view.myQuiz} send={send} />;
    if (view.mySurvey?.open) return <SurveyForm survey={view.mySurvey} send={send} />;
    if (view.mySurvey?.done) return <SurveyThanks />;
  }

  if (d?.section === 'kuis' && view.myQuiz) {
    return view.myQuiz.open === 'pasca' ? <QuizForm key="pasca" quiz={view.myQuiz} send={send} /> : <QuizMine quiz={view.myQuiz} />;
  }

  if (d?.section === 'duniaNyata' && d.realWorld) {
    return (
      <section className="stack">
        <p className="kicker">Di Dunia Nyata</p>
        <h2 className="question-mini">{d.realWorld.title}</h2>
        <p>{d.realWorld.text}</p>
        <p className="muted small">Sumber: {d.realWorld.source}{d.realWorld.url && <> · <a href={d.realWorld.url} target="_blank" rel="noopener noreferrer">buka sumber</a></>}</p>
      </section>
    );
  }

  const myTitles = d?.titles.filter(t => t.role === role) ?? [];
  return (
    <section className="stack">
      <p className="kicker">{ENDING_LABEL[results.ending]}</p>
      {results.collapses.map(c => <p key={c} className="warn">{COLLAPSE_LABEL[c]}</p>)}
      <p className="big-score">{mine.score} <small>poin</small></p>
      <p className="muted">Peringkat {rank} dari 5</p>
      {myTitles.map(t => <p key={t.title} className="badge">{t.title}: {t.reason}</p>)}
      <ul className="breakdown">
        <li>Agenda {mine.agendaName}: {mine.achieved ? 'tercapai' : 'tidak tercapai'}</li>
        <li>Tebakan benar: {mine.correctGuesses}</li>
        <li>Pakta ditepati {mine.pactsKept}, dilanggar {mine.pactsBroken}</li>
      </ul>
      <p className="muted small">Debrief dipandu fasilitator di layar utama.</p>
    </section>
  );
}
