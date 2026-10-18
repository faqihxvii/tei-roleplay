import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RoomSnapshot } from './room';

// Snapshots let a room survive a server restart or a refreshed host laptop
// (GDD, "Ketahanan koneksi"). The interface is small so a KV or Durable Object store can replace it.

export interface SnapshotStore {
  save(snapshot: RoomSnapshot): Promise<void>;
  loadAll(): Promise<RoomSnapshot[]>;
  remove(code: string): Promise<void>;
}

export class MemoryStore implements SnapshotStore {
  readonly rooms = new Map<string, RoomSnapshot>();
  async save(snapshot: RoomSnapshot) { this.rooms.set(snapshot.code, structuredClone(snapshot)); }
  async loadAll() { return [...this.rooms.values()].map(s => structuredClone(s)); }
  async remove(code: string) { this.rooms.delete(code); }
}

let writes = 0;

export class FileStore implements SnapshotStore {
  constructor(private readonly dir: string) {}

  async save(snapshot: RoomSnapshot): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const file = this.file(snapshot.code);
    // Write then rename, so a crash mid-write never leaves a half-written snapshot behind. Each write
    // gets its own temp file: two saves of one room can overlap, and a shared name loses the rename.
    const tmp = `${file}.${++writes}.tmp`;
    await writeFile(tmp, JSON.stringify(snapshot));
    await rename(tmp, file);
  }

  async loadAll(): Promise<RoomSnapshot[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const snapshots: RoomSnapshot[] = [];
    for (const name of names.filter(n => /^[A-Z]{4}\.json$/.test(n))) {
      try {
        snapshots.push(JSON.parse(await readFile(path.join(this.dir, name), 'utf8')) as RoomSnapshot);
      } catch {
        // A corrupt snapshot only loses that room; the others still load.
      }
    }
    return snapshots;
  }

  async remove(code: string): Promise<void> {
    await rm(this.file(code), { force: true });
  }

  private file(code: string): string {
    return path.join(this.dir, `${code}.json`);
  }
}
