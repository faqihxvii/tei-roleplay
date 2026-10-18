import { useEffect, useState, type ReactNode } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import type { Role } from '../../engine/src/types';

// Illustration slots (GDD, "Daftar aset vertical slice"). Files and public/art/manifest.json are
// generated from web/art (npm run art:build); a slot whose file is not listed renders its fallback,
// so the typographic layout always stands on its own.
//   { "crisis":  { "c_beras": "crisis/c_beras.svg" },
//     "peran":   { "buruh": { "tenang": "peran/buruh-tenang.svg", "marah": "peran/buruh-marah.svg" } },
//     "diorama": null,     (the city is drawn in the page: Diorama.tsx)
//     "foto":    { "c_beras": { "file": "foto/c_beras.webp", "alt": "…", "credit": "Nama / Unsplash", "source": "https://unsplash.com/photos/…" } } }
// Photos come from web/art/photos.ts (npm run art:photos).

export type Expression = 'tenang' | 'senang' | 'panik' | 'marah';

export interface ArtManifest {
  crisis: Record<string, string>;
  peran: Partial<Record<Role, Partial<Record<Expression, string>>>>;
  diorama: string | null;
  foto: Record<string, { file: string; alt: string; credit: string; source: string }>;
}

const EMPTY: ArtManifest = { crisis: {}, peran: {}, diorama: null, foto: {} };
let loading: Promise<ArtManifest> | null = null;

function loadArt(): Promise<ArtManifest> {
  loading ??= fetch('/art/manifest.json', { cache: 'no-cache' })
    .then(res => (res.ok ? (res.json() as Promise<Partial<ArtManifest>>) : {}))
    .then(m => ({ ...EMPTY, ...m }))
    .catch(() => EMPTY);
  return loading;
}

export function useArt(): ArtManifest {
  const [art, setArt] = useState<ArtManifest>(EMPTY);
  useEffect(() => {
    let live = true;
    void loadArt().then(m => { if (live) setArt(m); });
    return () => { live = false; };
  }, []);
  return art;
}

/** The caricature beside a role, in the mood the game puts them in. Falls back to calm, then to nothing. */
export function Portrait({ role, expression = 'tenang', className = '', fallback = null }: { role: Role; expression?: Expression; className?: string; fallback?: ReactNode }) {
  const art = useArt();
  const set = art.peran[role];
  const file = set?.[expression] ?? set?.tenang;
  if (!file) return <>{fallback}</>;
  return <img className={`portrait ${className}`} src={`/art/${file}`} alt={`Karikatur ${ROLE_LABEL[role]}, ${expression}`} width={160} height={160} loading="lazy" decoding="async" />;
}

/** The crisis card's illustration; decorative, because the title and narrative carry the meaning. */
export function CrisisArt({ id, className = 'crisis-art', caption }: { id: string; className?: string; caption?: string }) {
  const art = useArt();
  const file = art.crisis[id];
  if (!file) return null;
  const img = <img src={`/art/${file}`} alt="" width={480} height={320} decoding="async" />;
  return caption ? <figure className={className}>{img}<figcaption>{caption}</figcaption></figure> : <span className={className}>{img}</span>;
}

/** The Harian TEI front-page photo for a year's crisis, credited; the crisis illustration when there is none. */
export function CrisisPhoto({ id, year }: { id: string; year: number }) {
  const art = useArt();
  const photo = art.foto[id];
  if (!photo) return <CrisisArt id={id} className="fp-photo" caption={`Ilustrasi: krisis tahun ${year}`} />;
  return (
    <figure className="fp-photo">
      <img src={`/art/${photo.file}`} alt={photo.alt} width={960} height={640} decoding="async" />
      <figcaption>Foto: {photo.credit}</figcaption>
    </figure>
  );
}

/**
 * How each team looks on the results screen: panicked when the country collapsed, pleased with the
 * top score, angry when its agenda failed, calm otherwise.
 */
export function endExpression(team: { score: number; achieved: boolean }, collapsed: boolean, topScore: number): Expression {
  if (collapsed) return 'panik';
  if (team.score === topScore) return 'senang';
  if (!team.achieved) return 'marah';
  return 'tenang';
}
