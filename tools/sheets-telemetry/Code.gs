// Penerima laporan sesi TEI untuk Google Sheets (room/README.md, "Laporan ke Google Sheets").
// Tempel di Extensions > Apps Script pada spreadsheet laporan, isi Script Property KUNCI, lalu
// Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Alamat web app
// ditambah ?key=<KUNCI> menjadi TELEMETRY_WEBHOOK_URL di server.
//
// Server mengirim sesi yang sama berkali-kali, jadi setiap laporan menimpa baris lamanya
// berdasarkan id. Laporan tidak memuat nama, id pemain, maupun komentar survei.

var HEADERS = {
  Sesi: ['ID', 'Mulai', 'Diperbarui', 'Fase', 'Pemain', 'Tim offline', 'Oknum', 'Latihan dimainkan', 'Kuis', 'Tempo',
    'Tahun terakhir', 'Ending', 'Indeks negara', 'Tim dengan pakta', 'Responden survei', 'Seru', 'Jelas', 'Belajar',
    'Kenaikan kuis (poin)', 'Durasi bermain (menit)', 'Jeda', 'Tambah waktu', 'Lewati', 'Sambung ulang HP',
    'Sambung ulang layar utama', 'Aksi ditolak', 'Error skrip'],
  Waktu: ['ID', 'Fase', 'Tahun', 'Langkah', 'Rencana (detik)', 'Nyata (detik)', 'Jeda (detik)', 'Tambahan (detik)', 'Berakhir karena'],
  Tahun: ['ID', 'Tahun', 'Krisis', 'Judul koran', 'Harga', 'Lapangan kerja', 'Kas', 'Kepercayaan', 'Keresahan', 'Suku bunga',
    'Modal', 'Solidaritas', 'Kredibilitas', 'Tabungan', 'Pakta disepakati'],
  Mentah: ['ID', 'Diperbarui', 'JSON'],
};

var STAT_KEYS = ['harga', 'kerja', 'kas', 'kepercayaan', 'keresahan', 'bunga', 'modal', 'solidaritas', 'kredibilitas', 'tabungan'];
/** Batas isi satu sel di Sheets adalah 50.000 karakter. */
var MAX_CELL = 49000;
var ID_PATTERN = /^[A-Za-z0-9-]{1,80}$/;

function doGet() {
  return text('TEI: penerima laporan siap.');
}

function doPost(e) {
  var expected = PropertiesService.getScriptProperties().getProperty('KUNCI');
  var result = receive(e && e.postData ? e.postData.contents : '', e && e.parameter ? e.parameter.key : '', expected);
  if (result.error) return text(result.error);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    store(SpreadsheetApp.getActiveSpreadsheet(), result.report);
  } finally {
    lock.releaseLock();
  }
  return text('ok');
}

/** Checks the key and the body; returns the report or the reason it was refused. */
function receive(body, key, expected) {
  if (!expected) return { error: 'KUNCI belum diisi di Script Properties.' };
  if (key !== expected) return { error: 'Kunci salah.' };
  var report;
  try {
    report = JSON.parse(body);
  } catch (err) {
    return { error: 'Bukan JSON.' };
  }
  if (!report || typeof report.id !== 'string' || !ID_PATTERN.test(report.id) || typeof report.version !== 'number') {
    return { error: 'Bukan laporan sesi TEI.' };
  }
  return { report: report };
}

function store(ss, report) {
  upsertRow(sheet(ss, 'Sesi'), report.id, sessionRow(report));
  replaceRows(sheet(ss, 'Waktu'), report.id, timingRows(report));
  replaceRows(sheet(ss, 'Tahun'), report.id, yearRows(report));
  upsertRow(sheet(ss, 'Mentah'), report.id, [report.id, date(report.updatedAt), JSON.stringify(report).slice(0, MAX_CELL)]);
}

function sessionRow(r) {
  var timings = r.timings || [];
  var played = 0;
  for (var i = 0; i < timings.length; i++) played += timings[i].actualMs;
  var errors = 0;
  for (var code in r.errors || {}) errors += r.errors[code];
  var scriptErrors = 0;
  for (var j = 0; j < (r.clientErrors || []).length; j++) scriptErrors += r.clientErrors[j].count;
  var survey = r.survey;
  var means = survey ? survey.means : {};
  return [
    r.id,
    date(r.createdAt),
    date(r.updatedAt),
    r.phase,
    r.players,
    (r.offlineRoles || []).length,
    yesNo(r.options && r.options.oknum),
    yesNo(r.practicePlayed),
    yesNo(r.options && r.options.kuis),
    r.tempo,
    r.outcome ? r.outcome.lastYear : '',
    r.outcome ? r.outcome.ending : '',
    r.outcome ? r.outcome.index : '',
    r.measures ? r.measures.teamsWithPact : '',
    survey ? survey.n : '',
    blank(means.seru),
    blank(means.jelas),
    blank(means.belajar),
    blank(r.measures && r.measures.quizGain),
    Math.round(played / 6000) / 10,
    r.controls ? r.controls.pauses : '',
    r.controls ? r.controls.addTimes : '',
    r.controls ? r.controls.skips : '',
    r.connection ? r.connection.reconnects : '',
    r.connection ? r.connection.hostReconnects : '',
    errors,
    scriptErrors,
  ];
}

function timingRows(r) {
  return (r.timings || []).map(function (t) {
    return [r.id, t.phase, t.year, t.step || '', t.plannedMs === null || t.plannedMs === undefined ? '' : seconds(t.plannedMs), seconds(t.actualMs), seconds(t.pausedMs), seconds(t.addedMs), t.endedBy];
  });
}

function yearRows(r) {
  return (r.years || []).map(function (y) {
    var pacts = (r.pacts || []).filter(function (p) { return p.year === y.year && p.status === 'disepakati'; }).length;
    var row = [r.id, y.year, y.crisisId, plain(y.headline)];
    for (var i = 0; i < STAT_KEYS.length; i++) row.push(blank(y.statsAfter[STAT_KEYS[i]]));
    row.push(pacts);
    return row;
  });
}

function sheet(ss, name) {
  var s = ss.getSheetByName(name) || ss.insertSheet(name);
  if (s.getLastRow() === 0) s.appendRow(HEADERS[name]);
  return s;
}

function upsertRow(s, id, row) {
  var at = rowsWithId(s, id);
  if (at.length) s.getRange(at[0], 1, 1, row.length).setValues([row]);
  else s.appendRow(row);
}

function replaceRows(s, id, rows) {
  var at = rowsWithId(s, id);
  // Bottom up, so the row numbers above stay valid.
  for (var i = at.length - 1; i >= 0; i--) s.deleteRow(at[i]);
  if (rows.length) s.getRange(s.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/** 1-based row numbers whose column A holds this id, top to bottom. */
function rowsWithId(s, id) {
  var last = s.getLastRow();
  if (last < 2) return [];
  var ids = s.getRange(2, 1, last - 1, 1).getValues();
  var out = [];
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) out.push(i + 2);
  return out;
}

function date(iso) { return iso ? new Date(iso) : ''; }
function seconds(ms) { return Math.round(ms / 1000); }
function yesNo(v) { return v ? 'Ya' : 'Tidak'; }
function blank(v) { return v === null || v === undefined ? '' : v; }
function text(s) { return ContentService.createTextOutput(s); }
/** Text that Sheets would otherwise read as a formula stays text. */
function plain(s) { return /^[=+\-@]/.test(s || '') ? "'" + s : s || ''; }
