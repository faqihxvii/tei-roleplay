import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ROLES, type Role } from '../../engine/src/types';
import { sessionReport, type SessionReport } from '../src/report';
import { Room } from '../src/room';

// The Apps Script receiver (tools/sheets-telemetry/Code.gs) runs on Google's servers, so here it runs
// in a VM against a small in-memory stand-in for a spreadsheet, fed real session reports.

const CODE = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'sheets-telemetry', 'Code.gs'), 'utf8');

class FakeSheet {
  rows: unknown[][] = [];
  getLastRow() { return this.rows.length; }
  appendRow(row: unknown[]) { this.rows.push([...row]); }
  deleteRow(n: number) { this.rows.splice(n - 1, 1); }
  getRange(row: number, col: number, nRows: number, nCols: number) {
    return {
      getValues: () => this.rows.slice(row - 1, row - 1 + nRows).map(r => r.slice(col - 1, col - 1 + nCols)),
      setValues: (values: unknown[][]) => {
        assert.equal(values.length, nRows);
        values.forEach((v, i) => { assert.equal(v.length, nCols); this.rows[row - 1 + i] = [...v]; });
      },
    };
  }
}

class FakeSpreadsheet {
  sheets = new Map<string, FakeSheet>();
  getSheetByName(name: string) { return this.sheets.get(name) ?? null; }
  insertSheet(name: string) { const s = new FakeSheet(); this.sheets.set(name, s); return s; }
  tab(name: string) { return this.sheets.get(name)!.rows; }
}

function load() {
  const ss = new FakeSpreadsheet();
  const props: Record<string, string> = { KUNCI: 'rahasia-kelas' };
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: { createTextOutput: (s: string) => ({ text: s }) },
  });
  vm.runInContext(CODE, ctx);
  const post = (report: unknown, key = 'rahasia-kelas'): string =>
    (ctx.doPost({ postData: { contents: typeof report === 'string' ? report : JSON.stringify(report) }, parameter: { key } }) as { text: string }).text;
  return { ss, post, ctx };
}

const T0 = Date.UTC(2026, 9, 17, 2, 0);
let counter = 0;
function finishedRoom(code: string): Room {
  const r = Room.create({ code, hostToken: 'host-token-aaaaaaaaaaaa', seed: 5, options: { oknum: true, kuis: true }, now: T0 });
  ['Budi', 'Siti', 'Andi', 'Rina', 'Joko', 'Maya'].forEach((name, i) => r.join(name, { id: `sr${++counter}xx`, token: `token-sr-${counter}-aaaaaaaaaaaaaa` }, T0 + i));
  r.assign('seimbang', 1, T0);
  r.startBriefing(T0);
  r.begin(false, T0);
  const jubir = (role: Role) => r.spokesperson(role)!.id;
  r.next(T0 + 60_000); r.next(T0 + 120_000); // to lobi
  r.proposePact(jubir('pengusaha'), 'buruh', 'usahaTidakPhk', 'buruhTidakMogok', 'p1', T0);
  r.respondPact(jubir('buruh'), 'p1', true, T0);
  let at = T0 + 180_000;
  while (r.phase === 'tahun') r.next((at += 60_000));
  for (const role of ROLES) r.submitFinal(jubir(role), { agendas: {}, oknum: null }, at);
  r.setDebrief({ section: 'penutup' }, at);
  r.submitSurvey(r.state.players[0]!.id, { seru: 5, jelas: 4, belajar: 3 }, 'Nama Budi disebut', at);
  return r;
}

test('the Sheets receiver writes one row per session and its timings and years, matching the headers', () => {
  const { ss, post, ctx } = load();
  const report = sessionReport(finishedRoom('BKDF'));
  assert.equal(post(report), 'ok');

  const headers = ctx.HEADERS as Record<string, string[]>;
  for (const tab of ['Sesi', 'Waktu', 'Tahun', 'Mentah']) {
    assert.deepEqual(ss.tab(tab)[0], [...headers[tab]!], `${tab} headers`);
    for (const row of ss.tab(tab).slice(1)) assert.equal(row.length, headers[tab]!.length, `${tab} row width`);
  }
  const sesi = Object.fromEntries(headers.Sesi!.map((h, i) => [h, ss.tab('Sesi')[1]![i]]));
  assert.equal(sesi.ID, report.id);
  assert.equal((sesi.Mulai as Date).toISOString(), report.createdAt);
  assert.equal(sesi.Fase, 'selesai');
  assert.equal(sesi.Pemain, 6);
  assert.equal(sesi.Oknum, 'Ya');
  assert.equal(sesi.Ending, report.outcome!.ending);
  assert.equal(sesi['Tim dengan pakta'], 0.4);
  assert.equal(sesi.Seru, 5);
  assert.equal(sesi['Responden survei'], 1);
  assert.equal(sesi['Kenaikan kuis (poin)'], '');
  assert.ok((sesi['Durasi bermain (menit)'] as number) > 0);

  assert.equal(ss.tab('Waktu').length - 1, report.timings.length);
  assert.equal(ss.tab('Tahun').length - 1, report.years.length);
  const firstYear = ss.tab('Tahun')[1]!;
  assert.equal(firstYear[2], report.years[0]!.crisisId);
  assert.equal(firstYear[4], report.years[0]!.statsAfter.harga);
  assert.equal(firstYear.at(-1), 1, 'the pact agreed in year 1');
  assert.ok(!JSON.stringify([...ss.sheets.values()].map(s => s.rows)).includes('Budi'), 'no names reach the sheet');
});

test('a session sent again replaces its rows instead of adding more, and leaves other sessions alone', () => {
  const { ss, post } = load();
  const a = sessionReport(finishedRoom('BKDG'));
  const b = sessionReport(finishedRoom('BKDH'));
  post(a); post(b);
  const before = { waktu: ss.tab('Waktu').length, tahun: ss.tab('Tahun').length };
  const resent: SessionReport = { ...a, updatedAt: new Date(T0 + 3_600_000).toISOString(), timings: a.timings.slice(0, 2) };
  post(resent);
  assert.equal(ss.tab('Sesi').length, 3);
  assert.equal(ss.tab('Mentah').length, 3);
  assert.equal(ss.tab('Tahun').length, before.tahun);
  assert.equal(ss.tab('Waktu').length, before.waktu - (a.timings.length - 2));
  assert.equal((ss.tab('Sesi')[1]![2] as Date).toISOString(), resent.updatedAt);
  assert.equal(ss.tab('Sesi')[2]![0], b.id);
  assert.equal(ss.tab('Waktu').filter(r => r[0] === b.id).length, b.timings.length);
});

test('the Sheets receiver refuses a wrong key, a missing key setting, and bodies that are not reports', () => {
  const { ss, post, ctx } = load();
  const report = sessionReport(finishedRoom('BKDJ'));
  assert.equal(post(report, 'salah'), 'Kunci salah.');
  assert.equal(post('{not json'), 'Bukan JSON.');
  assert.equal(post({ id: 'x;DROP', version: 1 }), 'Bukan laporan sesi TEI.');
  assert.equal(post({ id: 'abc' }), 'Bukan laporan sesi TEI.');
  assert.equal(ss.sheets.size, 0);
  assert.deepEqual({ ...ctx.receive('{}', '', null) }, { error: 'KUNCI belum diisi di Script Properties.' });
});
