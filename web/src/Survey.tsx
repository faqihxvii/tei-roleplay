import { useState } from 'react';
import type { ClientMessage } from '../../room/src/protocol';
import type { HostView, PlayerView } from '../../room/src/views';

// End-of-session survey (GDD, "Ukuran keberhasilan"): three 1–5 questions and an optional comment
// on each phone; the main screen shows only how many answered.

type Send = (message: ClientMessage) => void;
const COMMENT_MAX = 200;

export function SurveyForm({ survey, send }: { survey: NonNullable<PlayerView['mySurvey']>; send: Send }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const ready = survey.questions.every(q => answers[q.id]);

  return (
    <form
      className="flex flex-col gap-4 survey"
      onSubmit={e => {
        e.preventDefault();
        if (!ready) return;
        send({ t: 'survey', answers: { seru: answers.seru!, jelas: answers.jelas!, belajar: answers.belajar! }, comment: comment.trim() || null });
      }}
    >
      <div>
        <p className="kicker">Penutup · survei singkat</p>
        <h2 className="question-mini text-lg">Bagaimana permainan tadi?</h2>
        <p className="text-muted text-xs">Anonim: nama panggilanmu tidak disimpan bersama jawaban ini.</p>
      </div>
      {survey.questions.map(q => (
        <fieldset key={q.id} className="scale">
          <legend>{q.text}</legend>
          <div className="scale-row" role="radiogroup" aria-label={q.text}>
            {[1, 2, 3, 4, 5].map(n => (
              <label key={n} className={`scale-pick${answers[q.id] === n ? ' on' : ''}`}>
                <input type="radio" name={`s-${q.id}`} value={n} checked={answers[q.id] === n} onChange={() => setAnswers({ ...answers, [q.id]: n })} />
                <span aria-hidden="true">{n}</span>
                <span className="sr-only">{n} dari 5{n === 1 ? `, ${q.low}` : n === 5 ? `, ${q.high}` : ''}</span>
              </label>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-2xs text-muted" aria-hidden="true"><span>{q.low}</span><span>{q.high}</span></div>
        </fieldset>
      ))}
      <label className="field">
        <span>Satu hal yang paling berkesan atau membingungkan <span className="text-muted text-xs">(boleh dikosongkan)</span></span>
        <textarea rows={3} maxLength={COMMENT_MAX} value={comment} onChange={e => setComment(e.target.value)} />
        <small className="text-muted">Jangan tulis nama orang. {comment.length}/{COMMENT_MAX}</small>
      </label>
      <button className="btn primary" disabled={!ready}>{ready ? 'Kirim' : 'Jawab ketiga pertanyaan dulu'}</button>
    </form>
  );
}

export function SurveyThanks() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 text-center flex flex-col gap-4">
      <p className="kicker">Terima kasih</p>
      <h2 className="question-mini text-lg">Jawabanmu terkirim.</h2>
      <p className="text-muted">Sampai jumpa di Harian TEI edisi berikutnya.</p>
    </section>
  );
}

/** Main screen: a thank-you and the count. Scores stay in the console so the room is not swayed. */
export function ClosingSection({ view }: { view: HostView }) {
  const survey = view.survey;
  return (
    <section className="closing">
      <h1>Terima kasih sudah memerintah <span className="accent-serif">negara ini.</span></h1>
      <p className="lead">Isi survei singkat di HP: tiga pertanyaan, kurang dari satu menit, tanpa nama.</p>
      {survey && <p className="count"><strong>{survey.n}</strong> dari {survey.eligible} pemain sudah mengisi</p>}
    </section>
  );
}

/** Console: means, the spread per question, and the comments. */
export function SurveyResults({ view }: { view: HostView }) {
  const survey = view.survey;
  if (!survey) return <p className="text-muted text-xs">Survei terbuka ketika debrief sampai di bagian Penutup.</p>;
  const labels: Record<string, string> = { seru: 'Keseruan', jelas: 'Kejelasan aturan', belajar: 'Membantu memahami' };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-xs">{survey.n} dari {survey.eligible} pemain menjawab. Target GDD: keseruan rata-rata minimal 4.</p>
      <table className="data-table small survey-table">
        <thead><tr><th scope="col">Pertanyaan</th><th scope="col">Rata-rata</th><th scope="col">1</th><th scope="col">2</th><th scope="col">3</th><th scope="col">4</th><th scope="col">5</th></tr></thead>
        <tbody>
          {(Object.keys(survey.means) as (keyof typeof survey.means)[]).map(id => (
            <tr key={id}>
              <th scope="row">{labels[id]}</th>
              <td className={id === 'seru' && survey.means[id] !== null ? (survey.means[id]! >= 4 ? 'text-success' : 'text-danger') : ''}>{survey.means[id] ?? '–'}</td>
              {survey.dist[id].map((count, i) => <td key={i}>{count}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {survey.comments.length > 0 && (
        <details>
          <summary>{survey.comments.length} komentar</summary>
          <ul className="list mt-2 flex flex-col gap-1.5">{survey.comments.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
