import { useEffect } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES } from '../../engine/src/types';
import type { DebriefSection } from '../../room/src/debrief';
import type { ClientMessage } from '../../room/src/protocol';
import type { HostView } from '../../room/src/views';
import { exportDecisions, exportPacts, exportQuiz, exportTimeline } from './exports';
import { QuizSection } from './Quiz';
import { ResultsBody, TimelineTable } from './MainScreens';
import { RoleName, roleProps } from './shared';
import { INDICATOR_LABEL, INDICATOR_ORDER, signed } from './text';
import { TimelineChart } from './TimelineChart';

// Guided debrief on the main screen (GDD, "Mode debrief di layar utama"). The facilitator steps
// through six sections; phones follow along with their own prompts.

type Send = (message: ClientMessage) => void;

export const SECTION_LABEL: Record<DebriefSection, string> = {
  hasil: 'Hasil',
  garisWaktu: 'Garis waktu',
  sebab: 'Sebab-akibat',
  agenda: 'Buka agenda',
  diskusi: 'Diskusi',
  duniaNyata: 'Di Dunia Nyata',
  kuis: 'Kuis akhir',
};
const ALL: DebriefSection[] = ['hasil', 'garisWaktu', 'sebab', 'agenda', 'diskusi', 'duniaNyata', 'kuis'];

const bad = (stat: string, amount: number) => ((stat === 'harga' || stat === 'keresahan') ? amount > 0 : amount < 0);

export function DebriefScreen({ view, send, consoleOpen }: { view: HostView; send: Send; consoleOpen: boolean }) {
  const d = view.debrief!;
  const go = (section: DebriefSection) => send({ t: 'debrief', patch: { section } });
  const ORDER = view.quiz ? ALL : ALL.filter(s => s !== 'kuis');
  const index = ORDER.indexOf(d.section);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (consoleOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight' && index < ORDER.length - 1) go(ORDER[index + 1]!);
      if (e.key === 'ArrowLeft' && index > 0) go(ORDER[index - 1]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <header className="topbar">
        <div>
          <p className="topbar-title">Debrief · {SECTION_LABEL[d.section]}</p>
          <p className="topbar-hint">{HINT[d.section]}</p>
        </div>
        <span className="room-tag">Ruangan {view.code}</span>
      </header>
      <div className="debrief-body">
        {d.section === 'hasil' && <ResultsBody view={view} />}
        {d.section === 'garisWaktu' && <TimelineSection view={view} send={send} />}
        {d.section === 'sebab' && <ChainSection view={view} send={send} />}
        {d.section === 'agenda' && <AgendaSection view={view} send={send} />}
        {d.section === 'diskusi' && <DiscussionSection view={view} send={send} />}
        {d.section === 'duniaNyata' && <RealWorldSection view={view} />}
        {d.section === 'kuis' && <QuizSection view={view} send={send} />}
      </div>
      <nav className="debrief-nav" aria-label="Bagian debrief">
        <button className="btn" disabled={index === 0} onClick={() => go(ORDER[index - 1]!)} aria-label="Bagian sebelumnya">←</button>
        {ORDER.map(section => (
          <button key={section} className={`step-pill${section === d.section ? ' on' : ''}`} aria-current={section === d.section ? 'step' : undefined} onClick={() => go(section)}>
            {SECTION_LABEL[section]}
          </button>
        ))}
        <button className="btn" disabled={index === ORDER.length - 1} onClick={() => go(ORDER[index + 1]!)} aria-label="Bagian berikutnya">→</button>
      </nav>
    </>
  );
}

const HINT: Record<DebriefSection, string> = {
  hasil: 'Siapa mencapai apa, dan bagaimana nasib negara.',
  garisWaktu: 'Lima indikator selama permainan. Ketuk titik untuk menelusuri penyebabnya.',
  sebab: 'Keputusan siapa yang menggerakkan angka ini?',
  agenda: 'Agenda rahasia dibuka satu per satu, dibandingkan dengan tebakan tim lain.',
  diskusi: 'Apa yang terjadi? Mengapa? Di mana ini terjadi di dunia nyata?',
  duniaNyata: 'Krisis di permainan ini pernah terjadi sungguhan.',
  kuis: 'Lima soal yang sama seperti sebelum bermain. Jawab di HP.',
};

function TimelineSection({ view, send }: { view: HostView; send: Send }) {
  const d = view.debrief!;
  const timeline = view.results!.timeline;
  const years = [...new Set(d.markers.map(m => m.year))];
  return (
    <section className="stack">
      <TimelineChart
        timeline={timeline}
        focus={d.focus}
        onPick={(stat, year) => send({ t: 'debrief', patch: { section: 'sebab', focus: { stat, year } } })}
      />
      <p className="muted small">Arsiran = zona bahaya. Garis tiap panel memakai skala 0–10 yang sama.</p>
      {years.length > 0 && (
        <ol className="markers">
          {years.map(year => (
            <li key={year}><strong>Tahun {year}</strong> {d.markers.filter(m => m.year === year).map(m => m.text).join(' · ')}</li>
          ))}
        </ol>
      )}
      <details>
        <summary>Lihat sebagai tabel</summary>
        <TimelineTable timeline={timeline} />
      </details>
    </section>
  );
}

function ChainSection({ view, send }: { view: HostView; send: Send }) {
  const d = view.debrief!;
  const chain = d.chain;
  const years = view.results!.timeline.filter(t => t.year > 0).map(t => t.year);
  const pick = (stat: typeof INDICATOR_ORDER[number], year: number) => send({ t: 'debrief', patch: { focus: { stat, year } } });
  return (
    <div className="chain-grid">
      <aside className="stack">
        <h2 className="label">Titik balik</h2>
        <ul className="turning">
          {d.turningPoints.map(p => (
            <li key={`${p.stat}-${p.year}`}>
              <button className={`turn${chain?.stat === p.stat && chain.year === p.year ? ' on' : ''}`} onClick={() => pick(p.stat, p.year)}>{p.label}</button>
            </li>
          ))}
        </ul>
        {chain && (
          <div className="row">
            <label className="field compact">
              <span>Indikator</span>
              <select value={chain.stat} onChange={e => pick(e.target.value as typeof chain.stat, chain.year)}>
                {INDICATOR_ORDER.map(s => <option key={s} value={s}>{INDICATOR_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="field compact">
              <span>Tahun</span>
              <select value={chain.year} onChange={e => pick(chain.stat, Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>Tahun {y}</option>)}
              </select>
            </label>
          </div>
        )}
      </aside>
      {chain ? (
        <section className="chain">
          <h2 className="chain-title">{INDICATOR_LABEL[chain.stat]} tahun {chain.year}: {chain.from} → <strong>{chain.to}</strong></h2>
          {!chain.links.length && <p className="lead muted">Tidak ada yang menggerakkan indikator ini tahun itu.</p>}
          <ol className="links">
            {chain.links.map((link, i) => (
              <li key={i} className="link">
                <span className={`chip-effect ${bad(chain.stat, link.amount) ? 'bad' : 'good'}`}>{signed(link.amount)}</span>
                <div>
                  <p className="link-label">{link.role && <RoleName role={link.role} />} {link.label}</p>
                  {link.origin && <p className="muted">Berasal dari tahun {link.origin.year}: {link.origin.label}</p>}
                  {link.note && <p className="muted small">{link.note}</p>}
                </div>
              </li>
            ))}
          </ol>
          {chain.clamped && <p className="muted small">Sebagian perubahan tertahan batas 0–10, jadi jumlahnya tidak sama persis dengan selisih angka.</p>}
        </section>
      ) : <p className="lead">Pilih titik balik di kiri.</p>}
    </div>
  );
}

function AgendaSection({ view, send }: { view: HostView; send: Send }) {
  const d = view.debrief!;
  return (
    <section className="stack">
      <div className="agenda-reveal">
        {d.agendas.map((a, i) => (
          <article key={a.role} className={`agenda-card${i < d.agendaShown ? ' open' : ''}`} {...roleProps(a.role)}>
            <RoleName role={a.role} />
            {i < d.agendaShown ? (
              <>
                <h3>{a.agendaName} <span className={a.achieved ? 'ok' : 'warn'}>{a.achieved ? '✓ tercapai' : '✗ gagal'}</span></h3>
                <p className="muted small">{a.agendaDescription}</p>
                <ul className="guesses">
                  {a.guesses.map(g => (
                    <li key={g.by} className={g.correct ? 'ok' : ''}>
                      {ROLE_LABEL[g.by]}: {g.guess ?? 'tidak menebak'} {g.guess ? (g.correct ? '✓' : '✗') : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="muted">Tertutup</p>}
          </article>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" disabled={d.agendaShown >= ROLES.length} onClick={() => send({ t: 'debrief', patch: { agendaShown: d.agendaShown + 1 } })}>Buka agenda berikutnya</button>
        <button className="btn" disabled={d.agendaShown >= ROLES.length} onClick={() => send({ t: 'debrief', patch: { agendaShown: ROLES.length } })}>Buka semua</button>
      </div>
    </section>
  );
}

function DiscussionSection({ view, send }: { view: HostView; send: Send }) {
  const d = view.debrief!;
  const round = d.rounds[d.round]!;
  return (
    <section className="discussion">
      <div className="rounds" role="tablist">
        {d.rounds.map((r, i) => (
          <button key={r.title} role="tab" aria-selected={i === d.round} className={`step-pill${i === d.round ? ' on' : ''}`} onClick={() => send({ t: 'debrief', patch: { round: i } })}>
            {i + 1}. {r.title}
          </button>
        ))}
      </div>
      <h1 className="question">{round.title}</h1>
      <ol className="prompts">{round.prompts.map(p => <li key={p}>{p}</li>)}</ol>
      <p className="muted">Setiap tim juga mendapat satu pertanyaan refleksi di HP-nya.</p>
    </section>
  );
}

function RealWorldSection({ view }: { view: HostView }) {
  const note = view.debrief!.realWorld;
  if (!note) return <p className="lead">Belum ada kartu Di Dunia Nyata untuk krisis sesi ini.</p>;
  return (
    <article className="real-world">
      <p className="kicker">Di permainan: tahun {note.year}, “{note.crisisTitle}”</p>
      <h1>{note.title}</h1>
      <p className="real-text">{note.text}</p>
      <p className="source">Sumber: {note.source}{note.when ? `, ${note.when}` : ''}<br /><span className="url">{note.url}</span></p>
    </article>
  );
}

export function ExportPanel({ view }: { view: HostView }) {
  return (
    <section className="stack">
      <h3 className="label">Ekspor sesi</h3>
      <div className="row">
        <button className="btn" onClick={() => exportTimeline(view)}>Garis waktu (CSV)</button>
        <button className="btn" onClick={() => exportDecisions(view)}>Keputusan per tim (CSV)</button>
        <button className="btn" onClick={() => exportPacts(view)}>Log pakta (CSV)</button>
        {view.quizRows && <button className="btn" onClick={() => exportQuiz(view)}>Kuis pra/pasca (CSV)</button>}
      </div>
      <a className="btn primary" href={`/host?r=${view.code}&cetak=edisi`} target="_blank" rel="noopener">Edisi Khusus (cetak atau simpan PDF)</a>
    </section>
  );
}
