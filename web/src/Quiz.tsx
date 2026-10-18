import { useState } from 'react';
import type { ClientMessage } from '../../room/src/protocol';
import type { HostView, PlayerView } from '../../room/src/views';
import { Glossed } from './Glossary';

// Pre/post quiz: five questions on each phone, the class result on the main screen.

type Send = (message: ClientMessage) => void;
const DONT_KNOW = -1;

export function QuizForm({ quiz, send }: { quiz: NonNullable<PlayerView['myQuiz']>; send: Send }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const stage = quiz.open!;
  const ready = answers.every(a => a !== null);
  const pick = (i: number, value: number) => setAnswers(answers.map((a, j) => (j === i ? value : a)));

  return (
    <form className="flex flex-col gap-4 quiz" onSubmit={e => { e.preventDefault(); if (ready) send({ t: 'quiz', stage, answers: answers as number[] }); }}>
      <div>
        <p className="kicker">{stage === 'pra' ? 'Kuis awal · sebelum bermain' : 'Kuis akhir · sesudah bermain'}</p>
        <h2 className="question-mini text-lg">{stage === 'pra' ? 'Lima soal singkat' : 'Lima soal yang sama'}</h2>
        <p className="text-muted text-xs">Jawaban pribadi, tidak dinilai. Layar utama hanya menampilkan persentase kelas. Pilih "Tidak tahu" kalau belum yakin.</p>
      </div>
      {quiz.questions.map((q, i) => (
        <fieldset key={q.id} className="choice">
          <legend>{i + 1}. {q.text}</legend>
          {[...q.options.map((text, value) => ({ text, value })), { text: 'Tidak tahu', value: DONT_KNOW }].map(option => (
            <label key={option.value} className={`guess${answers[i] === option.value ? ' on' : ''}${option.value === DONT_KNOW ? ' dont-know' : ''}`}>
              <input type="radio" name={`q-${q.id}`} checked={answers[i] === option.value} onChange={() => pick(i, option.value)} />
              <span>{option.value === DONT_KNOW ? option.text : `${'ABCD'[option.value]}. ${option.text}`}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button className="btn primary" disabled={!ready}>{ready ? 'Kirim jawaban' : `Jawab semua soal (${answers.filter(a => a !== null).length}/${answers.length})`}</button>
    </form>
  );
}

/** The phone after the post quiz: own scores, then the key once the facilitator reveals it. */
export function QuizMine({ quiz }: { quiz: NonNullable<PlayerView['myQuiz']> }) {
  if (!quiz.scores) return <p className="text-muted">Jawabanmu terkirim. Tunggu teman-teman selesai.</p>;
  return (
    <section className="flex flex-col gap-4">
      <p className="kicker">Hasil kuismu</p>
      <p className="big-score">{quiz.scores.pra ?? '–'} → {quiz.scores.pasca} <small>dari 5 benar</small></p>
      {quiz.scores.pra === null && <p className="text-muted text-xs">Kamu tidak ikut kuis awal.</p>}
      {quiz.review ? (
        <ol className="review list flex flex-col gap-3">
          {quiz.review.map((r, i) => (
            <li key={i} className={r.pasca === r.right ? 'ok-item' : 'miss-item'}>
              <p><strong>{r.text}</strong></p>
              <p>Jawaban: {r.correct} {r.pasca === r.right ? '✓' : '✗'}</p>
              <p className="text-muted text-xs"><Glossed text={r.explanation} /></p>
            </li>
          ))}
        </ol>
      ) : <p className="text-muted text-xs">Jawaban yang benar akan dibuka fasilitator di layar utama.</p>}
    </section>
  );
}

export function QuizCount({ view, stage }: { view: HostView; stage: 'pra' | 'pasca' }) {
  if (!view.quiz) return null;
  const done = stage === 'pra' ? view.quiz.praDone : view.quiz.pascaDone;
  return <p className="text-muted">{stage === 'pra' ? 'Kuis awal' : 'Kuis akhir'}: <strong>{done}</strong> dari {view.quiz.eligible} pemain selesai</p>;
}

/**
 * One row per question: share answering right before (ring) and after (dot), on 0–100%.
 * Two marks told apart by shape as well as fill, each value printed beside the row.
 */
export function QuizSection({ view, send }: { view: HostView; send: Send }) {
  const results = view.quiz?.results;
  if (!results) return null;
  const reveal = results.questions.every(q => q.answer);
  return (
    <section className="flex flex-col gap-4 quiz-results">
      <div className="quiz-head flex flex-wrap items-center justify-between gap-2">
        <QuizCount view={view} stage="pasca" />
        <p className="legend flex items-center gap-2 text-muted" aria-hidden="true"><span className="mk pre" /> Sebelum bermain <span className="mk post" /> Sesudah bermain</p>
      </div>
      {results.praMean !== null && results.pascaMean !== null && (
        <p className="text-display-sm">
          Rata-rata jawaban benar: <strong>{results.praMean}%</strong> → <strong>{results.pascaMean}%</strong>
          {results.gain !== null && <span className={results.gain >= 20 ? 'text-success' : 'text-muted'}> ({results.gain >= 0 ? '+' : ''}{results.gain} poin untuk {results.paired} pemain yang ikut keduanya; target +20 poin)</span>}
        </p>
      )}
      <ol className="dumbbells flex flex-col gap-3">
        {results.questions.map((q, i) => (
          <li key={q.id} className="dumbbell">
            <div className="flex items-start gap-3">
              <span className="db-num">{i + 1}</span>
              <div>
                <p className="text-md font-bold">{q.concept}</p>
                {reveal && <p className="text-muted text-xs">{q.text}</p>}
              </div>
            </div>
            <div className="db-track" role="img" aria-label={`${q.concept}: sebelum ${q.praPct ?? 'belum ada'} persen, sesudah ${q.pascaPct ?? 'belum ada'} persen benar`}>
              {q.praPct !== null && q.pascaPct !== null && (
                <span className="db-bar" style={{ left: `${Math.min(q.praPct, q.pascaPct)}%`, width: `${Math.abs(q.pascaPct - q.praPct)}%` }} />
              )}
              {q.praPct !== null && <span className="mk pre" style={{ left: `${q.praPct}%` }} title={`Sebelum: ${q.praPct}%`} />}
              {q.pascaPct !== null && <span className="mk post" style={{ left: `${q.pascaPct}%` }} title={`Sesudah: ${q.pascaPct}%`} />}
            </div>
            <p className="db-values">{q.praPct ?? '–'}% → <strong>{q.pascaPct ?? '–'}%</strong></p>
            {q.answer && (
              <p className="db-answer"><strong>Jawaban: {q.answer.option}.</strong> <Glossed text={q.answer.explanation} /></p>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn primary" onClick={() => send({ t: 'debrief', patch: { quizReveal: !reveal } })}>{reveal ? 'Sembunyikan jawaban' : 'Tampilkan jawaban benar'}</button>
      </div>
    </section>
  );
}
