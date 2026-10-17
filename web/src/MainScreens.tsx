import type { HostView, PublicStats, RevealView } from '../../room/src/views';
import { Board, RoleMark, RoleName, Timer, useSequence } from './shared';
import { COLLAPSE_LABEL, ENDING_LABEL, INDICATOR_LABEL, INDICATOR_ORDER, signed, STEP_HINT, STEP_LABEL } from './text';

// The projected main screen during the year loop and the end of the game. Text sized to be read
// from the back row; one focus per phase (GDD, "UX/UI").

export function TopBar({ view, now }: { view: HostView; now: () => number }) {
  const title = view.phase === 'tahun' && view.step
    ? <>Tahun {view.year}<span className="muted">/{view.maxYears}</span> · {STEP_LABEL[view.step]}</>
    : view.phase === 'tebak' ? 'Tebak agenda' : 'Hasil akhir';
  const hint = view.phase === 'tahun' && view.step ? STEP_HINT[view.step]
    : view.phase === 'tebak' ? `Juru Bicara menebak agenda tim lain${view.options.oknum ? ' dan menunjuk Oknum' : ''} di HP.` : '';
  return (
    <header className="topbar">
      <div>
        <p className="topbar-title">{title}</p>
        {hint && <p className="topbar-hint">{hint}</p>}
      </div>
      <div className="topbar-right">
        <span className="room-tag">Ruangan {view.code}</span>
        <Timer endsAt={view.phaseEndsAt} pausedMs={view.pausedMs} now={now} big />
      </div>
    </header>
  );
}

export function YearScreen({ view, now }: { view: HostView; now: () => number }) {
  const step = view.step!;
  if (step === 'pengungkapan' && view.reveal) {
    return (
      <>
        <TopBar view={view} now={now} />
        <RevealStage reveal={view.reveal} />
      </>
    );
  }
  return (
    <>
      <TopBar view={view} now={now} />
      <div className="year-grid">
        <div className="year-main">
          {step === 'krisis' && <CrisisStage view={view} />}
          {(step === 'rapat' || step === 'pengesahan') && <TeamsStage view={view} />}
          {step === 'lobi' && <LobbyTable view={view} />}

          {step === 'koran' && <FrontPageStage view={view} />}
        </div>
        {step !== 'koran' && view.stats && (
          <aside className="year-side">
            <Board stats={view.stats} />
          </aside>
        )}
      </div>
    </>
  );
}

function CrisisStage({ view }: { view: HostView }) {
  const crisis = view.crisis;
  if (!crisis) return null;
  return (
    <article className="crisis-card">
      {view.pemilu && view.stats && (
        <p className="survey">Tahun pemilu. Hasil survei Kepercayaan Publik: <strong>{view.stats.kepercayaan}</strong> dari 10.</p>
      )}
      <p className="kicker">Krisis tahun {view.year} · {crisis.category}</p>
      <h1 className="crisis-title">{crisis.title}</h1>
      <div className="crisis-effects">
        {crisis.opening.map(o => (
          <span key={o.stat} className={`chip-effect ${(o.stat === 'harga' || o.stat === 'keresahan') === o.amount > 0 ? 'bad' : 'good'}`}>
            {INDICATOR_LABEL[o.stat as keyof typeof INDICATOR_LABEL]} {signed(o.amount)}
          </span>
        ))}
      </div>
      <p className="crisis-rule"><span className="kicker">Aturan tahun ini</span><br />{crisis.ruleText}</p>
      {view.year >= 3 && <p className="muted">Mulai tahun 3, krisis menghantam dua kali lebih keras.</p>}
    </article>
  );
}

function TeamsStage({ view }: { view: HostView }) {
  const pengesahan = view.step === 'pengesahan';
  return (
    <section className="team-status">
      {view.teams.map(team => (
        <div key={team.role} className={`status-card${team.locked ? ' locked' : ''}`}>
          <RoleMark role={team.role} />
          <div>
            <p className="status-name">{team.label}</p>
            <p className="muted">
              {team.offline ? 'Diputuskan fasilitator' : pengesahan ? (team.locked ? 'Sudah sah' : 'Menunggu Juru Bicara') : `${team.proposers} dari ${team.members} sudah memilih`}
            </p>
          </div>
          {team.locked && <span className="stamp small" aria-label="Sah">SAH</span>}
        </div>
      ))}
    </section>
  );
}

function LobbyTable({ view }: { view: HostView }) {
  return (
    <section className="lobby-table">
      <h2>Meja Lobi</h2>
      {!view.pacts.length && <p className="lead muted">Belum ada pakta. Datangi tim lain: siapa butuh apa darimu?</p>}
      <ul className="pact-cards">
        {view.pacts.map(p => (
          <li key={p.id} className="pact-card">
            <div><RoleName role={p.from} /><p>{p.fromText}</p></div>
            <span className="handshake" aria-label="bersalaman">⇄</span>
            <div><RoleName role={p.to} /><p>{p.toText}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Teams one by one (biggest impact last), then every change with its cause, then the pacts. */
function RevealStage({ reveal }: { reveal: RevealView }) {
  const total = reveal.teams.length + reveal.groups.length + reveal.pacts.length + 1;
  const shown = useSequence(total, 1500, reveal.year);
  const teamsShown = Math.min(shown, reveal.teams.length);
  const groupsShown = Math.max(0, Math.min(shown - reveal.teams.length, reveal.groups.length));
  const pactsShown = Math.max(0, Math.min(shown - reveal.teams.length - reveal.groups.length, reveal.pacts.length));
  const done = shown >= total;

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

  return (
    <div className="year-grid">
      <section className="reveal">
        <div className="reveal-teams">
          {reveal.teams.map((team, i) => (
            <div key={team.role} className={`reveal-card${i < teamsShown ? ' open' : ''}`}>
              <RoleName role={team.role} />
              {i < teamsShown ? (
                <ul>
                  {team.lines.map(line => <li key={line} className={line === 'MOGOK' ? 'warn' : ''}>{line}</li>)}
                  {team.cancelled && <li className="warn">Kartu dibatalkan</li>}
                  {team.source === 'suara' && <li className="muted small">Diputuskan suara terbanyak</li>}
                </ul>
              ) : <p className="muted">Tertutup</p>}
            </div>
          ))}
        </div>
        {groupsShown > 0 && (
          <ol className="causes">
            {reveal.groups.slice(0, groupsShown).map(group => (
              <li key={group.cause}>
                <span className="cause-changes">
                  {group.changes.map(c => (
                    <span key={c.stat} className={`chip-effect ${(c.stat === 'harga' || c.stat === 'keresahan') === c.amount > 0 ? 'bad' : 'good'}`}>
                      {INDICATOR_LABEL[c.stat as keyof typeof INDICATOR_LABEL]} {signed(c.amount)}
                    </span>
                  ))}
                </span>
                <span className="cause-label">{group.label}</span>
              </li>
            ))}
          </ol>
        )}
        {pactsShown > 0 && (
          <ul className="pact-cards">
            {reveal.pacts.slice(0, pactsShown).map(p => {
              const broken = p.result && (!p.result.keptFrom || !p.result.keptTo);
              return (
                <li key={p.id} className={`pact-card${broken ? ' torn' : ' kept'}`}>
                  <div><RoleName role={p.from} /><p>{p.fromText}</p><p className={p.result?.keptFrom ? 'ok' : 'warn'}>{p.result?.keptFrom ? 'Ditepati +1' : 'Dilanggar −1'}</p></div>
                  <span className="handshake" aria-hidden="true">{broken ? '✕' : '⇄'}</span>
                  <div><RoleName role={p.to} /><p>{p.toText}</p><p className={p.result?.keptTo ? 'ok' : 'warn'}>{p.result?.keptTo ? 'Ditepati +1' : 'Dilanggar −1'}</p></div>
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
      <aside className="year-side"><Board stats={board} changes={done ? undefined : lastChanges} /></aside>
    </div>
  );
}

function FrontPageStage({ view }: { view: HostView }) {
  const page = view.frontPage;
  if (!page) return null;
  return (
    <article className="frontpage">
      <header className="fp-mast">
        <span>Edisi Tahun {page.year}</span>
        <h1>Harian TEI</h1>
        <span>Satu-satunya koran yang membaca keputusan Anda</span>
      </header>
      <h2 className="fp-headline">{page.headline}</h2>
      <p className="fp-sub">{page.subheadline}</p>
      <div className="fp-body">
        <section className="fp-chart" aria-label="Indikator tahun ini">
          <h3>Angka tahun ini</h3>
          <table>
            <tbody>
              {page.indicators.map(i => (
                <tr key={i.stat}>
                  <th scope="row">{INDICATOR_LABEL[i.stat]}</th>
                  <td>{i.from} → <strong>{i.to}</strong></td>
                  <td className={i.to === i.from ? 'muted' : (i.stat === 'harga' || i.stat === 'keresahan') === i.to > i.from ? 'warn' : 'ok'}>{i.to === i.from ? '=' : signed(i.to - i.from)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="fp-voices">
          <h3>Suara Warga</h3>
          {page.voices.map(v => (
            <blockquote key={v.who}>
              <p>“{v.text}”</p>
              <cite>{v.who}</cite>
            </blockquote>
          ))}
        </section>
        <aside className="fp-ad"><span className="kicker">Iklan</span><p>{page.ad}</p></aside>
      </div>
    </article>
  );
}

export function GuessScreen({ view, now }: { view: HostView; now: () => number }) {
  return (
    <>
      <TopBar view={view} now={now} />
      <section className="team-status">
        {view.teams.map(team => (
          <div key={team.role} className={`status-card${team.finalDone ? ' locked' : ''}`}>
            <RoleMark role={team.role} />
            <div>
              <p className="status-name">{team.label}</p>
              <p className="muted">{team.finalDone ? 'Tebakan terkirim' : team.offline ? 'Lewat konsol fasilitator' : 'Sedang menebak'}</p>
            </div>
          </div>
        ))}
      </section>
      <p className="lead center">Setiap tebakan agenda yang benar bernilai +1.{view.options.oknum ? ' Oknum terbongkar jika ditunjuk minimal 3 dari 5 tim.' : ''}</p>
    </>
  );
}

export function ResultsScreen({ view, now }: { view: HostView; now: () => number }) {
  const results = view.results!;
  const ranked = [...results.teams].sort((a, b) => b.score - a.score);
  return (
    <>
      <TopBar view={view} now={now} />
      <section className="results">
        <div className={`ending ${results.ending}`}>
          <p className="kicker">Akhir permainan</p>
          <h1>{ENDING_LABEL[results.ending]}</h1>
          {results.collapses.length ? results.collapses.map(c => <p key={c} className="lead">{COLLAPSE_LABEL[c]}</p>)
            : <p className="lead">Indeks Negara {results.index} dari 10</p>}
          {results.oknum && (
            <p className="oknum-line">
              Oknum: <RoleName role={results.oknum.role} /> · ditunjuk {results.oknum.votes} tim · {results.oknum.identified ? 'TERBONGKAR' : 'lolos tanpa ketahuan'}
            </p>
          )}
        </div>
        <table className="score-table">
          <thead>
            <tr><th scope="col">Tim</th><th scope="col">Agenda rahasia</th><th scope="col">Tebakan</th><th scope="col">Pakta</th><th scope="col">Skor</th></tr>
          </thead>
          <tbody>
            {ranked.map(t => (
              <tr key={t.role}>
                <th scope="row"><RoleName role={t.role} /></th>
                <td><strong>{t.agendaName}</strong> {t.achieved ? '✓' : '✗'}<br /><span className="muted small">{t.agendaDescription}</span></td>
                <td>{t.correctGuesses} benar</td>
                <td>{t.pactsKept} ditepati, {t.pactsBroken} dilanggar</td>
                <td className="score">{t.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Timeline timeline={results.timeline} />
        <section className="headlines">
          <h2>Harian TEI, tahun demi tahun</h2>
          <ol>{results.headlines.map(h => <li key={h.year}><span className="muted">Tahun {h.year}.</span> {h.headline}</li>)}</ol>
        </section>
      </section>
    </>
  );
}

/** Indicators year by year: the starting point for the debrief's "what happened?" round. */
function Timeline({ timeline }: { timeline: { year: number; stats: PublicStats }[] }) {
  return (
    <section className="timeline">
      <h2>Garis waktu negara</h2>
      <table>
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

