import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SessionReport } from './report';

// Where session reports go. One file per session, rewritten as the session goes on, so a class that
// stops halfway still leaves its timings behind. On hosts whose disk does not survive a restart
// (Render's free plan), set TELEMETRY_WEBHOOK_URL so each report is also posted somewhere durable.

export class FileReportStore {
  constructor(private dir: string) {}

  async save(report: SessionReport): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const file = path.join(this.dir, `${report.id}.json`);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(report));
    await rename(tmp, file);
  }

  async list(): Promise<SessionReport[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const reports: SessionReport[] = [];
    for (const name of names.filter(n => n.endsWith('.json')).sort()) {
      try {
        reports.push(JSON.parse(await readFile(path.join(this.dir, name), 'utf8')) as SessionReport);
      } catch {
        // a half-written or foreign file: skip it
      }
    }
    return reports;
  }
}

/** Posts a report as JSON. Receivers should upsert by `id`: the same session is sent more than once. */
export async function postReport(url: string, report: SessionReport, timeoutMs = 5000): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
