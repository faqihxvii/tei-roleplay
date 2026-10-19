import { ROLE_LABEL } from '../../engine/src/content/roles';
import type { HostView } from '../../room/src/views';
import { INDICATOR_LABEL, INDICATOR_ORDER } from './text';

// Session export for the teacher's report (GDD, "Alat fasilitator": ekspor sesi PDF + CSV).
// Semicolons, because spreadsheet apps in an Indonesian locale expect them; a BOM so Excel reads UTF-8.

const cell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csv = (rows: (string | number)[][]) => '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n');

function download(name: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTimeline(view: HostView): void {
  const timeline = view.results!.timeline;
  const rows: (string | number)[][] = [['Indikator', ...timeline.map(t => (t.year === 0 ? 'Awal' : `Tahun ${t.year}`))]];
  for (const stat of INDICATOR_ORDER) rows.push([INDICATOR_LABEL[stat], ...timeline.map(t => t.stats[stat])]);
  rows.push(['Suku bunga', ...timeline.map(t => t.stats.bunga)]);
  download(`TEI-${view.code}-garis-waktu.csv`, csv(rows));
}

export function exportDecisions(view: HostView): void {
  const rows: (string | number)[][] = [['Tahun', 'Krisis', 'Tim', 'Keputusan', 'Kartu dibatalkan', 'Headline Harian TEI']];
  for (const year of view.history ?? []) {
    for (const d of year.decisions) rows.push([year.year, year.crisis, ROLE_LABEL[d.role], d.lines.join(' · '), d.cancelled ? 'ya' : 'tidak', year.headline]);
  }
  download(`TEI-${view.code}-keputusan.csv`, csv(rows));
}

export function exportPacts(view: HostView): void {
  const rows: (string | number)[][] = [['Tahun', 'Tim A', 'Janji A', 'A menepati', 'Tim B', 'Janji B', 'B menepati']];
  for (const year of view.history ?? []) {
    for (const p of year.pacts) rows.push([year.year, ROLE_LABEL[p.from], p.fromText, p.keptFrom ? 'ya' : 'tidak', ROLE_LABEL[p.to], p.toText, p.keptTo ? 'ya' : 'tidak']);
  }
  download(`TEI-${view.code}-kesepakatan.csv`, csv(rows));
}

export function exportQuiz(view: HostView): void {
  const rows: (string | number)[][] = [['Nama panggilan', 'Tim', 'Skor pra (dari 5)', 'Skor pasca (dari 5)', ...[1, 2, 3, 4, 5].flatMap(n => [`Soal ${n} pra`, `Soal ${n} pasca`])]];
  const show = (a: number | undefined) => (a === undefined ? '' : a === -1 ? 'tidak tahu' : 'ABCD'[a]!);
  for (const r of view.quizRows ?? []) {
    rows.push([
      r.nickname,
      r.role ? ROLE_LABEL[r.role] : '',
      r.praScore ?? '',
      r.pascaScore ?? '',
      ...[0, 1, 2, 3, 4].flatMap(i => [show(r.pra?.[i]), show(r.pasca?.[i])]),
    ]);
  }
  download(`TEI-${view.code}-kuis.csv`, csv(rows));
}

/** Survey answers, one row per player but without nicknames; comments in a separate column. */
export function exportSurvey(view: HostView): void {
  const survey = view.survey!;
  const rows: (string | number)[][] = [['Pertanyaan', 'Rata-rata', 'Skor 1', 'Skor 2', 'Skor 3', 'Skor 4', 'Skor 5']];
  const labels: Record<string, string> = { seru: 'Keseruan', jelas: 'Kejelasan aturan', belajar: 'Membantu memahami' };
  for (const id of Object.keys(survey.means) as (keyof typeof survey.means)[]) rows.push([labels[id]!, survey.means[id] ?? '', ...survey.dist[id]]);
  rows.push([], ['Komentar']);
  for (const comment of survey.comments) rows.push([comment]);
  download(`TEI-${view.code}-survei.csv`, csv(rows));
}

/** The anonymous session report (room/src/report.ts), for the team's playtest analysis. */
export function exportReport(view: HostView): void {
  download(`TEI-${view.code}-laporan-sesi.json`, JSON.stringify(view.report, null, 2), 'application/json');
}
