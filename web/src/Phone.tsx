import { Tabs } from 'radix-ui';
import { forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from 'react';
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
import { AnimatedNumber, DUR, EASE, m } from './motion';
import { Board, HoldButton, RoleMark, RoleName, StepAnnouncer, TeiLogo, Timer, roleProps } from './shared';
import { storage, useClockOffset, useRoomSocket } from './socket';
import { COLLAPSE_LABEL, ENDING_LABEL, INDICATOR_LABEL as STAT_NAME, PRACTICE_COACH, STEP_LABEL, signed, whereLabel } from './text';

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
      <main className="phone flex flex-col items-center justify-center gap-4 text-center">
        <p className="lead">Fasilitator mengeluarkanmu dari ruangan.</p>
        <p className="text-muted">Kalau ini keliru, minta fasilitator lalu masuk lagi.</p>
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
      <StepAnnouncer label={whereLabel(view)} />
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
      <form className="flex flex-col gap-4" onSubmit={submit}>
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
          <small id="code-hint" className="text-muted">4 huruf di layar utama.</small>
        </label>
        <label className="field">
          <span>Nama panggilan</span>
          <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={16} autoComplete="nickname" placeholder="mis. Ani" required />
          <small className="text-muted">Cukup nama panggilan. Tidak perlu nama lengkap atau data lain.</small>
        </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
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
  const setTab = (next: string) => { setTabState(next as PhoneTab); window.scrollTo({ top: 0 }); };
  const phaseKey = `${view.phase}:${view.year}:${view.step}`;
  useEffect(() => { setTabState('sekarang'); }, [phaseKey]);
  const incoming = view.team ? view.pacts.filter(p => p.to === view.team!.role && p.status === 'diajukan').length : 0;
  if (!view.team || view.phase === 'gabung') {
    return (
      <>
        <PhoneHeader view={view} now={now} />
        <div className="phone-page"><PhoneBody view={view} send={send} now={now} /></div>
      </>
    );
  }
  return (
    <Tabs.Root value={tab} onValueChange={setTab} className="contents">
      <PhoneHeader view={view} now={now} />
      <div className="phone-page with-nav">
        <Tabs.Content value="sekarang" asChild><Fade className="flex flex-col gap-5"><PhoneBody view={view} send={send} now={now} /></Fade></Tabs.Content>
        <Tabs.Content value="tim" asChild><Fade><TeamTab view={view} /></Fade></Tabs.Content>
        <Tabs.Content value="negara" asChild><Fade><CountryTab view={view} /></Fade></Tabs.Content>
      </div>
      <Tabs.List className="phone-nav" aria-label="Bagian layar">
        {PHONE_TABS.map(t => (
          <Tabs.Trigger key={t.id} value={t.id}>
            {t.label}
            {t.id === 'sekarang' && incoming > 0 && <span className="nav-badge" aria-label={`${incoming} tawaran kesepakatan baru`}>{incoming}</span>}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

/** Tab content fades in when it opens; Radix keeps only the open tab mounted. */
const Fade = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Fade({ children, className, ...rest }, ref) {
  const { onAnimationStart: _a, onDrag: _b, onDragStart: _c, onDragEnd: _d, ...props } = rest;
  return <m.div ref={ref} className={className} {...props} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast }}>{children}</m.div>;
});

/** Where the year stands: six steps, the current one marked and named, and what comes next. */
function StepRail({ view }: { view: PlayerView }) {
  if (view.phase !== 'tahun' || !view.step) return null;
  const at = YEAR_STEPS.indexOf(view.step);
  const next = YEAR_STEPS[at + 1];
  return (
    <div className="flex flex-col gap-1">
      <ol className="step-rail" aria-label={`Langkah ${at + 1} dari ${YEAR_STEPS.length}: ${STEP_LABEL[view.step]}`}>
        {YEAR_STEPS.map((step, i) => <li key={step} className={i < at ? 'done' : i === at ? 'now' : ''} aria-hidden="true" />)}
      </ol>
      <p className="step-next" aria-hidden="true">Langkah {at + 1}/{YEAR_STEPS.length}{next ? ` · berikutnya: ${STEP_LABEL[next]}` : ''}</p>
    </div>
  );
}

function PhoneHeader({ view, now }: { view: PlayerView; now: () => number }) {
  if (!view.team) return null;
  const title = view.phase === 'tahun' && view.step ? `${view.practice ? 'Latihan' : `Tahun ${view.year}`} · ${STEP_LABEL[view.step]}` : view.phase === 'briefing' ? 'Briefing peran' : view.phase === 'tebak' ? 'Tebak agenda' : view.phase === 'selesai' ? 'Debrief' : `Ruangan ${view.code}`;
  return (
    <header className="phone-head">
      <div className="flex items-center gap-3">
        <RoleMark role={view.team.role} />
        <div className="flex min-w-0 flex-1 flex-col leading-snug">
          <strong>{view.team.label}</strong>
          <span className="text-xs text-muted">{title}{view.me.isSpokesperson && <span className="tag brand ml-2">Jubir</span>}</span>
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
    <section className="flex flex-col gap-4">
      {team.resource && <Resource resource={team.resource} />}
      {team.agenda && (
        <div className="panel-dark agenda">
          <p className="kicker">Agenda rahasia</p>
          <h3>{team.agenda.name}</h3>
          <p>{team.agenda.description}</p>
          <p className="text-xs text-on-inverse-muted">Jangan tunjukkan layar ini ke tim lain.</p>
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
    <section className="flex flex-col gap-4">
      {view.stats ? <Board stats={view.stats} /> : <p className="text-muted">Negara belum berjalan.</p>}
      {view.crisis && (
        <div className="card gap-1">
          <p className="kicker">Krisis tahun {view.year}</p>
          <h3>{view.crisis.title}</h3>
          <p className="text-xs">{view.crisis.ruleText}</p>
        </div>
      )}
      {agreed.length > 0 && (
        <div>
          <p className="kicker">Kesepakatan yang disetujui</p>
          <ul className="flex flex-col gap-2">
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
      <span className="text-muted text-xs">Hanya terlihat di HP timmu</span>
    </p>
  );
}

function Members({ view }: { view: PlayerView }) {
  const team = view.team!;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="kicker">Anggota tim</h3>
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
  const heading = useRef<HTMLHeadingElement>(null);
  const where = whereLabel(view);
  const first = useRef(true);
  // A new step moves focus to its task, so a screen reader or keyboard starts there, not on a stale control.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus({ preventScroll: true });
  }, [where]);
  if (view.phase !== 'tahun' || !view.step) return null;
  const jubir = view.me.isSpokesperson;
  const locked = !!view.decision?.locked;
  const task: Record<string, string> = {
    krisis: 'Baca krisisnya. Apa dampaknya bagi timmu?',
    rapat: jubir ? 'Pilih kartu dan pilihan kebijakan bersama tim. Kalau sudah sepakat, tekan Tim kami selesai.' : 'Pilih satu kartu dan satu pilihan kebijakan. Suara terbanyak tim yang dipakai.',
    lobi: jubir ? 'Kamu Jubir: datangi tim lain, ajukan dan jawab kesepakatan di bawah, lalu tekan Tim kami selesai.' : 'Bantu Jubir menawar ke tim lain. Tawaran yang masuk muncul di bawah.',
    pengesahan: locked ? 'Keputusan timmu sudah sah.' : jubir ? 'Kamu Jubir: tahan tombol SAH untuk mengesahkan keputusan tim.' : `Tunggu Jubir (${view.team?.spokesperson ?? '-'}) mengesahkan.`,
    pengungkapan: 'Lihat layar utama: keputusan semua tim dibuka satu per satu.',
    koran: 'Harian TEI terbit. Lihat layar utama.',
  };
  return (
    <div className="flex flex-col gap-1">
      <h2 ref={heading} tabIndex={-1} className="text-lg focus:outline-none">{STEP_LABEL[view.step]}</h2>
      <p className="text-copy">{task[view.step]}</p>
    </div>
  );
}

function PhoneBody({ view, send, now }: { view: PlayerView; send: Send; now: () => number }) {
  const team = view.team;
  const quiz = view.myQuiz;
  const preQuiz = quiz?.open === 'pra' ? <QuizForm key="pra" quiz={quiz} send={send} /> : quiz?.done.pra && (view.phase === 'gabung' || view.phase === 'briefing') ? <p className="text-muted text-xs">Kuis awal terkirim. Terima kasih.</p> : null;
  if (!team) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <p className="kicker">Ruangan {view.code}</p>
          <p className="lead">Halo, {view.me.nickname}.</p>
          <p className="text-muted">Tunggu fasilitator membagi tim. Lihat layar utama.</p>
        </div>
        <Cast />
        {preQuiz}
        <HowToPlay />
      </section>
    );
  }

  if (view.phase === 'gabung') {
    return (
      <section className="flex flex-col gap-4">
        <Members view={view} />
        <p className="text-muted">Tim masih bisa berubah. Tunggu fasilitator memulai briefing.</p>
        {preQuiz}
      </section>
    );
  }

  if (view.phase === 'briefing') {
    // The task here is reading: who you are, what you secretly want, what you control.
    return (
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Portrait role={team.role} />
          <div>
            <h2>Kamu {team.label}</h2>
            <p className="text-xs">Baca kartumu sebelum Tahun 1 dimulai.</p>
          </div>
        </div>
        {view.me.isSpokesperson && <p className="badge">Kamu Jubir (juru bicara) tahun 1: kamu yang mengesahkan keputusan tim dan membuat kesepakatan dengan tim lain.</p>}
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
    <section className="flex flex-col gap-4">
      <TaskHead view={view} />
      {coach && (
        <aside className="callout plain coach" role="note">
          <p className="kicker">Latihan · tidak dihitung</p>
          <p>{view.me.isSpokesperson && coach.spokesperson ? coach.spokesperson : coach.phone}</p>
        </aside>
      )}
      {view.crisis && view.step === 'krisis' && <CrisisCard view={view} />}
      {view.step === 'rapat' && <p className="text-xs text-muted">Setelah ini: <strong className="text-copy">Negosiasi</strong>. Timmu bisa membuat kesepakatan dengan tim lain.</p>}
      {view.decision && <DecideScreen key={`${view.year}`} view={view} send={send} />}
      {(view.step === 'pengungkapan' || view.step === 'koran') && <RevealMine view={view} now={now} />}
    </section>
  );
}

/** The five roles as a row of caricatures: who is in this country. */
function Cast() {
  return (
    <figure className="cast" aria-label="Lima peran: Pemerintah, Bank Sentral, Pengusaha, Serikat Buruh, Masyarakat">
      {ROLES.map(role => <Portrait key={role} role={role} className="cast-face" />)}
      <figcaption className="text-muted text-xs">Lima peran, satu negara, lima tahun.</figcaption>
    </figure>
  );
}

function HowToPlay() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="kicker">Cara bermain</h2>
      <ol className="list flex flex-col gap-2">
        <li><strong>Rapat dengan timmu.</strong> Pilih satu kartu kebijakan dan satu pilihan kebijakan di HP.</li>
        <li><strong>Negosiasi dengan tim lain.</strong> Buat kesepakatan: "kami lakukan ini, kalian lakukan itu". Ditepati +1, dilanggar −1.</li>
        <li><strong>Jaga negara tetap hidup</strong> sambil diam-diam mengejar agenda rahasia timmu.</li>
      </ol>
    </section>
  );
}

/** What this role controls, its power and its friends (GDD, "Peran"), shared with the paper kit. */
function RoleBriefCard({ role, open }: { role: Role; open: boolean }) {
  const brief = ROLE_BRIEF[role];
  return (
    <details className="card ruled" open={open}>
      <summary>Kartu peran: {ROLE_LABEL[role]}</summary>
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-lg leading-snug"><Glossed text={brief.focus} /></p>
        <h3 className="kicker mt-2">Pilihan kebijakan: {brief.lever.name}</h3>
        <dl className="lever-list">
          {brief.lever.options.map(([name, fx]) => (
            <div key={name}><dt>{name}</dt><dd>{fx}</dd></div>
          ))}
        </dl>
        <h3 className="kicker mt-2">Kekuatan: {brief.power.name}</h3>
        <p><Glossed text={brief.power.text} /></p>
        {brief.resource?.income && <p className="text-xs text-muted">{brief.resource.income}</p>}
        <p className="bg-sunken px-3 py-2 text-xs"><strong>Kawan dan lawan.</strong> {brief.allies}</p>
      </div>
    </details>
  );
}

function CrisisCard({ view }: { view: PlayerView }) {
  const crisis = view.crisis!;
  return (
    <article className="card ruled crisis-mini">
      {view.pemilu && view.stats && <p className="badge">Tahun pemilu. Survei Kepercayaan Publik: {view.stats.kepercayaan} dari 10.</p>}
      <CrisisArt id={crisis.id} />
      <h2>{crisis.title}</h2>
      <p><Glossed text={crisis.narrative} /></p>
      <p className="callout plain text-xs"><strong>Aturan tahun ini.</strong> {crisis.ruleText}</p>
      <p className="callout"><span className="kicker">Bahas di timmu</span><br /><Glossed text={crisis.question} /></p>
      <Concepts list={crisis.concepts} label="Ketuk istilahnya" />
      {crisis.didYouKnow && (
        <p className="text-muted text-xs">
          Tahukah Anda? Krisis seperti ini pernah terjadi: {crisis.didYouKnow.title} ({crisis.didYouKnow.source}). Ceritanya dibahas di akhir permainan.
        </p>
      )}
    </article>
  );
}

function DecideScreen({ view, send }: { view: PlayerView; send: Send }) {
  const ctx = view.decision!;
  const [draft, setDraft] = useState<Decision>(ctx.myProposal ?? ctx.majority);
  // In Pengesahan the Jubir seals the team's majority, live, unless they pick something else there.
  const [edited, setEdited] = useState(false);
  const submitted = !!ctx.myProposal;
  const isSpokesperson = view.me.isSpokesperson;
  const sealing = view.step === 'pengesahan' && isSpokesperson;
  const shown = sealing && !edited ? ctx.majority : draft;

  const change = (decision: Decision) => {
    setDraft(decision);
    if (sealing) setEdited(true);
    send({ t: 'propose', decision });
  };

  const form = (
    <>
      {view.step === 'rapat' && view.crisis && <p className="callout"><span className="kicker">Bahas di timmu</span><br /><Glossed text={view.crisis.question} /></p>}
      <p className="text-xs text-copy"><strong className="text-ink">{ctx.proposers} dari {ctx.members}</strong> anggota sudah memilih. Angka di samping pilihan adalah jumlah suara.</p>
      {sealing && <p className="callout plain text-xs">{edited ? 'Yang akan disahkan: pilihanmu di bawah.' : 'Yang akan disahkan: pilihan terbanyak timmu (ditampilkan di bawah, ikut berubah bila suara berubah).'}</p>}
      <DecisionForm ctx={ctx} value={shown} onChange={change} />
      {!submitted && !sealing && <button className="btn" onClick={() => change(draft)}>Pilih ini</button>}
      {submitted && !sealing && <p className="text-xs text-muted">Pilihanmu terkirim. Kamu masih bisa mengubahnya.</p>}
      {view.step === 'pengesahan' && <p className="text-xs text-muted">Jika waktu habis sebelum SAH, pilihan terbanyak yang dipakai.</p>}
    </>
  );

  if (ctx.locked) {
    return (
      <section className="flex flex-col gap-4">
        <div className="stamp" role="status">SAH</div>
        <p className="text-muted">{ctx.locked.source === 'fasilitator' ? 'Diputuskan fasilitator. ' : ''}Tunggu pengungkapan di layar utama.</p>
        {view.step === 'lobi' && <PactPanel view={view} send={send} />}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {view.step === 'lobi' ? (
        <>
          <PactPanel view={view} send={send} />
          <details className="card">
            <summary>Keputusan timmu (masih bisa diubah)</summary>
            <div className="flex flex-col gap-4 pt-3">{form}</div>
          </details>
        </>
      ) : form}
      {sealing && (
        <div className="action-dock">
          {edited && <button className="btn" onClick={() => setEdited(false)}>Kembali ke pilihan terbanyak</button>}
          <HoldButton label="Tahan untuk SAH" onConfirm={() => send({ t: 'lock', decision: shown })} />
        </div>
      )}
      <ReadyBox view={view} send={send} />
    </section>
  );
}

/** Rapat and Lobi end early once every team's spokesperson says the team is done talking. */
function ReadyBox({ view, send }: { view: PlayerView; send: Send }) {
  if (view.step !== 'rapat' && view.step !== 'lobi') return null;
  const ready = !!view.teams.find(t => t.role === view.me.role)?.ready;
  const done = view.teams.filter(t => t.ready).length;
  const count = <strong>{done} dari {view.teams.length} tim selesai</strong>;
  if (!view.me.isSpokesperson) {
    return <p className="text-xs text-copy" role="status">{ready ? 'Jubir bilang timmu selesai. ' : ''}{count}. Jubir ({view.team!.spokesperson}) menekan tombol selesai.</p>;
  }
  return (
    <div className="action-dock" role="group" aria-label="Konfirmasi tim">
      <p className="text-xs text-copy" role="status">{ready ? 'Timmu sudah selesai. ' : 'Sudah sepakat? '}{count}. Fase lanjut begitu semua tim selesai.</p>
      <m.div key={ready ? 'ready' : 'open'} className="flex" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: DUR.fast, ease: EASE.slam }}>
        {ready
          ? <button type="button" className="btn grow" onClick={() => send({ t: 'ready', on: false })}>Batal, masih diskusi</button>
          : <button type="button" className="btn primary grow" onClick={() => send({ t: 'ready', on: true })}>Tim kami selesai</button>}
      </m.div>
    </div>
  );
}

/**
 * Negosiasi, the main screen of its step for everyone: offers waiting for this team first, then
 * ready-made deals with each other team (one tap for the Jubir), then a free-form deal.
 */
function PactPanel({ view, send }: { view: PlayerView; send: Send }) {
  const role = view.team!.role;
  const lobby = view.lobby;
  const isSpokesperson = view.me.isSpokesperson;
  const partners = ROLES.filter(r => r !== role);
  const [to, setTo] = useState<Role>(partners[0]!);
  const [custom, setCustom] = useState(false);
  const [mine, setMine] = useState('');
  const [theirs, setTheirs] = useState('');
  const myTerms = lobby?.terms[role] ?? [];
  const theirTerms = lobby?.terms[to] ?? [];
  const live = view.pacts.filter(p => p.status === 'diajukan' || p.status === 'disepakati');
  const full = !!lobby && live.filter(p => p.from === role || p.to === role).length >= lobby.maxPacts;
  const incoming = view.pacts.filter(p => p.to === role && p.status === 'diajukan');
  const others = view.pacts.filter(p => !incoming.includes(p));
  const offered = (fromTerm: string, toTerm: string) => live.some(p => p.from === role && p.fromText === myTerms.find(t => t.id === fromTerm)?.text && p.toText === theirTerms.find(t => t.id === toTerm)?.text);
  const suggestions = (lobby?.suggestions ?? []).filter(s => s.to === to);
  const propose = (fromTerm: string, toTerm: string) => send({ t: 'pactPropose', to, fromTerm: fromTerm as never, toTerm: toTerm as never });

  const deal = (p: PlayerView['pacts'][number]) => (
    <>
      <p><RoleName role={p.from} />: {p.fromText}</p>
      <p><RoleName role={p.to} />: {p.toText}</p>
    </>
  );

  return (
    <section className="flex flex-col gap-4" aria-label="Kesepakatan">
      <p className="text-xs text-copy">Kesepakatan = janji dua tim, dicek setelah keputusan dibuka. Ditepati <strong>+1 poin</strong>, dilanggar <strong>−1 poin</strong>.</p>

      {incoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="kicker">Tawaran untuk timmu</h3>
          {incoming.map(p => (
            <div key={p.id} className="pact diajukan incoming">
              {deal(p)}
              {isSpokesperson
                ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn primary" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: true })}>Setuju</button>
                    <button className="btn" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: false })}>Tolak</button>
                  </div>
                )
                : <p className="text-xs text-muted">Jubir ({view.team!.spokesperson}) yang menjawab. Diskusikan dulu bersamanya.</p>}
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <ul className="flex flex-col gap-2">
          {others.map(p => (
            <li key={p.id} className={`pact ${p.status}`}>
              {deal(p)}
              <p className="text-muted text-xs">{{ diajukan: 'Menunggu jawaban mereka', disepakati: 'Disetujui', ditolak: 'Ditolak', ditarik: 'Ditarik', kedaluwarsa: 'Kedaluwarsa' }[p.status]}</p>
              {isSpokesperson && p.from === role && p.status === 'diajukan' && <button className="btn" onClick={() => send({ t: 'pactRespond', pactId: p.id, accept: false })}>Tarik tawaran</button>}
            </li>
          ))}
        </ul>
      )}

      {lobby && isSpokesperson && !full && (
        <div className="flex flex-col gap-3">
          <h3 className="kicker">Tawarkan kesepakatan</h3>
          <div className="partner-picker" role="radiogroup" aria-label="Dengan tim">
            {partners.map(r => (
              <button key={r} type="button" role="radio" aria-checked={to === r} className={`chip-btn${to === r ? ' on' : ''}`} onClick={() => { setTo(r); setTheirs(''); }} {...roleProps(r)}>
                <RoleMark role={r} small /> {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          {suggestions.map(s => (
            <div key={`${s.fromTerm}-${s.toTerm}`} className="deal-card">
              <p><strong>Kami:</strong> {s.fromText}</p>
              <p><strong>{ROLE_LABEL[to]}:</strong> {s.toText}</p>
              <button className="btn primary" disabled={offered(s.fromTerm, s.toTerm)} onClick={() => propose(s.fromTerm, s.toTerm)}>
                {offered(s.fromTerm, s.toTerm) ? 'Sudah ditawarkan' : `Tawarkan ke ${ROLE_LABEL[to]}`}
              </button>
            </div>
          ))}
          {!custom && <button type="button" className="btn" onClick={() => setCustom(true)}>Buat kesepakatan sendiri</button>}
          {custom && (
            <form className="flex flex-col gap-4 pact-form" onSubmit={e => {
              e.preventDefault();
              if (mine && theirs) propose(mine, theirs);
              setMine('');
              setTheirs('');
            }}>
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
              <button className="btn primary" disabled={!mine || !theirs}>Tawarkan</button>
            </form>
          )}
        </div>
      )}
      {lobby && isSpokesperson && full && <p className="text-xs text-muted">Timmu sudah punya {lobby.maxPacts} kesepakatan tahun ini (batas maksimal).</p>}
      {lobby && !isSpokesperson && !incoming.length && <p className="text-muted text-xs">Hanya Jubir ({view.team!.spokesperson}) yang bisa menawarkan dan menyetujui kesepakatan. Bantu ia menawar ke tim lain.</p>}
    </section>
  );
}

/**
 * The team's own outcome, revealed on the phone only when the projector reaches it: teams one by
 * one, every 1.5 s from the start of the step, then causes, then kesepakatan (MainScreens RevealStage).
 */
function useRevealClock(view: PlayerView, now: () => number): number {
  const started = view.stepStartedAt;
  const [shown, setShown] = useState(() => (started === null ? Infinity : Math.floor((now() - started) / REVEAL_STEP_MS)));
  useEffect(() => {
    const tick = () => setShown(started === null ? Infinity : Math.floor((now() - started) / REVEAL_STEP_MS));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [started, now]);
  return view.step === 'pengungkapan' ? shown : Infinity;
}

const REVEAL_STEP_MS = 1500;

function RevealMine({ view, now }: { view: PlayerView; now: () => number }) {
  const shown = useRevealClock(view, now);
  const reveal = view.reveal;
  const index = reveal?.teams.findIndex(t => t.role === view.team!.role) ?? -1;
  const mine = index >= 0 && shown >= index + 1 ? reveal!.teams[index] : null;
  const pactsAt = reveal ? reveal.teams.length + reveal.groups.length : 0;
  const pacts = shown > pactsAt ? (reveal?.pacts ?? []).filter(p => p.from === view.team!.role || p.to === view.team!.role) : [];
  return (
    <section className="flex flex-col gap-4">
      {view.step === 'koran' && view.frontPage && <h2 className="font-serif text-lg">{view.frontPage.headline}</h2>}
      {!mine && view.step === 'pengungkapan' && <p className="text-muted">Keputusan timmu belum dibuka. Lihat layar utama…</p>}
      {mine && (
        <div className="reveal-mine flex flex-col gap-2">
          <h3 className="kicker">Keputusan timmu</h3>
          <ul className="list">{mine.lines.map(line => <li key={line}>{line}</li>)}</ul>
          {mine.cancelled && <p className="text-danger">Kartumu dibatalkan.</p>}
        </div>
      )}
      {pacts.map(p => {
        const kept = p.from === view.team!.role ? p.result?.keptFrom : p.result?.keptTo;
        return <p key={p.id} className={kept ? 'text-success' : 'text-danger'}>Kesepakatan dengan {ROLE_LABEL[p.from === view.team!.role ? p.to : p.from]}: timmu {kept ? 'menepati (+1)' : 'melanggar (−1)'}.</p>;
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
      <section className="flex flex-col gap-4">
        <div className="stamp" role="status">TERKIRIM</div>
        <p className="text-muted">Tebakan timmu sudah dikirim. Tunggu hasil di layar utama.</p>
      </section>
    );
  }

  if (!view.me.isSpokesperson) {
    return (
      <section className="flex flex-col gap-4">
        <p className="lead">Tebak agenda rahasia tim lain.</p>
        <p className="text-muted">Diskusikan dengan timmu. Jubir ({view.team!.spokesperson}) yang mengirim tebakan: +1 untuk setiap tebakan benar{view.options.oknum ? ', dan Oknum terbongkar jika minimal 3 tim menunjuknya' : ''}.</p>
      </section>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); send({ t: 'final', vote: { agendas, oknum } }); }}>
      <p className="lead">Tebak agenda tim lain</p>
      <p className="text-muted text-xs">+1 untuk setiap tebakan benar. Boleh dikosongkan.</p>
      {(Object.keys(final.options) as Role[]).map(target => (
        <fieldset key={target} className="choice">
          <legend><RoleName role={target} /></legend>
          {final.options[target]!.map(option => (
            <label key={option.id} className={`guess${agendas[target] === option.id ? ' on' : ''}`}>
              <input type="radio" name={`guess-${target}`} checked={agendas[target] === option.id} onChange={() => setAgendas({ ...agendas, [target]: option.id as AgendaId })} />
              <span><strong>{option.name}</strong><br /><span className="text-xs text-muted">{option.description}</span></span>
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
      <section className="flex flex-col gap-4">
        <p className="lead">Lihat layar utama.</p>
        {d.chain && (
          <div className="flex flex-col gap-4">
            <h3 className="kicker">{STAT_NAME[d.chain.stat]} tahun {d.chain.year}: {d.chain.from} → {d.chain.to}</h3>
            <ul className="chain-mini">
              {d.chain.links.map((l, i) => (
                <li key={i} className={l.role === role ? 'mine' : ''}>
                  <strong>{signed(l.amount)}</strong> {l.label}
                  {l.origin && <span className="text-muted text-xs"> · dari tahun {l.origin.year}</span>}
                </li>
              ))}
            </ul>
            <p className="text-muted text-xs">Baris tebal adalah keputusan timmu.</p>
          </div>
        )}
      </section>
    );
  }

  if (d?.section === 'agenda') {
    const shown = d.agendas.slice(0, d.agendaShown);
    return (
      <section className="flex flex-col gap-4">
        <p className="lead">Agenda dibuka satu per satu di layar utama.</p>
        <ul className="list flex flex-col gap-1">
          {shown.map(a => {
            const guess = a.guesses.find(g => g.by === role);
            return (
              <li key={a.role}>
                <strong>{ROLE_LABEL[a.role]}</strong>: {a.agendaName}
                {a.role !== role && <span className={guess?.correct ? 'text-success' : 'text-muted'}> · tebakan timmu {guess?.guess ? (guess.correct ? 'benar' : 'salah') : 'kosong'}</span>}
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
      <section className="flex flex-col gap-4">
        <p className="kicker">Putaran {d.round + 1} dari 3</p>
        <h2 className="question-mini text-lg">{round.title}</h2>
        <ol className="list flex flex-col gap-1">{round.prompts.map(p => <li key={p}>{p}</li>)}</ol>
        <div className="panel-dark agenda">
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
      <section className="flex flex-col gap-4">
        <p className="kicker">Di Dunia Nyata</p>
        <h2 className="question-mini text-lg">{d.realWorld.title}</h2>
        <p>{d.realWorld.text}</p>
        <p className="text-muted text-xs">Sumber: {d.realWorld.source}{d.realWorld.url && <> · <a href={d.realWorld.url} target="_blank" rel="noopener noreferrer">buka sumber</a></>}</p>
      </section>
    );
  }

  const myTitles = d?.titles.filter(t => t.role === role) ?? [];
  return (
    <section className="flex flex-col gap-4">
      <p className="kicker">{ENDING_LABEL[results.ending]}</p>
      {results.collapses.map(c => <p key={c} className="text-danger">{COLLAPSE_LABEL[c]}</p>)}
      <p className="big-score"><AnimatedNumber value={mine.score} /> <small>poin</small></p>
      <p className="text-muted">Peringkat {rank} dari 5</p>
      {myTitles.map(t => <p key={t.title} className="badge">{t.title}: {t.reason}</p>)}
      <ul className="list flex flex-col gap-1">
        <li>Agenda {mine.agendaName}: {mine.achieved ? 'tercapai' : 'tidak tercapai'}</li>
        <li>Tebakan benar: {mine.correctGuesses}</li>
        <li>Kesepakatan ditepati {mine.pactsKept}, dilanggar {mine.pactsBroken}</li>
      </ul>
      <p className="text-muted text-xs">Debrief dipandu fasilitator di layar utama.</p>
    </section>
  );
}
