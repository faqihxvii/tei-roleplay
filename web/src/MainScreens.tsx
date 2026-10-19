import { useEffect, useState } from 'react';
import type { Role } from '../../engine/src/types';
import type { ClientMessage } from '../../room/src/protocol';
import type { HostView, PublicStats, RevealView } from '../../room/src/views';
import { CrisisArt, endExpression, Portrait } from './art';
import { Concepts, Glossed } from './Glossary';
import { cueBus } from './audio/bus';
import { revealCue } from './audio/derive';
import { Confetti } from './Celebrate';
import { LinimasaStage } from './Linimasa';
import { AnimatedNumber, DUR, EASE, m } from './motion';
import { Board, RoleMark, RoleName, TeiLogo, Timer, roleProps, useSequence } from './shared';
import { COLLAPSE_LABEL, ENDING_LABEL, INDICATOR_LABEL, INDICATOR_ORDER, coachFor, signed, STEP_HINT, STEP_HINT_PEMULA, STEP_LABEL } from './text';

// The projected main screen during the year loop and the end of the game. Text sized to be read
// from the back row; one focus per phase (GDD, "UX/UI").

type Send = (message: ClientMessage) => void;

/**
 * The main screen's one-line header: where the class is (year, and the year's six chapters), and on
 * the right either the clock or, for steps without one, the facilitator's button to move on. What to
 * do now is not here: it is the chapter's own headline.
 */
export function TopBar({ view, now, send, title }: { view: HostView; now: () => number; send?: Send; title?: string }) {
  const where = title ?? (view.phase === 'tahun'
    ? null
    : view.phase === 'tebak' ? 'Tebak agenda' : view.phase === 'briefing' ? 'Briefing peran' : 'Hasil akhir');
  const clock = view.phaseEndsAt !== null || view.pausedMs !== null;
  const canMoveOn = !!send && !clock && (view.phase === 'briefing' || view.phase === 'tahun' || view.phase === 'tebak');
  return (
    <header className={`topbar${view.practice ? ' practice' : ''}`}>
      <TeiLogo />
      <p className="topbar-title">
        {where ?? (view.practice
          ? <>Tahun 0 <span className="tag soft practice-tag">Latihan</span></>
          : <>Tahun {view.year}<span className="of">/ {view.maxYears}</span></>)}
      </p>
      {view.phase === 'tahun' && view.step ? <StoryRail step={view.step} /> : <span />}
      <div className="topbar-end">
        <span className="room-tag">Ruangan {view.code}</span>
        {clock && <Timer endsAt={view.phaseEndsAt} pausedMs={view.pausedMs} now={now} big />}
        {canMoveOn && <button type="button" className="btn primary" onClick={() => send({ t: 'next' })}>Lanjut →</button>}
      </div>
    </header>
  );
}

const CHAPTERS = ['krisis', 'rapat', 'lobi', 'pengesahan', 'pengungkapan', 'koran'] as const;

/** The year as six chapters on one slim line: the current one named in red, the next one named quietly. */
function StoryRail({ step }: { step: NonNullable<HostView['step']> }) {
  const at = CHAPTERS.indexOf(step);
  return (
    <ol className="story-rail" aria-label={`Babak ${at + 1} dari ${CHAPTERS.length}: ${STEP_LABEL[step]}`}>
      {CHAPTERS.map((chapter, i) => (
        <li key={chapter} className={i < at ? 'done' : i === at ? 'now' : i === at + 1 ? 'next' : ''} aria-current={i === at ? 'step' : undefined}>
          {i === at && <m.span key={step} className="story-fill" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DUR.slow, ease: EASE.paper }} />}
          <span className="story-name">{STEP_LABEL[chapter]}</span>
        </li>
      ))}
    </ol>
  );
}

/** What the class does in this chapter, as one line under its headline. */
function hintFor(view: HostView): string {
  const pemula = view.options.mode === 'pemula';
  return view.practice ? coachFor(view.step!, pemula).main : (pemula && STEP_HINT_PEMULA[view.step!]) || STEP_HINT[view.step!];
}

export function YearScreen({ view, now, send }: { view: HostView; now: () => number; send: Send }) {
  const step = view.step!;
  if (step === 'pengungkapan' && view.reveal) {
    return (
      <>
        <TopBar view={view} now={now} send={send} />
        <RevealStage reveal={view.reveal} />
      </>
    );
  }
  // One focus per chapter. The country's numbers sit in a quiet strip at the foot of the screen;
  // they take the stage only when decisions move them (Pengungkapan).
  return (
    <>
      <TopBar view={view} now={now} send={send} />
      <m.div
        key={`${view.practice ? 0 : view.year}-${step}`}
        className={`chapter chapter-${step}`}
        // Negosiasi and Linimasa can outgrow a small projector; a keyboard can then scroll them.
        tabIndex={step === 'lobi' || step === 'koran' ? 0 : undefined}
        aria-label={step === 'lobi' || step === 'koran' ? STEP_LABEL[step] : undefined}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.base, ease: EASE.paper }}
      >
        {step === 'krisis' && <CrisisStage view={view} />}
        {step === 'rapat' && <TeamsStage view={view} />}
        {step === 'lobi' && <LobbyTable view={view} />}
        {step === 'pengesahan' && <TeamsStage view={view} />}
        {step === 'koran' && view.frontPage && <LinimasaStage page={view.frontPage} growth={view.growth} />}
      </m.div>
      {step !== 'koran' && view.stats && <div className="country-strip"><Board stats={view.stats} strip /></div>}
    </>
  );
}

function CrisisStage({ view }: { view: HostView }) {
  const crisis = view.crisis;
  if (!crisis) return null;
  return (
    <article className="crisis-card">
      {view.pemilu && view.stats && (
        <p className="election">Tahun pemilu. Hasil survei Kepercayaan Publik: <strong>{view.stats.kepercayaan}</strong> dari 10.</p>
      )}
      <div className="crisis-top">
        <div className="flex flex-col gap-4">
          <p className="kicker">Krisis tahun {view.year} · {crisis.category}</p>
          <h1 className="crisis-title">{crisis.title}</h1>
          <p className="crisis-narrative"><Glossed text={crisis.narrative} /></p>
          <div className="flex flex-wrap gap-2">
            {crisis.opening.map(o => (
              <span key={o.stat} className={`chip-effect ${(o.stat === 'harga' || o.stat === 'keresahan') === o.amount > 0 ? 'bad' : 'good'}`}>
                {INDICATOR_LABEL[o.stat as keyof typeof INDICATOR_LABEL]} {signed(o.amount)}
              </span>
            ))}
          </div>
          <Concepts list={crisis.concepts} />
        </div>
        <div className="flex flex-col gap-4">
          <CrisisArt id={crisis.id} />
          <p className="callout plain text-display-sm"><span className="kicker">Aturan tahun ini</span><br />{crisis.ruleText}</p>
          <p className="callout text-display-sm"><span className="kicker">Pertanyaan untuk Rapat Tim</span><br /><Glossed text={crisis.question} /></p>
          {view.year >= 3 && <p className="text-muted">Mulai tahun 3, krisis menghantam dua kali lebih keras.</p>}
        </div>
      </div>
    </article>
  );
}

/** Five dots, one per team: how many have said they are done talking. */
function ReadyMeter({ view }: { view: HostView }) {
  const done = view.teams.filter(t => t.ready).length;
  return (
    <p className="ready-meter" role="status">
      <span className="dots" aria-hidden="true">
        {view.teams.map(t => <m.span key={t.role} className={`dot${t.ready ? ' on' : ''}`} animate={{ scale: t.ready ? [1, 1.6, 1] : 1 }} transition={{ duration: DUR.base, ease: EASE.slam }} />)}
      </span>
      {done === view.teams.length ? 'Semua tim selesai.' : `${done} dari ${view.teams.length} tim selesai`}
    </p>
  );
}

/** Rapat and Pengesahan: one question, then the five teams and where each one stands. */
function TeamsStage({ view }: { view: HostView }) {
  const pengesahan = view.step === 'pengesahan';
  const signedCount = view.teams.filter(t => t.locked).length;
  // Pemula: the class sees every team's three options, so talk can cross tables.
  const options = (role: Role) => (view.options.mode === 'pemula' && !pengesahan ? view.console?.decisions[role]?.hand.map(c => c.name) : undefined);
  const status = (team: HostView['teams'][number]) => {
    if (team.locked) return null; // the stamp says it
    if (team.offline) return 'Diputuskan fasilitator';
    if (pengesahan) return 'Menunggu Jubir';
    return team.ready ? 'Selesai berdiskusi' : `${team.proposers} dari ${team.members} sudah memilih`;
  };
  return (
    <>
      <div className="chapter-hero">
        {pengesahan ? (
          <h1 className="chapter-question">{signedCount === view.teams.length ? 'Semua tim sudah sah.' : `${signedCount} dari ${view.teams.length} tim sudah sah.`}</h1>
        ) : (
          <>
            {view.crisis && <p className="chapter-context">{view.crisis.title}</p>}
            <h1 className="chapter-question">{view.crisis?.question ?? STEP_LABEL.rapat}</h1>
          </>
        )}
        {!options('pemerintah') && <p className="chapter-hint">{hintFor(view)}</p>}
      </div>
      {!pengesahan && <ReadyMeter view={view} />}
      <section className="team-row" aria-label="Tim">
        {view.teams.map(team => {
          const done = team.locked || (!pengesahan && team.ready && !team.offline);
          return (
            <div key={team.role} className={`team-tile role-card${done ? ' done' : ''}${options(team.role) ? ' with-options' : ''}`} {...roleProps(team.role)}>
              <Portrait role={team.role} expression={team.locked ? 'senang' : pengesahan && !team.offline ? 'panik' : 'tenang'} fallback={<RoleMark role={team.role} />} />
              <p className="text-md font-bold">{team.label}</p>
              {options(team.role) && (
                <ol className="tile-options" aria-label={`Pilihan ${team.label}`}>
                  {options(team.role)!.map((name, i) => <li key={name}><span className="slot" aria-hidden="true">{'ABC'[i]}</span>{name}</li>)}
                </ol>
              )}
              {status(team) && <p className="status">{status(team)}</p>}
              {team.locked && <span className="stamp small" aria-label="Sah">SAH</span>}
            </div>
          );
        })}
      </section>
    </>
  );
}

function LobbyTable({ view }: { view: HostView }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="chapter-hero">
        <h1 className="chapter-question">Meja Kesepakatan</h1>
        <p className="chapter-hint">{view.pacts.length ? hintFor(view) : 'Belum ada kesepakatan. Datangi tim lain: siapa butuh apa darimu?'}</p>
      </div>
      <ReadyMeter view={view} />
      <ul className="flex max-w-page flex-col gap-3">
        {view.pacts.map(p => (
          <m.li
            key={p.id}
            className="pact-card"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.slam }}
          >
            <div><RoleName role={p.from} /><p>{p.fromText}</p></div>
            <span className="handshake" aria-label="bersalaman">⇄</span>
            <div><RoleName role={p.to} /><p>{p.toText}</p></div>
          </m.li>
        ))}
      </ul>
    </section>
  );
}

export const REVEAL_LEAD_SECONDS = 3;

/** Counts down whole seconds from `from` to 0, restarting when `key` changes. */
function useCountdown(from: number, key: unknown): number {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    setLeft(from);
    const id = setInterval(() => setLeft(n => (n <= 1 ? (clearInterval(id), 0) : n - 1)), 1000);
    return () => clearInterval(id);
  }, [from, key]);
  return left;
}

/** Teams one by one (biggest impact last), then every change with its cause, then the pacts. */
function RevealStage({ reveal }: { reveal: RevealView }) {
  const total = reveal.teams.length + reveal.groups.length + reveal.pacts.length + 1;
  // A 3-2-1 before the first card; phones count the same lead-in (Phone.tsx REVEAL_LEAD_MS).
  const countdown = useCountdown(REVEAL_LEAD_SECONDS, reveal.year);
  const sequence = useSequence(total, 1500, `${reveal.year}-${countdown === 0}`);
  const shown = countdown > 0 ? 0 : sequence;
  const teamsShown = Math.min(shown, reveal.teams.length);
  const groupsShown = Math.max(0, Math.min(shown - reveal.teams.length, reveal.groups.length));
  const pactsShown = Math.max(0, Math.min(shown - reveal.teams.length - reveal.groups.length, reveal.pacts.length));
  const done = shown >= total;
  // Keyed on the count only: a fresh broadcast of the same reveal must not replay its last sound.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cueBus.emit(revealCue(reveal, shown)); }, [reveal.year, shown]);

  // The board moves one cause at a time; once everything is shown it settles on the engine's numbers.
  const running = { ...reveal.statsBefore };
  const lastChanges: Partial<Record<keyof PublicStats, number>> = {};
  for (const group of reveal.groups.slice(0, groupsShown)) {
    for (const c of group.changes) {
      const stat = c.stat as keyof PublicStats;
      running[stat] = Math.max(0, Math.min(10, running[stat] + c.amount));
    }
  }
  for (const c of reveal.groups[groupsShown - 1]?.changes ?? []) lastChanges[c.stat as keyof PublicStats] = c.amount;
  const board = groupsShown >= reveal.groups.length ? reveal.statsAfter : running;

  const collapsed = done && reveal.collapses.length > 0;
  return (
    <div className={`chapter chapter-pengungkapan${collapsed ? ' shake' : ''}`}>
      {countdown > 0 && (
        <div className="countdown" role="status" aria-live="assertive">
          <m.span key={countdown} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease: EASE.slam }}>{countdown}</m.span>
          <p>Keputusan semua tim dibuka…</p>
        </div>
      )}
      {collapsed && <div className="red-flash" aria-hidden="true" />}
      <section className="reveal">
        <div className="reveal-teams">
          {reveal.teams.map((team, i) => (
            <div key={team.role} className={`reveal-card role-card${i < teamsShown ? ' open' : ''}`} {...roleProps(team.role)}>
              <RoleName role={team.role} />
              {i < teamsShown ? (
                <ul className="list mt-2">
                  {team.lines.map(line => <li key={line} className={line === 'MOGOK' ? 'text-danger' : ''}>{line}</li>)}
                  {team.cancelled && <li className="text-danger">Kartu dibatalkan</li>}
                  {team.source === 'suara' && <li className="text-xs text-muted">Diputuskan suara terbanyak</li>}
                </ul>
              ) : <p className="mt-2 text-muted">Tertutup</p>}
            </div>
          ))}
        </div>
        {groupsShown > 0 && (
          <ol className="causes">
            {reveal.groups.slice(0, groupsShown).map(group => (
              <li key={group.cause}>
                <span className="font-semibold">{group.label}</span>
                <span className="flex flex-wrap gap-2">
                  {group.changes.map(c => (
                    <span key={c.stat} className={`chip-effect ${(c.stat === 'harga' || c.stat === 'keresahan') === c.amount > 0 ? 'bad' : 'good'}`}>
                      {INDICATOR_LABEL[c.stat as keyof typeof INDICATOR_LABEL]} {signed(c.amount)}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
        {pactsShown > 0 && (
          <ul className="flex flex-col gap-3">
            {reveal.pacts.slice(0, pactsShown).map(p => {
              const broken = p.result && (!p.result.keptFrom || !p.result.keptTo);
              return (
                <li key={p.id} className={`pact-card${broken ? ' torn' : ' kept'}`}>
                  <div><RoleName role={p.from} /><p>{p.fromText}</p><p className={p.result?.keptFrom ? 'text-success' : 'text-danger'}>{p.result?.keptFrom ? 'Ditepati +1' : 'Dilanggar −1'}</p></div>
                  <span className="handshake" aria-hidden="true">{broken ? '✕' : '⇄'}</span>
                  <div><RoleName role={p.to} /><p>{p.toText}</p><p className={p.result?.keptTo ? 'text-success' : 'text-danger'}>{p.result?.keptTo ? 'Ditepati +1' : 'Dilanggar −1'}</p></div>
                </li>
              );
            })}
          </ul>
        )}
        {done && reveal.collapses.length > 0 && (
          <div className="collapse-banner" role="alert">
            <p className="kicker">{reveal.collapses.length > 1 ? 'Krisis berlapis' : 'Negara kolaps'}</p>
            {reveal.collapses.map(c => <p key={c} className="collapse-line">{COLLAPSE_LABEL[c]}</p>)}
          </div>
        )}
      </section>
      <aside><Board stats={board} changes={done ? undefined : lastChanges} /></aside>
    </div>
  );
}

export function GuessScreen({ view, now, send }: { view: HostView; now: () => number; send: Send }) {
  const done = view.teams.filter(t => t.finalDone).length;
  return (
    <>
      <TopBar view={view} now={now} send={send} />
      <div className="chapter">
        <div className="chapter-hero">
          <h1 className="chapter-question">Siapa mengejar apa?</h1>
          <p className="chapter-hint">Jubir menebak agenda rahasia tim lain{view.options.oknum ? ' dan menunjuk Oknum' : ''} di HP. Setiap tebakan benar bernilai +1.{view.options.oknum ? ' Oknum terbongkar jika ditunjuk minimal 3 dari 5 tim.' : ''}</p>
        </div>
        <p className="ready-meter" role="status">{done === view.teams.length ? 'Semua tebakan masuk.' : `${done} dari ${view.teams.length} tim sudah menebak`}</p>
        <section className="team-row" aria-label="Tim">
          {view.teams.map(team => (
            <div key={team.role} className={`team-tile role-card${team.finalDone ? ' done' : ''}`} {...roleProps(team.role)}>
              <RoleMark role={team.role} />
              <p className="text-md font-bold">{team.label}</p>
              <p className="status">{team.finalDone ? 'Tebakan terkirim' : team.offline ? 'Lewat konsol fasilitator' : 'Sedang menebak'}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/** Ending, Oknum, scores and titles: the first section of the debrief. */
export function ResultsBody({ view }: { view: HostView }) {
  const results = view.results!;
  const ranked = [...results.teams].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  return (
    <section className="results flex flex-col gap-8">
      {results.ending === 'sejahtera' && <Confetti />}
      <div className={`card ruled ending ${results.ending}`}>
        <p className="kicker">Akhir permainan</p>
        <h1>{ENDING_LABEL[results.ending]}</h1>
        {results.collapses.length ? results.collapses.map(c => <p key={c} className="lead">{COLLAPSE_LABEL[c]}</p>)
          : <p className="lead">Indeks Negara {results.index} dari 10</p>}
        {results.oknum && (
          <p className="text-md">
            Oknum: <RoleName role={results.oknum.role} /> · ditunjuk {results.oknum.votes} tim · {results.oknum.identified ? 'TERBONGKAR' : 'lolos tanpa ketahuan'}
          </p>
        )}
      </div>
      {view.debrief && view.debrief.titles.length > 0 && (
        <ul className="card-grid">
          {view.debrief.titles.map(t => (
            <li key={t.title} className="card ruled strong">
              <p className="kicker">{t.title}</p>
              <p className="text-md"><RoleName role={t.role} /></p>
              <p className="text-xs text-muted">{t.reason}</p>
            </li>
          ))}
        </ul>
      )}
      <ol className="score-race" aria-label="Peringkat akhir">
        {ranked.map((t, i) => (
          <li key={t.role} {...roleProps(t.role)}>
            <span className="race-name"><RoleName role={t.role} /></span>
            <span className="race-track">
              <m.span className="race-bar" initial={{ width: 0 }} animate={{ width: `${top > 0 ? Math.max(4, (t.score / top) * 100) : 4}%` }} transition={{ delay: 0.4 + (ranked.length - i) * 0.35, duration: DUR.slow, ease: EASE.paper }} />
            </span>
            <span className="race-score"><AnimatedNumber value={t.score} /></span>
          </li>
        ))}
      </ol>
      <table className="score-table">
        <thead>
          <tr><th scope="col">Tim</th><th scope="col">Agenda rahasia</th><th scope="col">Tebakan</th><th scope="col">Kesepakatan</th><th scope="col">Skor</th></tr>
        </thead>
        <tbody>
          {ranked.map(t => (
            <tr key={t.role}>
              <th scope="row"><Portrait role={t.role} expression={endExpression(t, results.ending === 'kolaps', top)} className="small" /><RoleName role={t.role} /></th>
              <td><strong>{t.agendaName}</strong> {t.achieved ? '✓' : '✗'}<br /><span className="text-xs text-muted">{t.agendaDescription}</span></td>
              <td>{t.correctGuesses} benar</td>
              <td>{t.pactsKept} ditepati, {t.pactsBroken} dilanggar</td>
              <td className="score">{t.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Indicators year by year: the starting point for the debrief's "what happened?" round. */
export function TimelineTable({ timeline }: { timeline: { year: number; stats: PublicStats }[] }) {
  return (
    <section>
      <table className="data-table">
        <thead>
          <tr><th scope="col">Indikator</th>{timeline.map(t => <th key={t.year} scope="col">{t.year === 0 ? 'Awal' : `Th ${t.year}`}</th>)}</tr>
        </thead>
        <tbody>
          {INDICATOR_ORDER.map(stat => (
            <tr key={stat}>
              <th scope="row">{INDICATOR_LABEL[stat]}</th>
              {timeline.map(t => <td key={t.year}>{t.stats[stat]}</td>)}
            </tr>
          ))}
          <tr><th scope="row">Suku bunga</th>{timeline.map(t => <td key={t.year}>{t.stats.bunga}</td>)}</tr>
        </tbody>
      </table>
    </section>
  );
}

