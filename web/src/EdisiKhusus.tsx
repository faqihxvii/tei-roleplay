import type { HostView } from '../../room/src/views';
import { ResultsBody, TimelineTable } from './MainScreens';
import { RoleName } from './shared';
import { INDICATOR_LABEL, INDICATOR_ORDER } from './text';

// "Edisi Khusus": every front page of the session plus the results, laid out to print or save as
// PDF for the class report (GDD, "Busur cerita lima tahun" and "Ekspor sesi").

export function EdisiKhusus({ view }: { view: HostView }) {
  const history = view.history ?? [];
  if (!view.results) return <main className="host center">Edisi Khusus tersedia setelah permainan selesai.</main>;
  return (
    <main className="edisi">
      <div className="no-print row">
        <button className="btn primary" onClick={() => print()}>Cetak atau simpan PDF</button>
        <span className="muted small">Pilih "Simpan sebagai PDF" di jendela cetak.</span>
      </div>
      <header className="fp-mast edisi-mast">
        <span>Ruangan {view.code}</span>
        <h1>Harian TEI</h1>
        <span>Edisi Khusus {history.length} Tahun</span>
      </header>
      <ResultsBody view={view} />
      <section className="edisi-page">
        <h2>Garis waktu negara</h2>
        <TimelineTable timeline={view.results.timeline} />
      </section>
      {history.map(year => (
        <article key={year.year} className="edisi-page frontpage">
          <header className="fp-mast">
            <span>Edisi Tahun {year.year}</span>
            <h1>Harian TEI</h1>
            <span>Krisis: {year.crisis}</span>
          </header>
          <h2 className="fp-headline">{year.headline}</h2>
          <p className="fp-sub">{year.subheadline}</p>
          <div className="fp-body">
            <section>
              <h3>Keputusan tim</h3>
              <ul className="edisi-decisions">
                {year.decisions.map(d => (
                  <li key={d.role}><RoleName role={d.role} /> {d.lines.join(' · ')}{d.cancelled ? ' (kartu dibatalkan)' : ''}</li>
                ))}
              </ul>
              {year.pacts.length > 0 && (
                <>
                  <h3>Pakta</h3>
                  <ul className="edisi-decisions">
                    {year.pacts.map((p, i) => (
                      <li key={i}>{p.fromText} ({p.keptFrom ? 'ditepati' : 'dilanggar'}) ⇄ {p.toText} ({p.keptTo ? 'ditepati' : 'dilanggar'})</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <section className="fp-voices">
              <h3>Suara Warga</h3>
              {year.voices.map(v => (
                <blockquote key={v.who}><p>“{v.text}”</p><cite>{v.who}</cite></blockquote>
              ))}
            </section>
            <aside>
              <h3>Akhir tahun</h3>
              <table className="edisi-stats">
                <tbody>
                  {INDICATOR_ORDER.map(stat => <tr key={stat}><th scope="row">{INDICATOR_LABEL[stat]}</th><td>{year.stats[stat]}</td></tr>)}
                  <tr><th scope="row">Suku bunga</th><td>{year.stats.bunga}</td></tr>
                </tbody>
              </table>
              <div className="fp-ad"><span className="kicker">Iklan</span><p>{year.ad}</p></div>
            </aside>
          </div>
        </article>
      ))}
    </main>
  );
}
