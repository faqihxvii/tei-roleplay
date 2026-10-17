import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUE_IDS, MOODS, type CueId, type Mood } from '../src/audio/cues';
import { loudness, wav } from './dsp';
import { renderLoop } from './music';
import { renderCue, VARIANTS } from './sfx';

// Renders the temporary synthesized sound (docs/art-audio.md, "Audio sementara") and encodes it
// with ffmpeg to WebM/Opus and MP3, then writes public/audio/manifest.json marked temporary.
// Run with `npm run audio:build` (needs ffmpeg). A sound designer's files replace these by editing
// the manifest; nothing in the game changes.

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');

function encode(wavFile: string, base: string, stereo: boolean): void {
  const common = ['-hide_banner', '-loglevel', 'error', '-y', '-i', wavFile, '-map_metadata', '-1'];
  execFileSync('ffmpeg', [...common, '-c:a', 'libopus', '-b:a', stereo ? '72k' : '40k', '-ac', stereo ? '2' : '1', `${base}.webm`]);
  execFileSync('ffmpeg', [...common, '-c:a', 'libmp3lame', '-q:a', stereo ? '6' : '7', '-ac', stereo ? '2' : '1', `${base}.mp3`]);
}

export function buildAudio(): { sfx: Record<string, string[]>; music: Record<string, string> } {
  const tmp = mkdtempSync(path.join(tmpdir(), 'tei-audio-'));
  mkdirSync(path.join(OUT, 'sfx'), { recursive: true });
  mkdirSync(path.join(OUT, 'music'), { recursive: true });
  const sfx: Record<string, string[]> = {};
  const music: Record<string, string> = {};
  try {
    for (const cue of CUE_IDS) {
      const count = VARIANTS[cue as CueId] ?? 1;
      sfx[cue] = [];
      for (let v = 0; v < count; v++) {
        const name = `${cue.replace('.', '-')}${count > 1 ? `-${v + 1}` : ''}`;
        const file = path.join(tmp, `${name}.wav`);
        // Every effect at the same loudness; the cue's gain in cues.ts sets the mix.
        writeFileSync(file, wav([loudness(renderCue(cue as CueId, v), -18)]));
        encode(file, path.join(OUT, 'sfx', name), false);
        sfx[cue]!.push(`sfx/${name}`);
      }
    }
    for (const mood of Object.keys(MOODS) as Mood[]) {
      const file = path.join(tmp, `${mood}.wav`);
      writeFileSync(file, wav(renderLoop(mood)));
      encode(file, path.join(OUT, 'music', mood), true);
      music[mood] = `music/${mood}`;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { sfx, music };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { sfx, music } = buildAudio();
  const manifest = {
    temporary: true,
    source: 'Sintesis sementara dari web/audio (npm run audio:build). Ganti dengan rekaman sound designer sebelum rilis.',
    format: ['webm', 'mp3'],
    sfx,
    music,
  };
  writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Audio ditulis ke ${OUT}: ${Object.values(sfx).flat().length} efek, ${Object.keys(music).length} loop.`);
}
